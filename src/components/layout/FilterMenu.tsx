'use client'

import { useMemo } from 'react'
import { useDashboardStore } from '@/lib/store'
import { selectShapes } from '@/lib/store/selectors'
import { useData } from '@/components/DataProvider'
import { resolveVariables, groupByCategory } from '@/lib/data/measure-info-resolver'
import { resolveEntityName } from '@/lib/data/entity-resolver'
import { ALL_SHAPE_LEVELS, SHAPE_LABELS } from '@/lib/data/types'
import type { ShapeLevel } from '@/lib/data/types'
import { VariableDropdown } from '@/components/shared/VariableDropdown'

export function FilterMenu() {
  const filterOpen = useDashboardStore((s) => s.filterOpen)
  const selectedLayer = useDashboardStore((s) => s.selectedLayer)
  const setSelectedLayer = useDashboardStore((s) => s.setSelectedLayer)
  const selectedCounty = useDashboardStore((s) => s.selectedCounty)
  const setSelectedCounty = useDashboardStore((s) => s.setSelectedCounty)
  const selectedTract = useDashboardStore((s) => s.selectedTract)
  const setSelectedTract = useDashboardStore((s) => s.setSelectedTract)
  const selectedVariable = useDashboardStore((s) => s.selectedVariable)
  const setSelectedVariable = useDashboardStore((s) => s.setSelectedVariable)
  const shapes = useDashboardStore(selectShapes)

  const { datasets, measureInfo, entityInfo, availableLevels } = useData()

  // County IDs for the drill-down dropdown
  const countyIds = useMemo(() => {
    const county = datasets.county
    if (!county) return []
    return Object.keys(county)
      .filter((k) => k !== '_meta')
      .sort()
  }, [datasets])

  // Tract IDs for the drill-down dropdown (shown only when a county is selected)
  const tractIds = useMemo(() => {
    const tract = datasets.tract
    if (!tract) return []
    return Object.keys(tract)
      .filter((k) => k !== '_meta')
      .sort()
  }, [datasets])

  // Variable options grouped by category
  const variableOptions = useMemo(() => {
    const county = datasets.county
    if (!measureInfo || !county) return []
    const varNames = Object.keys(county._meta.variables)
    const resolved = resolveVariables(measureInfo, varNames)
    return groupByCategory(resolved)
  }, [measureInfo, datasets])

  if (!filterOpen) return null

  return (
    <div data-testid="filter-menu" className="border-b border-slate-700 px-4 py-3" style={{ backgroundColor: 'var(--surface-dark)' }}>
      <div className="flex flex-wrap items-end gap-4">
        {/* Geographic Layer */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">Geographic Layer</label>
          <select
            data-testid="layer-select"
            value={shapes}
            onChange={(e) => setSelectedLayer(e.target.value as ShapeLevel)}
            className="rounded border border-slate-600 bg-slate-700 px-3 py-1 text-sm text-slate-200"
          >
            {ALL_SHAPE_LEVELS.map((level) => (
              <option key={level} value={level} disabled={!availableLevels[level]}>
                {SHAPE_LABELS[level]}{!availableLevels[level] ? ' (no data)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* County drill-down (only when layer is county) */}
        {selectedLayer === 'county' && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">County</label>
            <select
              value={selectedCounty || ''}
              onChange={(e) => setSelectedCounty(e.target.value || null)}
              className="rounded border border-slate-600 bg-slate-700 px-3 py-1 text-sm text-slate-200"
            >
              <option value="">All Counties</option>
              {countyIds.map((id) => (
                <option key={id} value={id}>
                  {resolveEntityName(entityInfo, id, 'county')}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Tract drill-down (only when a county is selected) */}
        {selectedLayer === 'county' && selectedCounty && (
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Census Tract</label>
            <select
              value={selectedTract || ''}
              onChange={(e) => setSelectedTract(e.target.value || null)}
              className="rounded border border-slate-600 bg-slate-700 px-3 py-1 text-sm text-slate-200"
            >
              <option value="">All Tracts</option>
              {tractIds.map((id) => (
                <option key={id} value={id}>
                  {resolveEntityName(entityInfo, id, 'tract')}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Variable */}
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-400">Variable</label>
          <VariableDropdown
            value={selectedVariable}
            onChange={setSelectedVariable}
            options={variableOptions}
          />
        </div>
      </div>
    </div>
  )
}
