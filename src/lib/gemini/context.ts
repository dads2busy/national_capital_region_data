'use client'

import type { GeminiContext, LevelSummary } from './types'
import type { DataLookup, MeasureInfo, MeasureInfoMap, Datapackage, CorrelationMatrix } from '@/lib/data/types'
import { getRegionValues, computeSummary, getValueAtTime } from '@/lib/data/aggregation'

function buildLevelSummary(
  dataset: DataLookup,
  variableName: string,
  timeOffset: number,
  level: string,
  regionNameMap: Record<string, string>
): LevelSummary | null {
  const summary = computeSummary(dataset, variableName, timeOffset)
  if (!summary) return null

  const regionValues = getRegionValues(dataset, variableName, timeOffset)
  const sorted = [...regionValues.entries()].sort((a, b) => b[1] - a[1])
  const resolve = (id: string) => regionNameMap[id] || id
  const topRegions = sorted.slice(0, 5).map(([id, value]) => ({ id: resolve(id), value }))
  const bottomRegions = sorted
    .slice(-5)
    .reverse()
    .map(([id, value]) => ({ id: resolve(id), value }))

  return {
    level,
    n: summary.n,
    min: summary.min,
    max: summary.max,
    mean: summary.mean,
    median: summary.median,
    q1: summary.q1,
    q3: summary.q3,
    topRegions,
    bottomRegions,
  }
}

function buildVariableDirectory(measureInfoMap: MeasureInfoMap, datapackage: Datapackage | null): string {
  type VarStats = { mean?: number; sd?: number; min?: number; max?: number }
  const levelStats = new Map<string, Map<string, VarStats>>()
  const levelNames = ['county', 'tract', 'block_group'] as const

  if (datapackage) {
    for (const levelName of levelNames) {
      const resource = datapackage.resources.find((r) => r.name === levelName)
      if (!resource) continue
      const varMap = new Map<string, VarStats>()
      for (const field of resource.schema.fields) {
        if (field.name === 'time' || field.time_range[0] === -1) continue
        varMap.set(field.name, { mean: field.mean, sd: field.sd, min: field.min, max: field.max })
      }
      levelStats.set(levelName, varMap)
    }
  }

  const formatStats = (s: VarStats): string => {
    const parts: string[] = []
    if (s.mean !== undefined) parts.push(`μ=${s.mean.toFixed(2)}`)
    if (s.sd !== undefined) parts.push(`σ=${s.sd.toFixed(2)}`)
    if (s.min !== undefined) parts.push(`min=${s.min.toFixed(2)}`)
    if (s.max !== undefined) parts.push(`max=${s.max.toFixed(2)}`)
    return parts.join(', ')
  }

  const lines: string[] = []
  for (const [key, val] of Object.entries(measureInfoMap)) {
    if (key.startsWith('_') || key.includes('{') || key.endsWith('_geo10')) continue
    if (!val || typeof val !== 'object' || !('short_name' in val)) continue
    const info = val as MeasureInfo
    const cat = info.category || ''
    const name = info.short_name || key
    const desc = (info.short_description || '').slice(0, 100)
    let line = `${key} [${cat}]: ${name} — ${desc}`

    const statsParts: string[] = []
    for (const levelName of levelNames) {
      const varMap = levelStats.get(levelName)
      const stats = varMap?.get(key)
      if (stats && stats.mean !== undefined) {
        statsParts.push(`${levelName[0].toUpperCase()}: ${formatStats(stats)}`)
      }
    }
    if (statsParts.length > 0) line += ` | ${statsParts.join(' | ')}`

    lines.push(line)
  }
  return lines.join('\n')
}

/** Build a CSV of specific variables at a given geographic level */
function buildFocusedCsv(
  dataset: DataLookup | null,
  variableNames: string[],
  regionNameMap: Record<string, string>
): string {
  if (!dataset || variableNames.length === 0) return ''

  const meta = dataset._meta
  const varEntries = variableNames
    .map((name) => [name, meta.variables[name]] as const)
    .filter(([, v]) => v && v.time_range[0] !== -1)
  if (varEntries.length === 0) return ''

  const regionIds = Object.keys(dataset).filter((k) => k !== '_meta')
  const header = ['region', ...varEntries.map(([name]) => name)]
  const lines = [header.join(',')]

  for (const rid of regionIds) {
    const rd = dataset[rid] as Record<string, number | string | (number | string)[]>
    const name = regionNameMap[rid] || rid
    const vals: string[] = [name]
    for (const [, vinfo] of varEntries) {
      const { code, time_range: [rangeStart, rangeEnd] } = vinfo
      let valStr = ''
      for (let ti = Math.min(rangeEnd, meta.time.value.length - 1); ti >= rangeStart; ti--) {
        const v = getValueAtTime(rd, code, ti, rangeStart)
        if (v !== null) {
          valStr = v.toFixed(2)
          break
        }
      }
      vals.push(valStr)
    }
    lines.push(vals.join(','))
  }

  return lines.join('\n')
}

/**
 * Extract all correlations involving a variable from a level's correlation map.
 * Returns pairs sorted by |r| descending.
 */
function extractCorrelations(
  levelCorr: Record<string, number>,
  varName: string
): { otherVar: string; r: number }[] {
  const pairs: { otherVar: string; r: number }[] = []
  for (const [pairKey, r] of Object.entries(levelCorr)) {
    const [a, b] = pairKey.split('|')
    if (a === varName) pairs.push({ otherVar: b, r })
    else if (b === varName) pairs.push({ otherVar: a, r })
  }
  pairs.sort((a, b) => Math.abs(b.r) - Math.abs(a.r))
  return pairs
}

/**
 * Build a correlation summary for the selected variable and any detected focus variables.
 *
 * - Selected variable: ALL correlations (so the LLM can look up any variable pair)
 * - Focus variables (detected via Jaro-Winkler): top 15 correlations as supplement
 */
function buildCorrelationSummary(
  correlations: CorrelationMatrix,
  variableName: string,
  focusVariables: string[],
  measureInfoMap: MeasureInfoMap
): string {
  if (!correlations || Object.keys(correlations).length === 0) return ''

  const resolveName = (key: string): string => {
    const info = measureInfoMap[key]
    if (info && typeof info === 'object' && 'short_name' in info) {
      return (info as MeasureInfo).short_name || key
    }
    return key
  }

  const sections: string[] = []

  for (const level of ['county', 'tract', 'block_group'] as const) {
    const levelCorr = correlations[level]
    if (!levelCorr) continue

    const levelLines: string[] = []

    // Selected variable: send ALL correlations so the LLM can answer any pairing question
    const selectedPairs = extractCorrelations(levelCorr, variableName)
    if (selectedPairs.length > 0) {
      levelLines.push(`  ${resolveName(variableName)} (${variableName}) — all correlations:`)
      for (const { otherVar, r } of selectedPairs) {
        levelLines.push(`    r=${r.toFixed(3)} ${resolveName(otherVar)} (${otherVar})`)
      }
    }

    // Focus variables (from detection): top 15 each, skip the selected variable
    const extraVars = focusVariables.filter((v) => v !== variableName)
    for (const fv of extraVars) {
      const fvPairs = extractCorrelations(levelCorr, fv).slice(0, 15)
      if (fvPairs.length === 0) continue
      levelLines.push(`  ${resolveName(fv)} (${fv}) — top correlations:`)
      for (const { otherVar, r } of fvPairs) {
        levelLines.push(`    r=${r.toFixed(3)} ${resolveName(otherVar)} (${otherVar})`)
      }
    }

    if (levelLines.length > 0) {
      sections.push(`${level.charAt(0).toUpperCase() + level.slice(1)} level:\n${levelLines.join('\n')}`)
    }
  }

  return sections.join('\n\n')
}

/** Strip parenthetical suffixes like "(2020 geographies)" or "(Mb/s)" from a name */
function stripParenthetical(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*/g, ' ').trim()
}

/** Tokenize a string into words >= 4 chars, excluding stop words, stripping punctuation */
function significantWords(text: string): string[] {
  const stops = new Set(['with', 'that', 'this', 'from', 'have', 'been', 'their', 'about', 'which', 'when', 'what', 'there', 'some', 'other', 'than', 'into', 'over', 'also', 'between'])
  return text.replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter((w) => w.length >= 4 && !stops.has(w))
}

/** Jaro similarity between two strings */
function jaro(s1: string, s2: string): number {
  if (s1 === s2) return 1
  const len1 = s1.length
  const len2 = s2.length
  if (len1 === 0 || len2 === 0) return 0

  const matchDist = Math.max(Math.floor(Math.max(len1, len2) / 2) - 1, 0)
  const s1Matches = new Array(len1).fill(false)
  const s2Matches = new Array(len2).fill(false)

  let matches = 0
  let transpositions = 0

  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDist)
    const end = Math.min(i + matchDist + 1, len2)
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue
      s1Matches[i] = true
      s2Matches[j] = true
      matches++
      break
    }
  }

  if (matches === 0) return 0

  let k = 0
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue
    while (!s2Matches[k]) k++
    if (s1[i] !== s2[k]) transpositions++
    k++
  }

  return (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3
}

/** Jaro-Winkler similarity — boosts score for shared prefixes */
function jaroWinkler(s1: string, s2: string): number {
  const j = jaro(s1, s2)
  let prefix = 0
  const limit = Math.min(4, Math.min(s1.length, s2.length))
  for (let i = 0; i < limit; i++) {
    if (s1[i] === s2[i]) prefix++
    else break
  }
  return j + prefix * 0.1 * (1 - j)
}

const JW_THRESHOLD = 0.9

/**
 * Match variable names from the user's message against the measure info directory.
 * Returns matching variable keys by fuzzy-matching short_name or long_name.
 * Uses multiple strategies: exact substring, stripped parenthetical, and word overlap.
 */
export function detectMentionedVariables(
  userMessage: string,
  measureInfoMap: MeasureInfoMap
): string[] {
  const msgLower = userMessage.toLowerCase()
  const matches: string[] = []

  for (const [key, val] of Object.entries(measureInfoMap)) {
    if (key.startsWith('_') || key.includes('{') || key.endsWith('_geo10')) continue
    if (!val || typeof val !== 'object' || !('short_name' in val)) continue
    const info = val as MeasureInfo
    const rawNames = [
      info.short_name?.toLowerCase(),
      info.long_name?.toLowerCase(),
    ].filter(Boolean) as string[]

    let matched = false
    for (const name of rawNames) {
      if (name.length < 5) continue

      // Strategy 1: exact substring (variable name appears in message)
      if (msgLower.includes(name)) { matched = true; break }

      // Strategy 2: strip parentheticals and check
      const stripped = stripParenthetical(name)
      if (stripped.length >= 5 && msgLower.includes(stripped)) { matched = true; break }

      // Strategy 3: check if message contains most significant words from the variable name
      // Uses Jaro-Winkler similarity to handle "insecurity" vs "insecure", etc.
      const nameWords = significantWords(stripped)
      const msgWords = significantWords(msgLower)
      if (nameWords.length >= 2) {
        const matchCount = nameWords.filter((nw) => msgWords.some((mw) => jaroWinkler(nw, mw) >= JW_THRESHOLD)).length
        // Require at least 2 matching words; if name has many words, require >= 40%
        if (matchCount >= 2 && (nameWords.length <= 3 || matchCount / nameWords.length >= 0.4)) { matched = true; break }
      }
    }

    if (matched) matches.push(key)
  }

  return matches
}

export function buildGeminiContext(opts: {
  datasets: { level: string; dataset: DataLookup }[]
  variableName: string
  measureInfo: MeasureInfo | null
  measureInfoMap: MeasureInfoMap
  datapackage: Datapackage | null
  year: number
  currentLevel: string
  selectedRegionId: string | null
  narrative: string | null
  regionNameMap: Record<string, string>
  correlations: CorrelationMatrix
  focusVariables?: string[]
  drillDownVariables?: string[]
}): GeminiContext {
  const { datasets, variableName, measureInfo, measureInfoMap, datapackage, year, currentLevel, selectedRegionId, narrative, regionNameMap, correlations, focusVariables, drillDownVariables } = opts

  // Build summaries for all available levels
  const levelSummaries: LevelSummary[] = []
  for (const { level, dataset } of datasets) {
    const meta = dataset._meta
    const timeOffset = year - meta.time.value[0]
    const summary = buildLevelSummary(dataset, variableName, timeOffset, level, regionNameMap)
    if (summary) levelSummaries.push(summary)
  }

  // Selected region time series from the current level's dataset
  let selectedRegionTimeSeries: { year: number; value: number }[] | null = null
  const currentDataset = datasets.find((d) => d.level === currentLevel)?.dataset
  if (selectedRegionId && currentDataset) {
    const meta = currentDataset._meta
    const regionData = currentDataset[selectedRegionId]
    const varInfo = meta.variables[variableName]
    if (regionData && varInfo && typeof regionData === 'object' && !('time' in regionData && 'variables' in regionData)) {
      const rd = regionData as Record<string, number | string | (number | string)[]>
      const { code: xCode, time_range: [rangeStart, rangeEnd] } = varInfo
      const series: { year: number; value: number }[] = []
      for (let ti = rangeStart; ti <= rangeEnd; ti++) {
        if (ti < meta.time.value.length) {
          const val = getValueAtTime(rd, xCode, ti, rangeStart)
          if (val !== null) {
            series.push({ year: meta.time.value[ti], value: val })
          }
        }
      }
      if (series.length > 0) selectedRegionTimeSeries = series
    }
  }

  // Build county-level focused CSV for detected variables
  const countyDataset = datasets.find((d) => d.level === 'county')?.dataset ?? null
  const countyVars = focusVariables?.length ? [...focusVariables] : []
  // Always include the currently selected variable
  if (countyVars.length > 0 && !countyVars.includes(variableName)) {
    countyVars.push(variableName)
  }

  return {
    variableName,
    variableLabel: measureInfo?.long_name || measureInfo?.short_name || variableName,
    category: measureInfo?.category || '',
    description: measureInfo?.long_description || measureInfo?.short_description || '',
    sources: measureInfo?.sources?.map((s) => s.name).join(', ') || '',
    statement: measureInfo?.statement || '',
    currentLevel,
    year,
    selectedRegion: selectedRegionId ? (regionNameMap[selectedRegionId] || selectedRegionId) : null,
    levelSummaries,
    selectedRegionTimeSeries,
    narrative,
    variableDirectory: buildVariableDirectory(measureInfoMap, datapackage),
    correlationSummary: buildCorrelationSummary(correlations, variableName, focusVariables || [], measureInfoMap),
    countyDataCsv: buildFocusedCsv(countyDataset, countyVars, regionNameMap),
    tractDataCsv: drillDownVariables?.length
      ? buildFocusedCsv(
          datasets.find((d) => d.level === 'tract')?.dataset ?? null,
          drillDownVariables,
          regionNameMap
        )
      : '',
  }
}
