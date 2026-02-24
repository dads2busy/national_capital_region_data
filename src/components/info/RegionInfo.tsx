'use client'

import { useMemo } from 'react'
import { useDashboardStore } from '@/lib/store'
import { selectShapes } from '@/lib/store/selectors'
import { useData } from '@/components/DataProvider'
import { getValueAtTime } from '@/lib/data/aggregation'
import { resolveEntityName } from '@/lib/data/entity-resolver'
import { SHAPE_LABELS } from '@/lib/data/types'
import type { MeasureInfo, MeasureInfoMap } from '@/lib/data/types'

function findMeasureInfo(measureInfo: MeasureInfoMap, variableName: string): MeasureInfo | null {
  const direct = measureInfo[variableName]
  if (direct && typeof direct === 'object' && 'short_name' in direct) {
    return direct as MeasureInfo
  }
  for (const [pattern, entry] of Object.entries(measureInfo)) {
    if (!pattern.includes('{') || !entry || typeof entry !== 'object' || !('short_name' in entry)) continue
    const regexStr = '^' + pattern.replace(/\{[^}]+\}/g, '(.+)') + '$'
    if (variableName.match(new RegExp(regexStr))) return entry as MeasureInfo
  }
  return null
}

export function RegionInfo() {
  const hoveredRegionId = useDashboardStore((s) => s.hoveredRegionId)
  const hoveredRegionName = useDashboardStore((s) => s.hoveredRegionName)
  const selectedRegionId = useDashboardStore((s) => s.selectedRegionId)
  const selectedVariable = useDashboardStore((s) => s.selectedVariable)
  const selectedYear = useDashboardStore((s) => s.selectedYear)
  const digits = useDashboardStore((s) => s.settings.digits)
  const shapes = useDashboardStore(selectShapes)
  const { activeDataset, measureInfo, entityInfo } = useData()

  const shapeLabel = SHAPE_LABELS[shapes] || shapes

  const regionId = hoveredRegionId || selectedRegionId

  const displayName = useMemo(() => {
    if (!regionId) return null
    if (hoveredRegionName) return hoveredRegionName
    return resolveEntityName(entityInfo, regionId, shapes)
  }, [regionId, hoveredRegionName, entityInfo, shapes])

  const { value, statement } = useMemo(() => {
    if (!regionId || !activeDataset) return { value: null, statement: null }

    const meta = activeDataset._meta
    const varInfo = meta.variables[selectedVariable]
    if (!varInfo) return { value: null, statement: null }

    const timeOffset = selectedYear - meta.time.value[0]
    const regionData = activeDataset[regionId]
    if (!regionData || regionId === '_meta') return { value: null, statement: null }

    const val = getValueAtTime(
      regionData as Record<string, number | string | (number | string)[]>,
      varInfo.code,
      timeOffset,
      varInfo.time_range[0]
    )

    // Build statement from template
    let stmt: string | null = null
    if (measureInfo) {
      const mi = findMeasureInfo(measureInfo, selectedVariable)
      if (mi?.statement) {
        stmt = mi.statement
          .replace('{features.name}', displayName || regionId)
          .replace('{value}', val !== null ? val.toFixed(digits) : 'NA')
      }
    }

    return { value: val, statement: stmt }
  }, [regionId, activeDataset, selectedVariable, selectedYear, measureInfo, digits, displayName])

  if (!regionId) {
    return (
      <div className="rounded border p-3 dark:border-gray-700">
        <h4 className="mb-1 text-sm font-semibold">National Capital Region</h4>
        <p className="text-xs text-gray-500">Hover over or select a region for more information.</p>
      </div>
    )
  }

  return (
    <div className="rounded border p-3 dark:border-gray-700">
      <h4 className="mb-1 text-sm font-semibold">
        {shapeLabel}: {displayName ? `${displayName} (${regionId})` : regionId}
      </h4>
      <div className="text-xs">
        <div className="flex justify-between">
          <span className="text-gray-500">{selectedVariable}</span>
          <span className="font-medium">{value !== null ? value.toFixed(digits) : 'NA'}</span>
        </div>
        {statement && <p className="mt-1 text-gray-600 dark:text-gray-400">{statement}</p>}
      </div>
    </div>
  )
}
