import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  ShapeLevel,
  PlotType,
  MapAnimation,
  ColorScaleCenter,
  SummarySelection,
  ScrollBehavior,
  TableFormat,
  FileFormat,
} from '@/lib/data/types'

export interface DashboardSettings {
  themeDark: boolean
  colorByOrder: boolean
  colorScaleCenter: ColorScaleCenter
  hideUrlParameters: boolean
  hideTooltips: boolean
  showEmptyTimes: boolean
  digits: number
  summarySelection: SummarySelection
  mapAnimations: MapAnimation
  backgroundTop: boolean
  polygonOutline: number
  backgroundPolygonOutline: number
  circleRadius: number
  circleProperty: string
  plotType: PlotType
  boxplots: boolean
  iqrBox: boolean
  traceLimit: number
  tableAutosort: boolean
  tableAutoscroll: boolean
  tableScrollBehavior: ScrollBehavior
  tracking: boolean
}

export interface DashboardState {
  // Primary inputs — flat layer switcher with partial drill-down
  selectedLayer: ShapeLevel
  selectedCounty: string | null // county → tract drill-down
  selectedTract: string | null // tract → block_group drill-down
  selectedVariable: string
  selectedYear: number

  // Settings (persisted to localStorage)
  settings: DashboardSettings

  // Interaction state
  hoveredRegionId: string | null
  hoveredRegionName: string | null
  selectedRegionId: string | null

  // Export settings
  exportTableFormat: TableFormat
  exportFileFormat: FileFormat

  // Filter menu visibility
  filterOpen: boolean

  // Chat
  chatOpen: boolean
  chatMessages: { role: 'user' | 'model'; text: string }[]

  // Actions
  setSelectedLayer: (layer: ShapeLevel) => void
  setSelectedCounty: (id: string | null) => void
  setSelectedTract: (id: string | null) => void
  setSelectedVariable: (variable: string) => void
  setSelectedYear: (year: number) => void
  setSetting: <K extends keyof DashboardSettings>(key: K, value: DashboardSettings[K]) => void
  setHoveredRegionId: (id: string | null, name?: string | null) => void
  setSelectedRegionId: (id: string | null) => void
  setExportTableFormat: (format: TableFormat) => void
  setExportFileFormat: (format: FileFormat) => void
  setFilterOpen: (open: boolean) => void
  setChatOpen: (open: boolean) => void
  addChatMessage: (msg: { role: 'user' | 'model'; text: string }) => void
  clearChatMessages: () => void
  resetSelection: () => void
}

const defaultSettings: DashboardSettings = {
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

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      // Primary inputs
      selectedLayer: 'county',
      selectedCounty: null,
      selectedTract: null,
      selectedVariable: 'perc_above_25_3_geo20',
      selectedYear: 2023,

      // Settings
      settings: defaultSettings,

      // Interaction
      hoveredRegionId: null,
      hoveredRegionName: null,
      selectedRegionId: null,

      // Export
      exportTableFormat: 'mixed',
      exportFileFormat: 'csv',

      // Filter
      filterOpen: true,

      // Chat
      chatOpen: false,
      chatMessages: [],

      // Actions
      setSelectedLayer: (selectedLayer) =>
        set({
          selectedLayer,
          selectedCounty: null,
          selectedTract: null,
          selectedRegionId: null,
          hoveredRegionId: null,
        }),
      setSelectedCounty: (selectedCounty) =>
        set({ selectedCounty, selectedTract: null, selectedRegionId: selectedCounty }),
      setSelectedTract: (selectedTract) =>
        set({ selectedTract, selectedRegionId: selectedTract }),
      setSelectedVariable: (selectedVariable) => set({ selectedVariable }),
      setSelectedYear: (selectedYear) => set({ selectedYear }),
      setSetting: (key, value) =>
        set((state) => ({
          settings: { ...state.settings, [key]: value },
        })),
      setHoveredRegionId: (hoveredRegionId, name) => set({ hoveredRegionId, hoveredRegionName: name ?? null }),
      setSelectedRegionId: (id) => set({ selectedRegionId: id }),
      setExportTableFormat: (exportTableFormat) => set({ exportTableFormat }),
      setExportFileFormat: (exportFileFormat) => set({ exportFileFormat }),
      setFilterOpen: (filterOpen) => set({ filterOpen }),
      setChatOpen: (chatOpen) => set({ chatOpen }),
      addChatMessage: (msg) => set((state) => ({ chatMessages: [...state.chatMessages, msg] })),
      clearChatMessages: () => set({ chatMessages: [] }),
      resetSelection: () =>
        set({
          selectedCounty: null,
          selectedTract: null,
          selectedRegionId: null,
          hoveredRegionId: null,
        }),
    }),
    {
      name: 'ncr-dashboard-settings',
      partialize: (state) => ({ settings: state.settings }),
    }
  )
)
