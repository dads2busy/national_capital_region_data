'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useDashboardStore } from '@/lib/store'
import { selectShapes, selectPalette } from '@/lib/store/selectors'
import { useData } from '@/components/DataProvider'
import { getAllValues, computeSummary } from '@/lib/data/aggregation'
import { valueToColor, getNAColor } from '@/lib/color/scale'
import type { DataLookup } from '@/lib/data/types'

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

export function TimeSeriesPlot() {
  const selectedVariable = useDashboardStore((s) => s.selectedVariable)
  const selectedYear = useDashboardStore((s) => s.selectedYear)
  const plotType = useDashboardStore((s) => s.settings.plotType)
  const boxplots = useDashboardStore((s) => s.settings.boxplots)
  const iqrBox = useDashboardStore((s) => s.settings.iqrBox)
  const traceLimit = useDashboardStore((s) => s.settings.traceLimit)
  const themeDark = useDashboardStore((s) => s.settings.themeDark)
  const hoveredRegionId = useDashboardStore((s) => s.hoveredRegionId)
  const paletteName = useDashboardStore(selectPalette)
  const shapes = useDashboardStore(selectShapes)

  const { activeDataset } = useData()

  const { traces, years } = useMemo(() => {
    if (!activeDataset) return { traces: [], years: [] as number[] }

    const meta = activeDataset._meta
    const varInfo = meta.variables[selectedVariable]
    if (!varInfo || varInfo.time_range[0] === -1)
      return { traces: [], years: [] as number[] }

    const [rangeStart, rangeEnd] = varInfo.time_range
    const timeValues = meta.time.value.slice(rangeStart, rangeEnd + 1)

    // Collect all region time series
    const regionSeries: { id: string; values: (number | null)[] }[] = []
    for (const [regionId, regionData] of Object.entries(activeDataset)) {
      if (regionId === '_meta') continue
      const vals = getAllValues(
        regionData as Record<string, number | string | (number | string)[]>,
        varInfo.code
      )
      regionSeries.push({ id: regionId, values: vals })
    }

    // Sort by the last available numeric value to pick extremes
    regionSeries.sort((a, b) => {
      const aLast = [...a.values].reverse().find((v) => v !== null) ?? 0
      const bLast = [...b.values].reverse().find((v) => v !== null) ?? 0
      return (bLast as number) - (aLast as number)
    })

    // Take top and bottom traces within limit
    const half = Math.floor(traceLimit / 2)
    const selected = [
      ...regionSeries.slice(0, half),
      ...regionSeries.slice(-half),
    ]

    // Compute summary per time for box plots
    const plotTraces: Plotly.Data[] = []

    // Region traces
    for (const { id, values } of selected) {
      const isHovered = id === hoveredRegionId
      plotTraces.push({
        x: timeValues,
        y: values.map((v) => (v === null ? undefined : v)),
        type: plotType as 'scatter' | 'scattergl' | 'bar',
        mode: 'lines+markers',
        name: id,
        showlegend: false,
        opacity: isHovered ? 1 : 0.5,
        line: { width: isHovered ? 3 : 1 },
        marker: { size: isHovered ? 8 : 4 },
        hoverinfo: 'text',
        text: values.map(
          (v, i) =>
            `${id}<br>${timeValues[i]}: ${v !== null ? (v as number).toFixed(2) : 'NA'}`
        ),
      } as Plotly.Data)
    }

    // Box plot traces
    if (boxplots) {
      for (let i = 0; i < timeValues.length; i++) {
        const timeOffset = rangeStart + i
        const summary = computeSummary(activeDataset, selectedVariable, timeOffset)
        if (!summary) continue

        plotTraces.push({
          x: [timeValues[i]],
          type: 'box',
          q1: [summary.q1],
          median: [summary.median],
          q3: [summary.q3],
          lowerfence: [iqrBox ? summary.lowerFence : summary.min],
          upperfence: [iqrBox ? summary.upperFence : summary.max],
          fillcolor: 'transparent',
          line: { color: '#767676' },
          showlegend: false,
          name: 'Summary',
          hoverinfo: 'none' as const,
        } as Plotly.Data)
      }
    }

    return { traces: plotTraces, years: timeValues }
  }, [activeDataset, selectedVariable, plotType, boxplots, iqrBox, traceLimit, hoveredRegionId, paletteName, shapes])

  const bgColor = themeDark ? '#0b1120' : '#0f1b35'
  const textColor = themeDark ? '#94a3b8' : '#cbd5e1'
  const gridColor = themeDark ? '#1e293b' : '#1e3a5f'

  return (
    <div className="w-full">
      {traces.length > 0 ? (
        <Plot
          data={traces}
          layout={{
            paper_bgcolor: bgColor,
            plot_bgcolor: bgColor,
            font: { color: textColor, family: 'Lato, sans-serif' },
            xaxis: { title: { text: '' }, fixedrange: true, gridcolor: gridColor, linecolor: gridColor },
            yaxis: { fixedrange: true, zeroline: false, gridcolor: gridColor, linecolor: gridColor },
            margin: { l: 60, r: 20, t: 20, b: 40 },
            hovermode: 'closest',
            showlegend: false,
          }}
          config={{
            displayModeBar: true,
            modeBarButtonsToRemove: ['select2d', 'lasso2d', 'sendDataToCloud'] as Plotly.ModeBarDefaultButtons[],
            responsive: true,
          }}
          style={{ width: '100%', height: '400px' }}
        />
      ) : (
        <div className="flex h-[400px] items-center justify-center text-gray-400">
          No data available for this variable
        </div>
      )}
    </div>
  )
}
