import type { DashboardState } from './index'
import type { ShapeLevel, DatasetName } from '@/lib/data/types'

/**
 * Computed "shapes" variable: determines which geographic level to display.
 * NCR uses a flat layer switcher with partial drill-down for county→tract→block_group.
 */
export const selectShapes = (state: DashboardState): ShapeLevel => {
  // Drill-down: county → tract → block_group
  if (state.selectedTract && state.selectedLayer === 'county') return 'block_group'
  if (state.selectedCounty && state.selectedLayer === 'county') return 'tract'
  // Otherwise show the selected layer
  return state.selectedLayer
}

/**
 * The active dataset name based on the computed shapes level.
 */
export const selectActiveDataset = (state: DashboardState): DatasetName => {
  return selectShapes(state)
}

/**
 * The currently active drill-down region (county or tract selection).
 */
export const selectSelectedRegion = (state: DashboardState): string | null => {
  return state.selectedTract || state.selectedCounty || null
}

/**
 * Color palette based on colorByOrder setting.
 */
export const selectPalette = (state: DashboardState): string => {
  return state.settings.colorByOrder ? 'lajolla' : 'vik'
}
