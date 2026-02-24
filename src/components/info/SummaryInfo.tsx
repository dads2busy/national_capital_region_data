'use client'

import { useMemo } from 'react'
import { useDashboardStore } from '@/lib/store'
import { useData } from '@/components/DataProvider'
import { computeSummary } from '@/lib/data/aggregation'

export function SummaryInfo() {
  const selectedVariable = useDashboardStore((s) => s.selectedVariable)
  const selectedYear = useDashboardStore((s) => s.selectedYear)
  const digits = useDashboardStore((s) => s.settings.digits)
  const { activeDataset } = useData()

  const summary = useMemo(() => {
    if (!activeDataset) return null
    const meta = activeDataset._meta
    const timeOffset = selectedYear - meta.time.value[0]
    return computeSummary(activeDataset, selectedVariable, timeOffset)
  }, [activeDataset, selectedVariable, selectedYear])

  if (!summary) {
    return (
      <div className="rounded border p-3 dark:border-gray-700">
        <p className="text-xs text-gray-400">No summary available</p>
      </div>
    )
  }

  const rows = [
    { label: 'N', value: summary.n.toString() },
    { label: 'Missing', value: summary.missing.toString() },
    { label: 'Min', value: summary.min.toFixed(digits) },
    { label: 'Q1', value: summary.q1.toFixed(digits) },
    { label: 'Mean', value: summary.mean.toFixed(digits) },
    { label: 'Median', value: summary.median.toFixed(digits) },
    { label: 'Q3', value: summary.q3.toFixed(digits) },
    { label: 'Max', value: summary.max.toFixed(digits) },
  ]

  const left = rows.slice(0, 4)
  const right = rows.slice(4)

  return (
    <div className="rounded border p-3 dark:border-gray-700">
      <div className="grid grid-cols-2 gap-x-4 text-xs">
        <table className="w-full">
          <tbody>
            {left.map((row) => (
              <tr key={row.label} className="border-b last:border-b-0 dark:border-gray-700">
                <td className="py-0.5 pr-2 text-gray-500">{row.label}</td>
                <td className="py-0.5 text-right font-medium">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <table className="w-full">
          <tbody>
            {right.map((row) => (
              <tr key={row.label} className="border-b last:border-b-0 dark:border-gray-700">
                <td className="py-0.5 pr-2 text-gray-500">{row.label}</td>
                <td className="py-0.5 text-right font-medium">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
