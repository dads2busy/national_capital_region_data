import type { DashboardSettings } from '@/lib/store'

/** Default settings matching docs/settings.json */
export const defaultSettings: DashboardSettings = {
  themeDark: false,
  colorByOrder: false,
  colorScaleCenter: 'none',
  hideUrlParameters: false,
  hideTooltips: false,
  showEmptyTimes: false,
  digits: 2,
  summarySelection: 'dataset',
  mapAnimations: 'fly',
  backgroundTop: false,
  polygonOutline: 1.5,
  backgroundPolygonOutline: 2,
  circleRadius: 7,
  circleProperty: '',
  plotType: 'scatter',
  boxplots: true,
  iqrBox: true,
  traceLimit: 20,
  tableAutosort: true,
  tableAutoscroll: true,
  tableScrollBehavior: 'smooth',
  tracking: false,
}
