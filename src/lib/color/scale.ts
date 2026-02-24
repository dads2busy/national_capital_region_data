import { getPalette } from './palettes'
import type { VariableSummary, ColorScaleCenter } from '@/lib/data/types'

/**
 * Compute a color for a value using a palette, optional centering, and optional rank mode.
 */
export function valueToColor(
  value: number,
  summary: VariableSummary,
  paletteName: string,
  center: ColorScaleCenter = 'none',
  byRank: boolean = false,
  sortedValues?: number[]
): string {
  const palette = getPalette(paletteName)
  const steps = palette.length

  if (byRank && sortedValues) {
    // Color by rank position in the sorted array
    const rank = sortedValues.indexOf(value)
    if (rank === -1) return palette[0]
    const t = sortedValues.length > 1 ? rank / (sortedValues.length - 1) : 0.5
    const idx = Math.min(Math.floor(t * steps), steps - 1)
    return palette[idx]
  }

  const { min, max, median, mean: meanVal } = summary

  if (min === max) return palette[Math.floor(steps / 2)]

  let t: number

  if (center === 'median') {
    t = centerScale(value, min, max, median, steps)
  } else if (center === 'mean') {
    t = centerScale(value, min, max, meanVal, steps)
  } else {
    // Linear scale from min to max
    t = (value - min) / (max - min)
  }

  const idx = Math.max(0, Math.min(Math.floor(t * steps), steps - 1))
  return palette[idx]
}

/**
 * Center a scale on a specific value.
 * Values below center use the lower half of the palette,
 * values above center use the upper half.
 */
function centerScale(value: number, min: number, max: number, center: number, steps: number): number {
  const mid = (steps - 1) / 2

  if (value <= center) {
    if (center === min) return mid / (steps - 1)
    const t = (value - min) / (center - min)
    return (t * mid) / (steps - 1)
  } else {
    if (center === max) return mid / (steps - 1)
    const t = (value - center) / (max - center)
    return (mid + t * mid) / (steps - 1)
  }
}

/**
 * Get the NA color (gray).
 */
export function getNAColor(dark: boolean = false): string {
  return dark ? '#555555' : '#cccccc'
}
