'use client'

import { useDashboardStore } from '@/lib/store'
import { selectShapes } from '@/lib/store/selectors'
import { useData } from '@/components/DataProvider'
import { resolveEntityName } from '@/lib/data/entity-resolver'
import { SHAPE_LABELS } from '@/lib/data/types'

export function DynamicHeading() {
  const shapes = useDashboardStore(selectShapes)
  const selectedLayer = useDashboardStore((s) => s.selectedLayer)
  const selectedCounty = useDashboardStore((s) => s.selectedCounty)
  const selectedTract = useDashboardStore((s) => s.selectedTract)

  const { entityInfo } = useData()

  let heading: string

  if (selectedLayer === 'county' && selectedTract) {
    const tractName = resolveEntityName(entityInfo, selectedTract, 'tract')
    heading = `${tractName} Block Groups`
  } else if (selectedLayer === 'county' && selectedCounty) {
    const countyName = resolveEntityName(entityInfo, selectedCounty, 'county')
    heading = `${countyName} Census Tracts`
  } else {
    const label = SHAPE_LABELS[shapes]
    heading = `National Capital Region (${label}s)`
  }

  return <h1 className="mb-3 text-center text-2xl font-bold">{heading}</h1>
}
