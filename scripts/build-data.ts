/**
 * Data build script for NCR Data Commons
 *
 * Reads xz-compressed CSVs from data/ directory, pivots them into
 * indexed JSON lookup objects matching the format used by the dashboard,
 * and writes them to public/data/.
 *
 * Also copies GeoJSON shapes from docs/ to public/geo/.
 *
 * Usage: npx tsx scripts/build-data.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import * as zlib from 'zlib'
import * as lzma from 'lzma-native'
import { parse } from 'csv-parse/sync'
import { mean, median, standardDeviation, min as ssMin, max as ssMax } from 'simple-statistics'
import * as yazl from 'yazl'

const ROOT = path.resolve(__dirname, '..')
const DATA_DIR = path.join(ROOT, 'data')
const DOCS_DIR = path.join(ROOT, 'docs')
const PUBLIC_DATA_DIR = path.join(ROOT, 'public', 'data')
const PUBLIC_GEO_DIR = path.join(ROOT, 'public', 'geo')

interface CsvRow {
  ID: string
  time: string
  [variable: string]: string
}

interface VariableMeta {
  code: string
  time_range: [number, number]
}

interface DataLookup {
  _meta: {
    time: { value: number[]; name: string }
    variables: Record<string, VariableMeta>
  }
  [regionId: string]: Record<string, number | string | (number | string)[]> | { time: unknown; variables: unknown }
}

interface FieldInfo {
  name: string
  type: string
  time_range: [number, number]
  missing: number
  mean?: number
  sd?: number
  min?: number
  max?: number
}

// Dataset definitions mapping to source CSV files
const DATASETS: Record<string, string> = {
  county: 'county.csv.xz',
  tract: 'tract.csv.xz',
  block_group: 'block_group.csv.xz',
  civic_association: 'civic_association.csv.xz',
  human_services_region: 'human_services_region.csv.xz',
  planning_district: 'planning_district.csv.xz',
  supervisor_district: 'supervisor_district.csv.xz',
  zip_code: 'zip_code.csv.xz',
}

// GeoJSON files to copy from docs/ directory (existing built shapes)
const GEOJSON_COPY: Record<string, string> = {
  'county.geojson': 'county.json',
  'tract.geojson': 'tract.json',
  'block_group.geojson': 'block_group.json',
  'civic_association.geojson': 'civic_association.json',
  'human_services_region.geojson': 'human_services_region.json',
  'planning_district.geojson': 'planning_district.json',
  'supervisor_district.geojson': 'supervisor_district.json',
  'zip_code.geojson': 'zip_code.json',
}

/**
 * Load valid region IDs from a GeoJSON file in docs/.
 * Only regions present in the GeoJSON are included in built data.
 */
function loadGeoIds(datasetName: string): Set<string> | null {
  const geoSrcName = GEOJSON_COPY[`${datasetName}.geojson`]
  if (!geoSrcName) return null
  const srcPath = path.join(DOCS_DIR, geoSrcName)
  if (!fs.existsSync(srcPath)) return null

  const geo = JSON.parse(fs.readFileSync(srcPath, 'utf-8'))
  const ids = new Set<string>()

  if (geo.features && Array.isArray(geo.features)) {
    for (const f of geo.features) {
      const id = f.properties?.geoid || f.properties?.GEOID || f.id
      if (id) ids.add(String(id))
    }
  } else {
    // Keyed format: top-level keys are region IDs
    for (const key of Object.keys(geo)) {
      if (key !== '_meta' && key !== 'type' && key !== 'name' && key !== 'crs') {
        ids.add(key)
      }
    }
  }

  return ids.size > 0 ? ids : null
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

function parseValue(val: string): number | string {
  if (val === '' || val === 'NA' || val === 'na' || val === 'null') return 'NA'
  const num = Number(val)
  return isNaN(num) ? val : num
}

function buildLookup(rows: CsvRow[], variableNames: string[]): DataLookup {
  const timeSet = new Set<number>()
  for (const row of rows) {
    const t = parseInt(row.time, 10)
    if (!isNaN(t)) timeSet.add(t)
  }
  const timeValues = Array.from(timeSet).sort((a, b) => a - b)
  const timeMin = timeValues[0]

  const timeIndex = new Map<number, number>()
  for (const t of timeValues) {
    timeIndex.set(t, t - timeMin)
  }
  const totalTimeSlots = timeValues.length

  const regionRows = new Map<string, CsvRow[]>()
  for (const row of rows) {
    const id = row.ID.replace(/^"|"$/g, '')
    if (!regionRows.has(id)) regionRows.set(id, [])
    regionRows.get(id)!.push(row)
  }

  const variableTimeRanges = new Map<string, [number, number]>()
  for (const varName of variableNames) {
    let minOffset = totalTimeSlots
    let maxOffset = -1
    for (const row of rows) {
      const val = row[varName]
      if (val !== '' && val !== 'NA' && val !== undefined) {
        const t = parseInt(row.time, 10)
        const offset = t - timeMin
        if (offset < minOffset) minOffset = offset
        if (offset > maxOffset) maxOffset = offset
      }
    }
    if (maxOffset >= 0) {
      variableTimeRanges.set(varName, [minOffset, maxOffset])
    } else {
      variableTimeRanges.set(varName, [-1, -1])
    }
  }

  const variableMeta: Record<string, VariableMeta> = {}
  const codeToVar = new Map<string, string>()
  for (let i = 0; i < variableNames.length; i++) {
    const varName = variableNames[i]
    const code = `X${i + 2}`
    const timeRange = variableTimeRanges.get(varName) || [-1, -1]
    variableMeta[varName] = { code, time_range: timeRange }
    codeToVar.set(code, varName)
  }

  const lookup: DataLookup = {
    _meta: {
      time: { value: timeValues, name: 'time' },
      variables: variableMeta,
    },
  }

  for (const [regionId, rRows] of regionRows) {
    const regionData: Record<string, number | string | (number | string)[]> = {}

    for (const varName of variableNames) {
      const meta = variableMeta[varName]
      const [rangeStart, rangeEnd] = meta.time_range
      if (rangeStart === -1 && rangeEnd === -1) continue

      const arrayLen = rangeEnd - rangeStart + 1

      if (arrayLen === 1) {
        for (const row of rRows) {
          const t = parseInt(row.time, 10)
          const offset = t - timeMin
          if (offset === rangeStart) {
            const val = parseValue(row[varName])
            if (val !== 'NA') {
              regionData[meta.code] = val
            }
            break
          }
        }
      } else {
        const values: (number | string)[] = new Array(arrayLen).fill('NA')
        let hasData = false
        for (const row of rRows) {
          const t = parseInt(row.time, 10)
          const offset = t - timeMin
          if (offset >= rangeStart && offset <= rangeEnd) {
            const val = parseValue(row[varName])
            values[offset - rangeStart] = val
            if (val !== 'NA') hasData = true
          }
        }
        if (hasData) {
          const nonNA = values.filter((v) => v !== 'NA')
          if (nonNA.length === 1 && arrayLen === 1) {
            regionData[meta.code] = nonNA[0]
          } else {
            regionData[meta.code] = values
          }
        }
      }
    }

    lookup[regionId] = regionData
  }

  return lookup
}

function buildFieldInfo(rows: CsvRow[], variableNames: string[], timeValues: number[]): FieldInfo[] {
  const timeMin = timeValues[0]
  const fields: FieldInfo[] = [
    {
      name: 'time',
      type: 'integer',
      time_range: [0, timeValues.length - 1],
      missing: 0,
    },
  ]

  for (const varName of variableNames) {
    const numericValues: number[] = []
    let missingCount = 0
    let minOffset = timeValues.length
    let maxOffset = -1

    for (const row of rows) {
      const raw = row[varName]
      if (raw === '' || raw === 'NA' || raw === undefined) {
        missingCount++
      } else {
        const num = Number(raw)
        if (!isNaN(num)) {
          numericValues.push(num)
          const t = parseInt(row.time, 10)
          const offset = t - timeMin
          if (offset < minOffset) minOffset = offset
          if (offset > maxOffset) maxOffset = offset
        } else {
          missingCount++
        }
      }
    }

    const fieldInfo: FieldInfo = {
      name: varName,
      type: numericValues.length > 0 ? (numericValues.some((v) => v % 1 !== 0) ? 'float' : 'integer') : 'unknown',
      time_range: maxOffset >= 0 ? [minOffset, maxOffset] : [-1, -1],
      missing: missingCount,
    }

    if (numericValues.length > 0) {
      fieldInfo.mean = mean(numericValues)
      fieldInfo.sd = numericValues.length > 1 ? standardDeviation(numericValues) : 0
      fieldInfo.min = ssMin(numericValues)
      fieldInfo.max = ssMax(numericValues)
    }

    fields.push(fieldInfo)
  }

  return fields
}

function copyGeoJsonShapes(): void {
  fs.mkdirSync(PUBLIC_GEO_DIR, { recursive: true })

  for (const [destFilename, srcFilename] of Object.entries(GEOJSON_COPY)) {
    const srcPath = path.join(DOCS_DIR, srcFilename)
    const destPath = path.join(PUBLIC_GEO_DIR, destFilename)

    if (fs.existsSync(destPath)) {
      console.log(`  Skipping ${destFilename} (already exists)`)
      continue
    }

    if (!fs.existsSync(srcPath)) {
      console.warn(`  Warning: Source GeoJSON not found: ${srcPath}`)
      continue
    }

    fs.copyFileSync(srcPath, destPath)
    const size = (fs.statSync(destPath).size / 1024 / 1024).toFixed(1)
    console.log(`  Copied ${srcFilename} → ${destFilename} (${size} MB)`)
  }
}

async function buildDataset(datasetName: string, csvFile: string): Promise<{
  lookup: DataLookup
  fields: FieldInfo[]
  rowCount: number
  entityCount: number
}> {
  console.log(`\nBuilding ${datasetName} from ${csvFile}...`)
  const csvPath = path.join(DATA_DIR, csvFile)

  if (!fs.existsSync(csvPath)) {
    throw new Error(`Data file not found: ${csvPath}`)
  }

  console.log('  Decompressing...')
  const csvContent = await decompressXz(csvPath)

  console.log('  Parsing CSV...')
  const rows: CsvRow[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    trim: true,
  })

  console.log(`  Parsed ${rows.length} rows`)

  // Filter to only regions present in the GeoJSON
  const validIds = loadGeoIds(datasetName)

  const allColumns = Object.keys(rows[0])
  const variableNames = allColumns.filter((col) => {
    const clean = col.replace(/^"|"$/g, '')
    return clean !== 'ID' && clean !== 'time'
  })

  let cleanRows = rows.map((row) => {
    const clean: CsvRow = { ID: '', time: '' }
    for (const [key, val] of Object.entries(row)) {
      const cleanKey = key.replace(/^"|"$/g, '')
      clean[cleanKey] = typeof val === 'string' ? val.replace(/^"|"$/g, '') : val
    }
    return clean
  })

  if (validIds) {
    const before = cleanRows.length
    cleanRows = cleanRows.filter((row) => validIds.has(row.ID))
    console.log(`  Filtered to ${cleanRows.length} rows (${before - cleanRows.length} outside region removed)`)
  }

  const cleanVariableNames = variableNames.map((v) => v.replace(/^"|"$/g, ''))

  console.log('  Building lookup...')
  const lookup = buildLookup(cleanRows, cleanVariableNames)

  const timeValues = lookup._meta.time.value
  const entityIds = Object.keys(lookup).filter((k) => k !== '_meta')

  console.log('  Computing field statistics...')
  const fields = buildFieldInfo(cleanRows, cleanVariableNames, timeValues)

  console.log(`  Done: ${entityIds.length} entities, ${cleanVariableNames.length} variables`)

  return { lookup, fields, rowCount: cleanRows.length, entityCount: entityIds.length }
}

/** Extract a tall CSV (geoid,time,value) for a single variable from a lookup object */
function extractVariableCsv(lookup: DataLookup, varName: string): string {
  const meta = lookup._meta
  const varInfo = meta.variables[varName]
  if (!varInfo || varInfo.time_range[0] === -1) return ''

  const { code, time_range: [rangeStart, rangeEnd] } = varInfo
  const lines: string[] = ['geoid,time,value']

  for (const [regionId, regionData] of Object.entries(lookup)) {
    if (regionId === '_meta') continue
    const rd = regionData as Record<string, number | string | (number | string)[]>
    const raw = rd[code]
    if (raw === undefined) continue

    if (Array.isArray(raw)) {
      for (let i = 0; i < raw.length; i++) {
        const val = raw[i]
        if (val === 'NA') continue
        const year = meta.time.value[rangeStart + i]
        lines.push(`${regionId},${year},${val}`)
      }
    } else if (raw !== 'NA') {
      const year = meta.time.value[rangeStart] || ''
      lines.push(`${regionId},${year},${raw}`)
    }
  }

  return lines.length > 1 ? lines.join('\n') : ''
}

/** Write per-variable zip files: each zip contains a CSV per level */
async function writePerVariableZips(builtDatasets: { name: string; lookup: DataLookup }[]): Promise<void> {
  if (builtDatasets.length === 0) return

  // Get all variable names from the first dataset's meta
  const allVarNames = new Set<string>()
  for (const { lookup } of builtDatasets) {
    for (const varName of Object.keys(lookup._meta.variables)) {
      if (varName !== 'time') allVarNames.add(varName)
    }
  }

  console.log(`\nGenerating per-variable zip files for ${allVarNames.size} variables...`)
  let zipCount = 0
  let totalBytes = 0

  for (const varName of allVarNames) {
    const csvFiles: { name: string; content: string }[] = []

    for (const { name: levelName, lookup } of builtDatasets) {
      const csv = extractVariableCsv(lookup, varName)
      if (csv) {
        csvFiles.push({ name: `${levelName}.csv`, content: csv })
      }
    }

    if (csvFiles.length === 0) continue

    const zipfile = new yazl.ZipFile()
    for (const { name, content } of csvFiles) {
      zipfile.addBuffer(Buffer.from(content, 'utf-8'), name)
    }
    zipfile.end()

    const chunks: Buffer[] = []
    zipfile.outputStream.on('data', (chunk: Buffer) => chunks.push(chunk))

    // Wait for the zip stream to finish
    const zipBuffer: Buffer = await new Promise((resolve) => {
      zipfile.outputStream.on('end', () => resolve(Buffer.concat(chunks)))
    })

    const outPath = path.join(PUBLIC_DATA_DIR, `${varName}.csv.zip`)
    fs.writeFileSync(outPath, zipBuffer)
    totalBytes += zipBuffer.length
    zipCount++
  }

  console.log(`  Wrote ${zipCount} zip files (${(totalBytes / 1024 / 1024).toFixed(1)} MB total)`)
}

async function main() {
  console.log('=== NCR Data Commons Build ===\n')

  fs.mkdirSync(PUBLIC_DATA_DIR, { recursive: true })
  fs.mkdirSync(PUBLIC_GEO_DIR, { recursive: true })

  if (!fs.existsSync(DATA_DIR)) {
    console.error(`Data directory not found: ${DATA_DIR}`)
    console.error('Please ensure the source CSV.xz files are in the data/ directory.')
    process.exit(1)
  }

  // Copy measure_info.json
  const measureInfoSrc = path.join(DATA_DIR, 'measure_info.json')
  const measureInfoDest = path.join(PUBLIC_DATA_DIR, 'measure_info.json')
  if (fs.existsSync(measureInfoSrc)) {
    fs.copyFileSync(measureInfoSrc, measureInfoDest)
    console.log('Copied measure_info.json')
  }

  // Copy entity_info.json
  const entityInfoSrc = path.join(DATA_DIR, 'entity_info.json')
  const entityInfoDest = path.join(PUBLIC_DATA_DIR, 'entity_info.json')
  if (fs.existsSync(entityInfoSrc)) {
    fs.copyFileSync(entityInfoSrc, entityInfoDest)
    console.log('Copied entity_info.json')
  }

  // Build each dataset
  const resources: Array<{
    name: string
    schema: { fields: FieldInfo[] }
    bytes: number
    rows: number
    entities: number
  }> = []

  // Datasets that should be gzip-compressed (too large for regular git)
  const GZIP_THRESHOLD_MB = 50
  const builtDatasets: { name: string; lookup: DataLookup }[] = []

  for (const [name, csvFile] of Object.entries(DATASETS)) {
    const result = await buildDataset(name, csvFile)
    builtDatasets.push({ name, lookup: result.lookup })

    const jsonStr = JSON.stringify(result.lookup)
    const sizeMB = jsonStr.length / 1024 / 1024

    if (sizeMB > GZIP_THRESHOLD_MB) {
      // Write gzip-compressed version for browser (DecompressionStream)
      const gzPath = path.join(PUBLIC_DATA_DIR, `${name}.json.gz`)
      const compressed = zlib.gzipSync(Buffer.from(jsonStr, 'utf-8'), { level: 9 })
      fs.writeFileSync(gzPath, compressed)
      // Remove uncompressed version if it exists (no longer needed)
      const plainPath = path.join(PUBLIC_DATA_DIR, `${name}.json`)
      if (fs.existsSync(plainPath)) fs.unlinkSync(plainPath)
      console.log(`  Wrote ${name}.json.gz (${(compressed.length / 1024 / 1024).toFixed(1)} MB, uncompressed ${sizeMB.toFixed(1)} MB)`)
    } else {
      const lookupPath = path.join(PUBLIC_DATA_DIR, `${name}.json`)
      fs.writeFileSync(lookupPath, jsonStr)
      console.log(`  Wrote ${name}.json (${sizeMB.toFixed(1)} MB)`)
    }

    resources.push({
      name,
      schema: { fields: result.fields },
      bytes: Buffer.byteLength(jsonStr),
      rows: result.rowCount,
      entities: result.entityCount,
    })
  }

  // Build datapackage.json
  const measureInfo = fs.existsSync(measureInfoSrc) ? JSON.parse(fs.readFileSync(measureInfoSrc, 'utf-8')) : {}

  const datapackage = {
    name: 'ncr_data_commons',
    title: 'National Capital Region Data Commons',
    licence: 'public',
    resources,
    measure_info: measureInfo,
  }

  fs.writeFileSync(path.join(PUBLIC_DATA_DIR, 'datapackage.json'), JSON.stringify(datapackage, null, 2))
  console.log('\nWrote datapackage.json')

  // Generate per-variable zip files
  await writePerVariableZips(builtDatasets)

  // Copy GeoJSON shapes from docs/
  console.log('\nCopying GeoJSON shapes...')
  copyGeoJsonShapes()

  console.log('\n=== Build complete ===')
}

main().catch((err) => {
  console.error('Build failed:', err)
  process.exit(1)
})
