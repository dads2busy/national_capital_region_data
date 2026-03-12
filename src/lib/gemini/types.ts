export interface ChatMessage {
  role: 'user' | 'model'
  text: string
}

export interface LevelSummary {
  level: string
  n: number
  min: number
  max: number
  mean: number
  median: number
  q1: number
  q3: number
  topRegions: { id: string; value: number }[]
  bottomRegions: { id: string; value: number }[]
}

export interface GeminiContext {
  variableName: string
  variableLabel: string
  category: string
  description: string
  sources: string
  statement: string
  currentLevel: string
  year: number
  selectedRegion: string | null
  levelSummaries: LevelSummary[]
  selectedRegionTimeSeries: { year: number; value: number }[] | null
  narrative: string | null
  variableDirectory: string
  correlationSummary: string
  countyDataCsv: string
  tractDataCsv: string
}
