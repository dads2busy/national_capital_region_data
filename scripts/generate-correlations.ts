/**
 * Generate pairwise Pearson correlation matrices across all variables
 * at each geographic level (county, tract, block_group).
 *
 * Reads the already-built JSON lookup files from public/data/,
 * computes correlations using the latest available year for each variable,
 * and writes a compact correlations.json.
 *
 * Usage: npx tsx scripts/generate-correlations.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import * as zlib from 'zlib'

const ROOT = path.resolve(__dirname, '..')
const PUBLIC_DATA = path.join(ROOT, 'public', 'data')

interface VariableMeta {
  code: string
  time_range: [number, number]
}

interface DataMeta {
  time: { value: number[]; name: string }
  variables: Record<string, VariableMeta>
}

interface DataLookup {
  _meta: DataMeta
  [regionId: string]: unknown
}

type RegionData = Record<string, number | string | (number | string)[]>

// Output format: { level: { "varA|varB": r } }
// Only store pairs where |r| >= threshold and n >= minN
type CorrelationMap = Record<string, Record<string, number>>

const MIN_PAIRED_N = 5
const MIN_ABS_R = 0.3 // only store meaningful correlations to keep file small

function getValueAtTime(
  regionData: RegionData,
  xCode: string,
  timeOffset: number,
  rangeStart: number
): number | null {
  const raw = regionData[xCode]
  if (raw === undefined) return null
  if (Array.isArray(raw)) {
    const idx = timeOffset - rangeStart
    if (idx < 0 || idx >= raw.length) return null
    const val = raw[idx]
    return typeof val === 'number' ? val : null
  }
  return typeof raw === 'number' ? raw : null
}

/** Get latest-year value for a variable for each region */
function getLatestValues(
  dataset: DataLookup,
  varName: string
): Map<string, number> {
  const meta = dataset._meta
  const varInfo = meta.variables[varName]
  if (!varInfo || varInfo.time_range[0] === -1) return new Map()

  const { code, time_range: [rangeStart, rangeEnd] } = varInfo
  const result = new Map<string, number>()

  for (const [regionId, regionData] of Object.entries(dataset)) {
    if (regionId === '_meta') continue
    // Try from latest year backwards
    for (let ti = Math.min(rangeEnd, meta.time.value.length - 1); ti >= rangeStart; ti--) {
      const val = getValueAtTime(regionData as RegionData, code, ti, rangeStart)
      if (val !== null) {
        result.set(regionId, val)
        break
      }
    }
  }

  return result
}

/** Compute Pearson correlation between two value maps */
function pearsonCorrelation(
  a: Map<string, number>,
  b: Map<string, number>
): { r: number; n: number } | null {
  const pairs: [number, number][] = []
  for (const [id, va] of a) {
    const vb = b.get(id)
    if (vb !== undefined) pairs.push([va, vb])
  }

  if (pairs.length < MIN_PAIRED_N) return null

  const n = pairs.length
  let sumA = 0, sumB = 0, sumAB = 0, sumA2 = 0, sumB2 = 0
  for (const [va, vb] of pairs) {
    sumA += va
    sumB += vb
    sumAB += va * vb
    sumA2 += va * va
    sumB2 += vb * vb
  }

  const denom = Math.sqrt((n * sumA2 - sumA * sumA) * (n * sumB2 - sumB * sumB))
  if (denom === 0) return null

  const r = (n * sumAB - sumA * sumB) / denom
  return { r, n }
}

function loadDataset(levelName: string): DataLookup | null {
  const jsonPath = path.join(PUBLIC_DATA, `${levelName}.json`)
  if (fs.existsSync(jsonPath)) {
    return JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))
  }
  const gzPath = path.join(PUBLIC_DATA, `${levelName}.json.gz`)
  if (fs.existsSync(gzPath)) {
    const buf = fs.readFileSync(gzPath)
    return JSON.parse(zlib.gunzipSync(buf).toString('utf-8'))
  }
  return null
}

function processLevel(dataset: DataLookup, levelName: string): Record<string, number> {
  const meta = dataset._meta
  // Get variable names, excluding _geo10 variants and non-data variables
  const varNames = Object.keys(meta.variables).filter((name) => {
    if (name === 'time') return false
    const info = meta.variables[name]
    if (info.time_range[0] === -1) return false
    // Skip _geo10 to avoid near-duplicate correlations
    if (name.endsWith('_geo10')) return false
    return true
  })

  console.log(`  ${levelName}: ${varNames.length} variables, computing correlations...`)

  // Pre-compute latest values for all variables
  const valuesByVar = new Map<string, Map<string, number>>()
  for (const name of varNames) {
    valuesByVar.set(name, getLatestValues(dataset, name))
  }

  const correlations: Record<string, number> = {}
  let computed = 0
  let stored = 0

  for (let i = 0; i < varNames.length; i++) {
    const a = varNames[i]
    const valsA = valuesByVar.get(a)!
    for (let j = i + 1; j < varNames.length; j++) {
      const b = varNames[j]
      const valsB = valuesByVar.get(b)!
      const result = pearsonCorrelation(valsA, valsB)
      computed++
      if (result && Math.abs(result.r) >= MIN_ABS_R) {
        // Store as "varA|varB" with r rounded to 3 decimal places
        correlations[`${a}|${b}`] = Math.round(result.r * 1000) / 1000
        stored++
      }
    }
  }

  console.log(`  ${levelName}: ${computed} pairs computed, ${stored} stored (|r| >= ${MIN_ABS_R})`)
  return correlations
}

async function main() {
  console.log('Generating correlation matrices...\n')

  const levels = ['county', 'tract', 'block_group'] as const
  const result: CorrelationMap = {}

  for (const level of levels) {
    const dataset = loadDataset(level)
    if (!dataset) {
      console.log(`  ${level}: data file not found, skipping`)
      continue
    }
    result[level] = processLevel(dataset, level)
  }

  const outPath = path.join(PUBLIC_DATA, 'correlations.json')
  const json = JSON.stringify(result)
  fs.writeFileSync(outPath, json)

  const sizeKB = (Buffer.byteLength(json) / 1024).toFixed(1)
  console.log(`\nWrote ${outPath} (${sizeKB} KB)`)

  // Summary stats
  for (const level of levels) {
    if (result[level]) {
      console.log(`  ${level}: ${Object.keys(result[level]).length} correlation pairs`)
    }
  }
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
