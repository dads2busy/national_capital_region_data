/**
 * Rebuild wide-format CSV files (county.csv.xz, tract.csv.xz, block_group.csv.xz, civic_association.csv.xz)
 * from individual tall-format source CSVs in data/.
 *
 * Each source CSV has columns: ID, time, <measure1>, [<measure2>, ...]
 * Output is a wide CSV with columns: ID, time, <all measures from all sources>
 *
 * Usage: npx tsx scripts/rebuild-wide.ts [level]
 *   level: county, tract, block_group, civic_association (default: all)
 */

import * as fs from 'fs'
import * as path from 'path'
import * as lzma from 'lzma-native'
import { parse } from 'csv-parse/sync'

const DATA_DIR = path.resolve(__dirname, '..', 'data')

// Map geographic level prefix to output file
const LEVEL_MAP: Record<string, { prefix: string; output: string }> = {
  county: { prefix: 'ncr_ct_', output: 'county.csv.xz' },
  tract: { prefix: 'ncr_tr_', output: 'tract.csv.xz' },
  block_group: { prefix: 'ncr_bg_', output: 'block_group.csv.xz' },
  civic_association: { prefix: 'ncr_ca_', output: 'civic_association.csv.xz' },
}

function decompressSync(filePath: string): string {
  const compressed = fs.readFileSync(filePath)
  return new Promise<string>((resolve, reject) => {
    lzma.decompress(compressed, undefined, (result: Buffer | string, error?: Error) => {
      if (error) reject(error)
      else resolve(typeof result === 'string' ? result : result.toString('utf-8'))
    })
  }) as unknown as string
}

async function decompressXz(filePath: string): Promise<string> {
  const compressed = fs.readFileSync(filePath)
  return new Promise((resolve, reject) => {
    lzma.decompress(compressed, undefined, (result: Buffer | string, error?: Error) => {
      if (error) reject(error)
      else resolve(typeof result === 'string' ? result : result.toString('utf-8'))
    })
  })
}

function compressXz(data: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    lzma.compress(Buffer.from(data, 'utf-8'), 6, (result: Buffer, error?: Error) => {
      if (error) reject(error)
      else resolve(result)
    })
  })
}

async function rebuildLevel(level: string) {
  const { prefix, output } = LEVEL_MAP[level]
  console.log(`\n=== Rebuilding ${output} from ${prefix}* sources ===`)

  // Find all source files for this level
  const allFiles = fs.readdirSync(DATA_DIR).filter(
    (f) => f.startsWith(prefix) && f.endsWith('.csv.xz')
  )
  console.log(`Found ${allFiles.length} source files`)

  // Accumulate data: Map<"ID,time", Record<varName, value>>
  const wideData = new Map<string, Record<string, string>>()
  const allVarNames = new Set<string>()

  for (const file of allFiles) {
    const filePath = path.join(DATA_DIR, file)
    console.log(`  Reading ${file}...`)

    const csv = await decompressXz(filePath)
    const rows = parse(csv, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[]

    if (rows.length === 0) {
      console.log(`    (empty, skipping)`)
      continue
    }

    const varNames = Object.keys(rows[0]).filter((k) => k !== 'ID' && k !== 'time')
    for (const v of varNames) allVarNames.add(v)

    for (const row of rows) {
      const key = `${row.ID},${row.time}`
      if (!wideData.has(key)) {
        wideData.set(key, { ID: row.ID, time: row.time })
      }
      const existing = wideData.get(key)!
      for (const v of varNames) {
        if (row[v] !== '' && row[v] !== undefined) {
          existing[v] = row[v]
        }
      }
    }

    console.log(`    ${rows.length} rows, ${varNames.length} variables: ${varNames.join(', ').substring(0, 80)}...`)
  }

  // Sort variable names and build output CSV
  const sortedVars = Array.from(allVarNames).sort()
  const header = ['ID', 'time', ...sortedVars]

  // Sort rows by ID then time
  const sortedKeys = Array.from(wideData.keys()).sort((a, b) => {
    const [idA, timeA] = a.split(',')
    const [idB, timeB] = b.split(',')
    if (idA < idB) return -1
    if (idA > idB) return 1
    return Number(timeA) - Number(timeB)
  })

  const lines = [header.join(',')]
  for (const key of sortedKeys) {
    const row = wideData.get(key)!
    const values = header.map((col) => row[col] || '')
    lines.push(values.join(','))
  }

  const csvStr = lines.join('\n') + '\n'
  const uniqueIds = new Set(sortedKeys.map((k) => k.split(',')[0]))
  const uniqueTimes = new Set(sortedKeys.map((k) => k.split(',')[1]))

  console.log(`\nResult: ${uniqueIds.size} regions, ${uniqueTimes.size} time periods, ${sortedVars.length} variables`)
  console.log(`Total rows: ${sortedKeys.length}`)

  // Verify 2023 specifically
  const dc2023Key = '11001,2023'
  const dc2023 = wideData.get(dc2023Key)
  if (dc2023) {
    const nonEmpty = Object.entries(dc2023).filter(([k, v]) => k !== 'ID' && k !== 'time' && v !== '').length
    console.log(`DC 2023 non-empty columns: ${nonEmpty}`)
  }

  console.log(`Compressing to ${output}...`)
  const compressed = await compressXz(csvStr)
  fs.writeFileSync(path.join(DATA_DIR, output), compressed)
  console.log(`Wrote ${output} (${(compressed.length / 1024 / 1024).toFixed(1)} MB)`)
}

async function main() {
  const requestedLevel = process.argv[2]
  const levels = requestedLevel ? [requestedLevel] : Object.keys(LEVEL_MAP)

  for (const level of levels) {
    if (!LEVEL_MAP[level]) {
      console.error(`Unknown level: ${level}. Available: ${Object.keys(LEVEL_MAP).join(', ')}`)
      process.exit(1)
    }
    await rebuildLevel(level)
  }
}

main().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
