'use client'

import { createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from 'react'
import { loadInitialData, loadDataset, isDatasetCached } from '@/lib/data/loader'
import { useDashboardStore } from '@/lib/store'
import { selectShapes } from '@/lib/store/selectors'
import type { DataLookup, MeasureInfoMap, Datapackage, EntityInfoMap, ShapeLevel, DatasetName, CorrelationMatrix } from '@/lib/data/types'

/** Check if a variable has data at a given level using the datapackage metadata */
function variableAvailableAtLevel(
  datapackage: Datapackage | null,
  variableName: string,
  level: ShapeLevel
): boolean {
  if (!datapackage) return true
  const resource = datapackage.resources.find((r) => r.name === level)
  if (!resource) return false
  const field = resource.schema.fields.find((f) => f.name === variableName)
  if (!field) return false
  return field.time_range[0] !== -1
}

export type AvailableLevels = Record<ShapeLevel, boolean>

interface DataContextValue {
  datasets: Record<string, DataLookup | null>
  measureInfo: MeasureInfoMap | null
  datapackage: Datapackage | null
  entityInfo: EntityInfoMap | null
  loading: boolean
  error: string | null
  activeDataset: DataLookup | null
  availableLevels: AvailableLevels
  narratives: Record<string, string>
  correlations: CorrelationMatrix
  regionNameMap: Record<string, string>
}

const defaultAvailableLevels: AvailableLevels = {
  county: true,
  tract: true,
  block_group: true,
  civic_association: true,
  zip_code: true,
  planning_district: true,
  supervisor_district: true,
  human_services_region: true,
}

const DataContext = createContext<DataContextValue>({
  datasets: {},
  measureInfo: null,
  datapackage: null,
  entityInfo: null,
  loading: true,
  error: null,
  activeDataset: null,
  availableLevels: defaultAvailableLevels,
  narratives: {},
  correlations: {},
  regionNameMap: {},
})

export function useData() {
  return useContext(DataContext)
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [datasets, setDatasets] = useState<Record<string, DataLookup | null>>({})
  const [measureInfo, setMeasureInfo] = useState<MeasureInfoMap | null>(null)
  const [datapackage, setDatapackage] = useState<Datapackage | null>(null)
  const [entityInfo, setEntityInfo] = useState<EntityInfoMap | null>(null)
  const [narratives, setNarratives] = useState<Record<string, string>>({})
  const [correlations, setCorrelations] = useState<CorrelationMatrix>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const shapes = useDashboardStore(selectShapes)
  const selectedVariable = useDashboardStore((s) => s.selectedVariable)
  const selectedLayer = useDashboardStore((s) => s.selectedLayer)
  const setSelectedLayer = useDashboardStore((s) => s.setSelectedLayer)

  // Load initial data (county + metadata)
  useEffect(() => {
    loadInitialData()
      .then((data) => {
        setDatasets({ county: data.county })
        setMeasureInfo(data.measureInfo)
        setDatapackage(data.datapackage)
        setEntityInfo(data.entityInfo)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })

    // Load optional data (narratives + correlations) — non-blocking
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
    fetch(`${basePath}/data/narratives.json`).then((r) => (r.ok ? r.json() : {})).then(setNarratives).catch(() => {})
    fetch(`${basePath}/data/correlations.json`).then((r) => (r.ok ? r.json() : {})).then(setCorrelations).catch(() => {})
  }, [])

  // Lazy-load datasets when their layer is selected
  useEffect(() => {
    const needed = shapes as DatasetName
    if (!datasets[needed] && !isDatasetCached(needed)) {
      loadDataset(needed)
        .then((data) => {
          setDatasets((prev) => ({ ...prev, [needed]: data }))
        })
        .catch((err) => setError(err.message))
    }
  }, [shapes, datasets])

  // Compute which geographic levels have data for the selected variable
  const availableLevels = useMemo((): AvailableLevels => {
    const levels: ShapeLevel[] = [
      'county', 'tract', 'block_group', 'civic_association',
      'zip_code', 'planning_district', 'supervisor_district', 'human_services_region',
    ]
    const result = {} as AvailableLevels
    for (const level of levels) {
      result[level] = variableAvailableAtLevel(datapackage, selectedVariable, level)
    }
    return result
  }, [datapackage, selectedVariable])

  // Auto-switch layer when the selected variable is not available at the current level
  useEffect(() => {
    if (loading) return
    if (availableLevels[selectedLayer]) return

    const preferred: ShapeLevel[] = ['county', 'tract', 'block_group']
    for (const level of preferred) {
      if (availableLevels[level]) {
        setSelectedLayer(level)
        return
      }
    }
  }, [availableLevels, selectedLayer, setSelectedLayer, loading])

  // Determine the active dataset based on current shape level
  const activeDataset = datasets[shapes] || null

  // Build regionNameMap from entityInfo
  const regionNameMap = useMemo(() => {
    if (!entityInfo) return {}
    const map: Record<string, string> = {}
    for (const level of Object.values(entityInfo)) {
      for (const [id, entry] of Object.entries(level)) {
        if (!map[id]) map[id] = entry.name
      }
    }
    return map
  }, [entityInfo])

  return (
    <DataContext.Provider
      value={{ datasets, measureInfo, datapackage, entityInfo, loading, error, activeDataset, availableLevels, narratives, correlations, regionNameMap }}
    >
      {children}
    </DataContext.Provider>
  )
}
