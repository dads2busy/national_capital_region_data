import type { DataLookup, VariableSummary } from './types'

/**
 * Get the numeric value for a variable at a specific time offset for a region.
 */
export function getValueAtTime(
  regionData: Record<string, number | string | (number | string)[]>,
  xCode: string,
  timeOffset: number,
  rangeStart: number
): number | null {
  const raw = regionData[xCode]
  if (raw === undefined) return null

  if (Array.isArray(raw)) {
    const idx = timeOffset - rangeStart
    if (idx < 0 || idx >= raw.length) return null
    const val = raw[idx]
    return typeof val === 'number' ? val : null
  }

  // Scalar value — return it if the time offset matches (single data point)
  return typeof raw === 'number' ? raw : null
}

/**
 * Get all values for a variable across all time points for a region.
 */
export function getAllValues(
  regionData: Record<string, number | string | (number | string)[]>,
  xCode: string
): (number | null)[] {
  const raw = regionData[xCode]
  if (raw === undefined) return []

  if (Array.isArray(raw)) {
    return raw.map((v) => (typeof v === 'number' ? v : null))
  }

  return [typeof raw === 'number' ? raw : null]
}

/**
 * Compute the statistical summary for a variable at a specific time across all entities.
 */
export function computeSummary(
  dataset: DataLookup,
  variableName: string,
  timeOffset: number,
  filterFn?: (regionId: string) => boolean
): VariableSummary | null {
  const meta = dataset._meta
  const varInfo = meta.variables[variableName]
  if (!varInfo) return null

  const { code: xCode, time_range: [rangeStart, rangeEnd] } = varInfo

  if (rangeStart === -1 || timeOffset < rangeStart || timeOffset > rangeEnd) return null

  const values: number[] = []
  let missing = 0

  for (const [regionId, regionData] of Object.entries(dataset)) {
    if (regionId === '_meta') continue
    if (filterFn && !filterFn(regionId)) continue

    const val = getValueAtTime(
      regionData as Record<string, number | string | (number | string)[]>,
      xCode,
      timeOffset,
      rangeStart
    )
    if (val !== null) {
      values.push(val)
    } else {
      missing++
    }
  }

  if (values.length === 0) return null

  values.sort((a, b) => a - b)

  const n = values.length
  const sum = values.reduce((a, b) => a + b, 0)
  const meanVal = sum / n

  const medianVal = n % 2 === 0 ? (values[n / 2 - 1] + values[n / 2]) / 2 : values[Math.floor(n / 2)]

  const q1 = quantile(values, 0.25)
  const q3 = quantile(values, 0.75)
  const iqr = q3 - q1

  return {
    n,
    missing,
    min: values[0],
    max: values[n - 1],
    mean: meanVal,
    median: medianVal,
    q1,
    q3,
    iqr,
    lowerFence: Math.max(values[0], q1 - 1.5 * iqr),
    upperFence: Math.min(values[n - 1], q3 + 1.5 * iqr),
  }
}

/**
 * Compute a quantile using linear interpolation.
 * Assumes values is already sorted ascending.
 */
function quantile(sorted: number[], p: number): number {
  const n = sorted.length
  if (n === 0) return 0
  if (n === 1) return sorted[0]

  const idx = (n - 1) * p
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  const frac = idx - lo

  if (lo === hi) return sorted[lo]
  return sorted[lo] * (1 - frac) + sorted[hi] * frac
}

/**
 * Get all region values for a variable at a specific time, suitable for coloring.
 */
export function getRegionValues(
  dataset: DataLookup,
  variableName: string,
  timeOffset: number,
  filterFn?: (regionId: string) => boolean
): Map<string, number> {
  const meta = dataset._meta
  const varInfo = meta.variables[variableName]
  if (!varInfo) return new Map()

  const { code: xCode, time_range: [rangeStart] } = varInfo
  const result = new Map<string, number>()

  for (const [regionId, regionData] of Object.entries(dataset)) {
    if (regionId === '_meta') continue
    if (filterFn && !filterFn(regionId)) continue

    const val = getValueAtTime(
      regionData as Record<string, number | string | (number | string)[]>,
      xCode,
      timeOffset,
      rangeStart
    )
    if (val !== null) {
      result.set(regionId, val)
    }
  }

  return result
}
