'use client'

import { useMemo } from 'react'
import { useDashboardStore } from '@/lib/store'
import { useData } from '@/components/DataProvider'
import type { MeasureInfo, MeasureInfoMap } from '@/lib/data/types'

/** Find a measure_info entry for a variable, including template-expanded variables */
function findMeasureInfo(measureInfo: MeasureInfoMap, variableName: string): MeasureInfo | null {
  // Direct lookup first
  const direct = measureInfo[variableName]
  if (direct && typeof direct === 'object' && 'short_name' in direct) {
    return direct as MeasureInfo
  }

  // Search template entries
  for (const [pattern, entry] of Object.entries(measureInfo)) {
    if (!pattern.includes('{') || !entry || typeof entry !== 'object' || !('short_name' in entry)) continue

    // Convert template pattern to regex: replace {variant.name}, {variant}, {category.name}, {category} with (.+)
    const regexStr = '^' + pattern.replace(/\{[^}]+\}/g, '(.+)') + '$'
    const match = variableName.match(new RegExp(regexStr))
    if (!match) continue

    return entry as MeasureInfo
  }

  return null
}

export function VariableInfo() {
  const selectedVariable = useDashboardStore((s) => s.selectedVariable)
  const { measureInfo } = useData()

  const info = useMemo((): MeasureInfo | null => {
    if (!measureInfo) return null
    return findMeasureInfo(measureInfo, selectedVariable)
  }, [measureInfo, selectedVariable])

  if (!info) {
    return (
      <div className="rounded border p-3 dark:border-gray-700">
        <p className="text-sm text-gray-400">Select a variable to see details</p>
      </div>
    )
  }

  return (
    <div className="rounded border p-3 dark:border-gray-700">
      <h3 className="mb-1 text-sm font-semibold">{info.short_name || selectedVariable}</h3>
      {info.short_description && (
        <p className="mb-2 text-xs text-gray-600 dark:text-gray-400">{info.short_description}</p>
      )}
      {info.sources && info.sources.length > 0 && (
        <div className="text-xs text-gray-500">
          <span className="font-medium">Source: </span>
          {info.sources.map((s, i) => (
            <span key={i}>
              {s.url ? (
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                  {s.name}
                </a>
              ) : (
                s.name
              )}
              {i < info.sources.length - 1 && ', '}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
