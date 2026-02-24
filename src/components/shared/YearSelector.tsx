'use client'

import { useEffect, useMemo } from 'react'
import { useDashboardStore } from '@/lib/store'
import { useData } from '@/components/DataProvider'

export function YearSelector() {
  const selectedYear = useDashboardStore((s) => s.selectedYear)
  const setSelectedYear = useDashboardStore((s) => s.setSelectedYear)
  const selectedVariable = useDashboardStore((s) => s.selectedVariable)
  const { activeDataset } = useData()

  const { minYear, maxYear } = useMemo(() => {
    if (!activeDataset) return { minYear: 2009, maxYear: 2023 }

    const meta = activeDataset._meta
    const varInfo = meta.variables[selectedVariable]
    if (!varInfo || varInfo.time_range[0] === -1) {
      return { minYear: meta.time.value[0], maxYear: meta.time.value[meta.time.value.length - 1] }
    }

    const [start, end] = varInfo.time_range
    return {
      minYear: meta.time.value[start] ?? meta.time.value[0],
      maxYear: meta.time.value[end] ?? meta.time.value[meta.time.value.length - 1],
    }
  }, [activeDataset, selectedVariable])

  // Clamp selectedYear to the variable's available range when it changes
  useEffect(() => {
    if (selectedYear > maxYear) {
      setSelectedYear(maxYear)
    } else if (selectedYear < minYear) {
      setSelectedYear(minYear)
    }
  }, [selectedYear, minYear, maxYear, setSelectedYear])

  return (
    <div className="flex items-center justify-center gap-2 whitespace-nowrap">
      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Selected Year</label>
      <button
        onClick={() => setSelectedYear(Math.max(minYear, selectedYear - 1))}
        disabled={selectedYear <= minYear}
        className="rounded border px-2 py-0.5 text-sm disabled:opacity-30 dark:border-gray-600"
      >
        &larr;
      </button>
      <input
        type="text"
        inputMode="numeric"
        value={selectedYear}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10)
          if (!isNaN(v) && v >= minYear && v <= maxYear) setSelectedYear(v)
        }}
        className="w-16 rounded border border-gray-300 px-2 py-0.5 text-center text-sm dark:border-gray-600 dark:bg-gray-800"
      />
      <button
        onClick={() => setSelectedYear(Math.min(maxYear, selectedYear + 1))}
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
