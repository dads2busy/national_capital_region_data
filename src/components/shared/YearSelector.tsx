'use client'

import { useEffect, useMemo } from 'react'
import { useDashboardStore } from '@/lib/store'
import { useData } from '@/components/DataProvider'

/** Get the actual years with data for a variable, using time_indices if available */
function getAvailableYears(
  meta: { time: { value: number[] }; variables: Record<string, { time_range: [number, number]; time_indices?: number[] }> },
  selectedVariable: string,
): number[] {
  const varInfo = meta.variables[selectedVariable]
  if (!varInfo || varInfo.time_range[0] === -1) {
    return [...meta.time.value]
  }

  if (varInfo.time_indices) {
    return varInfo.time_indices.map((i) => meta.time.value[i]).filter((y) => y !== undefined)
  }

  const [start, end] = varInfo.time_range
  const result: number[] = []
  for (let i = start; i <= end; i++) {
    if (i < meta.time.value.length) result.push(meta.time.value[i])
  }
  return result
}

export function YearSelector() {
  const selectedYear = useDashboardStore((s) => s.selectedYear)
  const setSelectedYear = useDashboardStore((s) => s.setSelectedYear)
  const selectedVariable = useDashboardStore((s) => s.selectedVariable)
  const { activeDataset } = useData()

  const availableYears = useMemo(() => {
    if (!activeDataset) return [2009, 2023]
    return getAvailableYears(activeDataset._meta, selectedVariable)
  }, [activeDataset, selectedVariable])

  const minYear = availableYears[0]
  const maxYear = availableYears[availableYears.length - 1]

  // Clamp selectedYear to available years when variable changes
  useEffect(() => {
    if (availableYears.length === 0) return
    if (!availableYears.includes(selectedYear)) {
      // Snap to nearest available year
      const nearest = availableYears.reduce((prev, curr) =>
        Math.abs(curr - selectedYear) < Math.abs(prev - selectedYear) ? curr : prev,
      )
      setSelectedYear(nearest)
    }
  }, [selectedYear, availableYears, setSelectedYear])

  const goToPrev = () => {
    const idx = availableYears.indexOf(selectedYear)
    if (idx > 0) {
      setSelectedYear(availableYears[idx - 1])
    } else if (idx === -1) {
      // Current year not in list, find the closest year less than current
      const prev = availableYears.filter((y) => y < selectedYear)
      if (prev.length > 0) setSelectedYear(prev[prev.length - 1])
    }
  }

  const goToNext = () => {
    const idx = availableYears.indexOf(selectedYear)
    if (idx >= 0 && idx < availableYears.length - 1) {
      setSelectedYear(availableYears[idx + 1])
    } else if (idx === -1) {
      const next = availableYears.filter((y) => y > selectedYear)
      if (next.length > 0) setSelectedYear(next[0])
    }
  }

  return (
    <div className="flex items-center justify-center gap-2 whitespace-nowrap">
      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Selected Year</label>
      <button
        data-testid="year-prev"
        onClick={goToPrev}
        disabled={selectedYear <= minYear}
        className="rounded border px-2 py-0.5 text-sm disabled:opacity-30 dark:border-gray-600"
      >
        &larr;
      </button>
      <input
        data-testid="year-input"
        type="text"
        inputMode="numeric"
        value={selectedYear}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10)
          if (!isNaN(v) && availableYears.includes(v)) setSelectedYear(v)
        }}
        className="w-16 rounded border border-gray-300 px-2 py-0.5 text-center text-sm dark:border-gray-600 dark:bg-gray-800"
      />
      <button
        data-testid="year-next"
        onClick={goToNext}
        disabled={selectedYear >= maxYear}
        className="rounded border px-2 py-0.5 text-sm disabled:opacity-30 dark:border-gray-600"
      >
        &rarr;
      </button>
      <span className="text-xs text-gray-400">
        {minYear}–{maxYear}
      </span>
    </div>
  )
}
