'use client'

import { useState } from 'react'
import { useDashboardStore } from '@/lib/store'
import { useData } from '@/components/DataProvider'
import { selectShapes } from '@/lib/store/selectors'
import type { TableFormat, FileFormat } from '@/lib/data/types'

function generateExport(
  dataset: Record<string, unknown>,
  include: string[],
  tableFormat: TableFormat,
  separator: string
): string {
  const meta = dataset._meta as {
    time: { value: number[] }
    variables: Record<string, { code: string; time_range: [number, number] }>
  }
  const rows: string[] = []

  if (tableFormat === 'tall') {
    rows.push(['geoid', 'time', 'variable', 'value'].join(separator))
    for (const [regionId, regionData] of Object.entries(dataset)) {
      if (regionId === '_meta') continue
      const rd = regionData as Record<string, number | string | (number | string)[]>
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
      const rd = regionData as Record<string, number | string | (number | string)[]>
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
      const rd = regionData as Record<string, number | string | (number | string)[]>
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

export function ExportDialog() {
  const [open, setOpen] = useState(false)
  const exportTableFormat = useDashboardStore((s) => s.exportTableFormat)
  const setExportTableFormat = useDashboardStore((s) => s.setExportTableFormat)
  const exportFileFormat = useDashboardStore((s) => s.exportFileFormat)
  const setExportFileFormat = useDashboardStore((s) => s.setExportFileFormat)
  const selectedVariable = useDashboardStore((s) => s.selectedVariable)
  const shapes = useDashboardStore(selectShapes)
  const { activeDataset } = useData()

  const handleDownload = () => {
    if (!activeDataset) return

    const separator = exportFileFormat === 'tsv' ? '\t' : ','
    const body = generateExport(activeDataset as unknown as Record<string, unknown>, [selectedVariable], exportTableFormat, separator)

    const ext = exportFileFormat === 'tsv' ? 'tsv' : 'csv'
    const contentType = exportFileFormat === 'tsv' ? 'text/tab-separated-values' : 'text/csv'
    const blob = new Blob([body], { type: `${contentType}; charset=utf-8` })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ncr_${shapes}_${selectedVariable || 'all'}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
      >
        Download Selected Variable and Geography
      </button>
      {open && (
        <div className="mt-2 rounded border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-2">
            <label className="block text-xs font-medium text-gray-500">Table Format</label>
            <select
              value={exportTableFormat}
              onChange={(e) => setExportTableFormat(e.target.value as TableFormat)}
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-900"
            >
              <option value="tall">Tall</option>
              <option value="mixed">Mixed</option>
              <option value="wide">Wide</option>
            </select>
          </div>
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-500">File Format</label>
            <select
              value={exportFileFormat}
              onChange={(e) => setExportFileFormat(e.target.value as FileFormat)}
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-900"
            >
              <option value="csv">CSV</option>
              <option value="tsv">TSV</option>
            </select>
          </div>
          <button
            onClick={handleDownload}
            className="w-full rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
          >
            Download
          </button>
        </div>
      )}
    </div>
  )
}
