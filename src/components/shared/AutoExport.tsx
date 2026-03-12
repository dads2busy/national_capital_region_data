'use client'

import { useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useData } from '@/components/DataProvider'
import { generateExport, downloadString } from '@/lib/data/export'
import type { TableFormat, FileFormat, ShapeLevel } from '@/lib/data/types'

const validTableFormats: TableFormat[] = ['tall', 'mixed', 'wide']
const validFileFormats: FileFormat[] = ['csv', 'tsv']

/**
 * Reads URL parameters and auto-triggers a file download when data is ready.
 * Expected params: ?variable=X&level=county&table_format=tall&file_format=csv&download=1
 */
export function AutoExport() {
  const searchParams = useSearchParams()
  const { datasets, loading } = useData()
  const triggered = useRef(false)

  useEffect(() => {
    if (loading || triggered.current) return
    if (searchParams.get('download') !== '1') return

    const variable = searchParams.get('variable')
    const level = (searchParams.get('level') || 'county') as ShapeLevel
    const tableFormat = (searchParams.get('table_format') || 'tall') as TableFormat
    const fileFormat = (searchParams.get('file_format') || 'csv') as FileFormat

    if (!variable) return
    if (!validTableFormats.includes(tableFormat)) return
    if (!validFileFormats.includes(fileFormat)) return

    const dataset = datasets[level]
    if (!dataset) return

    triggered.current = true

    const separator = fileFormat === 'tsv' ? '\t' : ','
    const body = generateExport(
      dataset as unknown as Record<string, unknown>,
      [variable],
      tableFormat,
      separator
    )

    const ext = fileFormat === 'tsv' ? 'tsv' : 'csv'
    const contentType = fileFormat === 'tsv' ? 'text/tab-separated-values' : 'text/csv'
    downloadString(body, `ncr_${level}_${variable}.${ext}`, contentType)
  }, [loading, searchParams, datasets])

  return null
}
