/** A lookup object keyed by region ID, where each region maps X-codes to values */
export interface DataLookup {
  _meta: DataMeta
  [regionId: string]: RegionData | DataMeta
}

export interface DataMeta {
  time: {
    value: number[]
    name: string
  }
  variables: Record<string, VariableMapping>
}

export interface VariableMapping {
  code: string
  time_range: [number, number]
}

/** Region data: X-code keys mapped to time-series arrays or scalar values */
export interface RegionData {
  [xCode: string]: number | string | (number | string)[]
}

/** Measure info for a single variable */
export interface MeasureInfo {
  category: string
  data_type: string
  long_name: string
  short_name: string
  measure_type: string
  short_description: string
  long_description: string
  statement: string
  type: string
  provenance?: string
  sources: MeasureSource[]
  source_file?: string
}

export interface MeasureSource {
  name: string
  url?: string
  date_accessed?: number | string
}

/** All measure info keyed by variable name */
export interface MeasureInfoMap {
  _references?: Record<string, unknown>
  [variableName: string]: MeasureInfo | Record<string, unknown> | undefined
}

/** Datapackage resource definition */
export interface DatapackageResource {
  name: string
  schema: {
    fields: DatapackageField[]
  }
  bytes?: number
  encoding?: string
  created?: string
}

export interface DatapackageField {
  name: string
  type: string
  time_range: [number, number]
  duplicates?: number
  info?: Record<string, unknown>
  missing?: number
  mean?: number
  sd?: number
  min?: number
  max?: number
}

export interface Datapackage {
  name: string
  title: string
  licence: string
  resources: DatapackageResource[]
  measure_info: MeasureInfoMap
}

/** Statistical summary for a variable at a point in time */
export interface VariableSummary {
  n: number
  missing: number
  min: number
  max: number
  mean: number
  median: number
  q1: number
  q3: number
  iqr: number
  lowerFence: number
  upperFence: number
}

/** GeoJSON types */
export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection'
  features: GeoJSONFeature[]
}

export interface GeoJSONFeature {
  type: 'Feature'
  properties: {
    geoid: string
    name?: string
    region_type?: string
    [key: string]: unknown
  }
  geometry: {
    type: string
    coordinates: unknown
  }
}

/** Entity info from entity_info.json */
export interface EntityEntry {
  name: string
  district?: string
  type?: string
}

export interface EntityInfoMap {
  [geoLevel: string]: {
    [entityId: string]: EntityEntry
  }
}

/** Dataset / geographic level names */
export type DatasetName =
  | 'county'
  | 'tract'
  | 'block_group'
  | 'civic_association'
  | 'zip_code'
  | 'planning_district'
  | 'supervisor_district'
  | 'human_services_region'

/** Geographic shape level (same as DatasetName for NCR) */
export type ShapeLevel = DatasetName

/** Display labels for each geographic level */
export const SHAPE_LABELS: Record<ShapeLevel, string> = {
  county: 'County',
  tract: 'Census Tract',
  block_group: 'Block Group',
  civic_association: 'Civic Association',
  zip_code: 'Zip Code',
  planning_district: 'Planning District',
  supervisor_district: 'Supervisor District',
  human_services_region: 'Human Services Region',
}

/** All shape levels in display order */
export const ALL_SHAPE_LEVELS: ShapeLevel[] = [
  'county',
  'tract',
  'block_group',
  'civic_association',
  'zip_code',
  'planning_district',
  'supervisor_district',
  'human_services_region',
]

/** Export table format */
export type TableFormat = 'tall' | 'mixed' | 'wide'

/** Export file format */
export type FileFormat = 'csv' | 'tsv'

/** Plot type */
export type PlotType = 'scatter' | 'scattergl' | 'bar'

/** Map animation mode */
export type MapAnimation = 'fly' | 'zoom' | 'none'

/** Color scale center mode */
export type ColorScaleCenter = 'none' | 'median' | 'mean'

/** Summary selection level */
export type SummarySelection = 'dataset' | 'filtered' | 'all'

/** Table scroll behavior */
export type ScrollBehavior = 'instant' | 'smooth' | 'auto'

/** Correlation matrix: level → "varA|varB" → Pearson r */
export type CorrelationMatrix = Record<string, Record<string, number>>
