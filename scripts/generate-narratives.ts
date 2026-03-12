/**
 * Generate AI narrative summaries for each variable using Gemini 2.5 Flash.
 *
 * Reads measure_info.json + datapackage.json, sends metadata + stats to Gemini,
 * and outputs public/data/narratives.json.
 *
 * Caches results in data/.narrative-cache.json keyed by hash of input.
 * Rate-limited to stay within the free tier (15 req/min).
 *
 * Usage: GEMINI_API_KEY=... npx tsx scripts/generate-narratives.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import { GoogleGenerativeAI } from '@google/generative-ai'

const ROOT = path.resolve(__dirname, '..')
const MEASURE_INFO_PATH = path.join(ROOT, 'data', 'measure_info.json')
const DATAPACKAGE_PATH = path.join(ROOT, 'public', 'data', 'datapackage.json')
const CACHE_PATH = path.join(ROOT, 'data', '.narrative-cache.json')
const OUTPUT_PATH = path.join(ROOT, 'public', 'data', 'narratives.json')

const DELAY_MS = 4500 // 4.5s between calls → ~13 req/min (safe margin under 15 req/min)
const MAX_RETRIES = 3

interface MeasureInfo {
  category: string
  short_name: string
  long_name: string
  short_description: string
  long_description: string
  statement: string
  measure_type: string
  type: string
  unit?: string
  provenance?: string
  sources: { name: string; url?: string }[]
}

interface DatapackageField {
  name: string
  type: string
  time_range: [number, number]
  mean?: number
  sd?: number
  min?: number
  max?: number
  missing?: number
}

interface CacheEntry {
  hash: string
  narrative: string
}

function hash(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex').slice(0, 16)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function buildPrompt(varName: string, info: MeasureInfo, stats: DatapackageField | null): string {
  let prompt = `Variable: ${varName}\n`
  prompt += `Name: ${info.long_name || info.short_name}\n`
  prompt += `Category: ${info.category}\n`
  prompt += `Type: ${info.measure_type || info.type}\n`
  if (info.unit) prompt += `Unit: ${info.unit}\n`
  prompt += `Description: ${info.long_description || info.short_description}\n`
  if (info.provenance) prompt += `Provenance: ${info.provenance}\n`
  if (info.sources?.length) {
    prompt += `Source: ${info.sources.map((s) => s.name).join(', ')}\n`
  }
  if (stats) {
    if (stats.mean !== undefined) prompt += `Mean: ${stats.mean.toFixed(3)}\n`
    if (stats.sd !== undefined) prompt += `Std Dev: ${stats.sd.toFixed(3)}\n`
    if (stats.min !== undefined) prompt += `Min: ${stats.min.toFixed(3)}\n`
    if (stats.max !== undefined) prompt += `Max: ${stats.max.toFixed(3)}\n`
  }

  if (varName.endsWith('_geo20')) {
    prompt += `Note: This variable is mapped to 2020 Census geographies.\n`
  }

  prompt += `\nWrite 2-3 sentences explaining what this measure captures, why it matters for public health, and what the regional range looks like. Use the statistics provided. Be factual and concise. Don't fabricate data.`
  return prompt
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.log('GEMINI_API_KEY not set — skipping narrative generation.')
    process.exit(0)
  }

  // Load inputs
  const measureInfo: Record<string, MeasureInfo> = JSON.parse(fs.readFileSync(MEASURE_INFO_PATH, 'utf-8'))
  const datapackage = JSON.parse(fs.readFileSync(DATAPACKAGE_PATH, 'utf-8'))

  // Build stats lookup from county-level resource
  const countyResource = datapackage.resources.find((r: { name: string }) => r.name === 'county')
  const statsMap = new Map<string, DatapackageField>()
  if (countyResource) {
    for (const field of countyResource.schema.fields) {
      if (field.name !== 'time') {
        statsMap.set(field.name, field)
      }
    }
  }

  // Load cache
  let cache: Record<string, CacheEntry> = {}
  if (fs.existsSync(CACHE_PATH)) {
    cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'))
  }

  // Filter to real variables (skip _references, template patterns, and _geo10 variants)
  const variables = Object.entries(measureInfo).filter(
    ([key, val]) =>
      !key.startsWith('_') &&
      !key.includes('{') &&
      !key.endsWith('_geo10') &&
      val &&
      typeof val === 'object' &&
      'short_name' in val
  ) as [string, MeasureInfo][]

  console.log(`Found ${variables.length} variables to process.`)

  const genai = new GoogleGenerativeAI(apiKey)
  const model = genai.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const narratives: Record<string, string> = {}
  let generated = 0
  let cached = 0

  for (const [varName, info] of variables) {
    const stats = statsMap.get(varName) || null
    const prompt = buildPrompt(varName, info, stats)
    const inputHash = hash(prompt)

    // Check cache
    if (cache[varName] && cache[varName].hash === inputHash) {
      narratives[varName] = cache[varName].narrative
      cached++
      continue
    }

    // Call Gemini with retry on 429
    let success = false
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        console.log(`  Generating: ${varName} (${info.short_name})${attempt > 0 ? ` [retry ${attempt}]` : ''}`)
        const result = await model.generateContent(prompt)
        const text = result.response.text().trim()
        narratives[varName] = text
        cache[varName] = { hash: inputHash, narrative: text }
        generated++
        success = true

        // Save cache incrementally every 10 generations
        if (generated % 10 === 0) {
          fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2))
        }

        // Rate limit
        await sleep(DELAY_MS)
        break
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes('429') || msg.toLowerCase().includes('quota')) {
          // Parse retry delay from error if available
          const retryMatch = msg.match(/retry in ([\d.]+)s/)
          const waitSec = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) + 5 : 60
          console.log(`  Rate limited — waiting ${waitSec}s before retry...`)
          await sleep(waitSec * 1000)
        } else {
          console.error(`  Error for ${varName}: ${msg}`)
          break
        }
      }
    }
    if (!success && cache[varName]) {
      narratives[varName] = cache[varName].narrative
    }
  }

  // Write outputs
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(narratives, null, 2))
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2))

  console.log(`\nDone: ${generated} generated, ${cached} cached, ${Object.keys(narratives).length} total.`)
  console.log(`Output: ${OUTPUT_PATH}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
