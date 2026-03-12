import type { TableFormat } from './types'

interface DataMeta {
  time: { value: number[] }
  variables: Record<string, { code: string; time_range: [number, number] }>
}

type RegionData = Record<string, number | string | (number | string)[]>

/** Generate a CSV/TSV string from a dataset lookup */
export function generateExport(
  dataset: Record<string, unknown>,
  include: string[],
  tableFormat: TableFormat,
  separator: string
): string {
  const meta = dataset._meta as DataMeta
  const rows: string[] = []

  if (tableFormat === 'tall') {
    rows.push(['geoid', 'time', 'variable', 'value'].join(separator))
    for (const [regionId, regionData] of Object.entries(dataset)) {
      if (regionId === '_meta') continue
      const rd = regionData as RegionData
      for (const varName of include.length > 0 ? include : Object.keys(meta.variables)) {
        const varInfo = meta.variables[varName]
        if (!varInfo) continue
        const {
          code,
          time_range: [rangeStart],
        } = varInfo
        const data = rd[code]
        if (data === undefined) continue
        if (Array.isArray(data)) {
          for (let i = 0; i < data.length; i++) {
            const year = meta.time.value[rangeStart + i]
            const val = data[i]
            rows.push([regionId, year, varName, val === 'NA' ? '' : val].join(separator))
          }
        } else {
          const year = meta.time.value[rangeStart] || ''
          rows.push([regionId, year, varName, data === 'NA' ? '' : data].join(separator))
        }
      }
    }
  } else if (tableFormat === 'wide') {
    const variables = include.length > 0 ? include : Object.keys(meta.variables)
    const timeColumns: string[] = []
    const varTimeMap: { varName: string; timeIdx: number }[] = []
    for (const varName of variables) {
      const varInfo = meta.variables[varName]
      if (!varInfo) continue
      const [rangeStart, rangeEnd] = varInfo.time_range
      if (rangeStart === -1) continue
      for (let t = rangeStart; t <= rangeEnd; t++) {
        const year = meta.time.value[t]
        timeColumns.push(`${varName}_${year}`)
        varTimeMap.push({ varName, timeIdx: t - rangeStart })
      }
    }
    rows.push(['geoid', ...timeColumns].join(separator))
    for (const [regionId, regionData] of Object.entries(dataset)) {
      if (regionId === '_meta') continue
      const rd = regionData as RegionData
      const values = varTimeMap.map(({ varName, timeIdx }) => {
        const code = meta.variables[varName]?.code
        if (!code) return ''
        const data = rd[code]
        if (data === undefined) return ''
        if (Array.isArray(data)) {
          const val = data[timeIdx]
          return val === 'NA' ? '' : String(val)
        }
        return data === 'NA' ? '' : String(data)
      })
      rows.push([regionId, ...values].join(separator))
    }
  } else {
    // mixed
    const variables = include.length > 0 ? include : Object.keys(meta.variables)
    rows.push(['geoid', ...variables].join(separator))
    for (const [regionId, regionData] of Object.entries(dataset)) {
      if (regionId === '_meta') continue
      const rd = regionData as RegionData
      const values = variables.map((varName) => {
        const varInfo = meta.variables[varName]
        if (!varInfo) return ''
        const data = rd[varInfo.code]
        if (data === undefined) return ''
        if (Array.isArray(data)) {
          const last = data[data.length - 1]
          return last === 'NA' ? '' : String(last)
        }
        return data === 'NA' ? '' : String(data)
      })
      rows.push([regionId, ...values].join(separator))
    }
  }

  return rows.join('\n')
}

/** Trigger a browser file download from a string */
export function downloadString(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: `${mimeType}; charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Build the download link URL for the current export settings */
export function buildExportUrl(
  variable: string,
  level: string,
  tableFormat: TableFormat,
  fileFormat: 'csv' | 'tsv'
): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
  const params = new URLSearchParams({
    variable,
    level,
    table_format: tableFormat,
    file_format: fileFormat,
    download: '1',
  })
  return `${window.location.origin}${basePath}/?${params.toString()}`
}
