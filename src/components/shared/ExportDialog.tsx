'use client'

import { useState } from 'react'
import { useDashboardStore } from '@/lib/store'
import { useData } from '@/components/DataProvider'
import { selectShapes } from '@/lib/store/selectors'
import { generateExport, downloadString, buildExportUrl } from '@/lib/data/export'
import type { TableFormat, FileFormat } from '@/lib/data/types'

export function ExportDialog() {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
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
    downloadString(body, `ncr_${shapes}_${selectedVariable || 'all'}.${ext}`, contentType)
  }

  const handleCopyLink = () => {
    const url = buildExportUrl(selectedVariable, shapes, exportTableFormat, exportFileFormat)
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
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
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              className="flex-1 rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
            >
              Download
            </button>
            <button
              onClick={handleCopyLink}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>
      )}
      <div className="mt-2 text-xs text-gray-500">
        <a
          href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/data/${selectedVariable}.csv.zip`}
          className="text-blue-600 underline hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          download
        >
          Download full variable (all geographies)
        </a>
      </div>
    </div>
  )
}
