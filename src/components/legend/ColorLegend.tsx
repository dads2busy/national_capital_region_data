'use client'

import { useMemo } from 'react'
import { useDashboardStore } from '@/lib/store'
import { selectPalette } from '@/lib/store/selectors'
import { useData } from '@/components/DataProvider'
import { computeSummary } from '@/lib/data/aggregation'
import { getPalette } from '@/lib/color/palettes'
import { getNAColor } from '@/lib/color/scale'

export function ColorLegend() {
  const selectedVariable = useDashboardStore((s) => s.selectedVariable)
  const selectedYear = useDashboardStore((s) => s.selectedYear)
  const digits = useDashboardStore((s) => s.settings.digits)
  const themeDark = useDashboardStore((s) => s.settings.themeDark)
  const paletteName = useDashboardStore(selectPalette)

  const { activeDataset } = useData()

  const { summary, palette } = useMemo(() => {
    const pal = getPalette(paletteName)
    if (!activeDataset) return { summary: null, palette: pal }

    const meta = activeDataset._meta
    const timeOffset = selectedYear - meta.time.value[0]
    const summ = computeSummary(activeDataset, selectedVariable, timeOffset)

    return { summary: summ, palette: pal }
  }, [activeDataset, selectedVariable, selectedYear, paletteName])

  if (!summary) {
    return (
      <div className="rounded border p-3 text-center text-sm text-gray-400 dark:border-gray-700">
        No data for legend
      </div>
    )
  }

  const gradientColors = palette.map((c, i) => `${c} ${(i / (palette.length - 1)) * 100}%`).join(', ')

  return (
    <div className="rounded border p-3 dark:border-gray-700">
      {/* Gradient bar */}
      <div
        className="h-4 w-full rounded"
        style={{ background: `linear-gradient(to right, ${gradientColors})` }}
      />

      {/* Tick labels */}
      <div className="mt-1 flex justify-between text-xs text-gray-600 dark:text-gray-400">
        <span>{summary.min.toFixed(digits)}</span>
        <span>{summary.q1.toFixed(digits)}</span>
        <span>{summary.median.toFixed(digits)}</span>
        <span>{summary.q3.toFixed(digits)}</span>
        <span>{summary.max.toFixed(digits)}</span>
      </div>

      {/* Labels */}
      <div className="mt-0.5 flex justify-between text-[10px] text-gray-400">
        <span>min</span>
        <span>Q1</span>
        <span>median</span>
        <span>Q3</span>
        <span>max</span>
      </div>

      {/* NA swatch */}
      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
        <div className="h-3 w-3 rounded" style={{ backgroundColor: getNAColor(themeDark) }} />
        <span>NA / Missing</span>
      </div>
    </div>
  )
}
