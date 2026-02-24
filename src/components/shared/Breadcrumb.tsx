'use client'

import { useDashboardStore } from '@/lib/store'
import { useData } from '@/components/DataProvider'
import { resolveEntityName } from '@/lib/data/entity-resolver'
import { SHAPE_LABELS } from '@/lib/data/types'

export function Breadcrumb() {
  const selectedLayer = useDashboardStore((s) => s.selectedLayer)
  const selectedCounty = useDashboardStore((s) => s.selectedCounty)
  const selectedTract = useDashboardStore((s) => s.selectedTract)
  const resetSelection = useDashboardStore((s) => s.resetSelection)
  const setSelectedTract = useDashboardStore((s) => s.setSelectedTract)

  const { entityInfo } = useData()

  const isDrillDown = selectedLayer === 'county'
  const atCountyLevel = isDrillDown && !selectedCounty && !selectedTract
  const atTractLevel = isDrillDown && selectedCounty && !selectedTract
  const atBlockGroupLevel = isDrillDown && selectedCounty && selectedTract

  const countyName = selectedCounty
    ? resolveEntityName(entityInfo, selectedCounty, 'county')
    : null
  const tractName = selectedTract
    ? resolveEntityName(entityInfo, selectedTract, 'tract')
    : null

  // For non-county layers, show a simple label
  if (!isDrillDown) {
    return (
      <nav className="mb-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
        <span className="font-medium text-gray-700 dark:text-gray-200">
          {SHAPE_LABELS[selectedLayer]}
        </span>
      </nav>
    )
  }

  return (
    <nav className="mb-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
      {/* County level */}
      <span
        className={
          atCountyLevel
            ? 'font-medium text-gray-700 dark:text-gray-200'
            : 'cursor-pointer text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300'
        }
        onClick={atCountyLevel ? undefined : resetSelection}
      >
        {SHAPE_LABELS.county}
      </span>

      {/* Tract level */}
      {(atTractLevel || atBlockGroupLevel) && (
        <>
          <span className="text-gray-400 dark:text-gray-500">&gt;</span>
          <span
            className={
              atTractLevel
                ? 'font-medium text-gray-700 dark:text-gray-200'
                : 'cursor-pointer text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300'
            }
            onClick={atTractLevel ? undefined : () => setSelectedTract(null)}
          >
            {countyName} {SHAPE_LABELS.tract}s
          </span>
        </>
      )}

      {/* Block group level */}
      {atBlockGroupLevel && (
        <>
          <span className="text-gray-400 dark:text-gray-500">&gt;</span>
          <span className="font-medium text-gray-700 dark:text-gray-200">
            {tractName} {SHAPE_LABELS.block_group}s
          </span>
        </>
      )}
    </nav>
  )
}
