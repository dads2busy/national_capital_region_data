'use client'

import { useMemo, useRef, useEffect } from 'react'
import { useReactTable, getCoreRowModel, getSortedRowModel, flexRender, type ColumnDef } from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useDashboardStore } from '@/lib/store'
import { useData } from '@/components/DataProvider'
import { getValueAtTime } from '@/lib/data/aggregation'
import { RankTableRow, type RankRowData } from './RankTableRow'

type RowData = RankRowData

export function RankTable() {
  const selectedVariable = useDashboardStore((s) => s.selectedVariable)
  const selectedYear = useDashboardStore((s) => s.selectedYear)
  const digits = useDashboardStore((s) => s.settings.digits)
  const tableAutosort = useDashboardStore((s) => s.settings.tableAutosort)
  const tableAutoscroll = useDashboardStore((s) => s.settings.tableAutoscroll)
  const tableScrollBehavior = useDashboardStore((s) => s.settings.tableScrollBehavior)
  const hoveredRegionId = useDashboardStore((s) => s.hoveredRegionId)
  const selectedRegionId = useDashboardStore((s) => s.selectedRegionId)
  const setHoveredRegionId = useDashboardStore((s) => s.setHoveredRegionId)
  const setSelectedRegionId = useDashboardStore((s) => s.setSelectedRegionId)
  const setSelectedYear = useDashboardStore((s) => s.setSelectedYear)

  const { activeDataset } = useData()
  const containerRef = useRef<HTMLDivElement>(null)

  // Determine available years for the selected variable (skipping gaps)
  const years = useMemo((): number[] => {
    if (!activeDataset) return []
    const meta = activeDataset._meta
    const varInfo = meta.variables[selectedVariable]
    if (!varInfo || varInfo.time_range[0] === -1) return []

    if (varInfo.time_indices) {
      return varInfo.time_indices.map((i) => meta.time.value[i]).filter((y) => y !== undefined)
    }

    const [rangeStart, rangeEnd] = varInfo.time_range
    const result: number[] = []
    for (let i = rangeStart; i <= rangeEnd; i++) {
      if (i < meta.time.value.length) {
        result.push(meta.time.value[i])
      }
    }
    return result
  }, [activeDataset, selectedVariable])

  // Build table data — one row per region, one property per year
  const data = useMemo((): RowData[] => {
    if (!activeDataset || years.length === 0) return []

    const meta = activeDataset._meta
    const varInfo = meta.variables[selectedVariable]
    if (!varInfo) return []
    const { code: xCode, time_range: [rangeStart] } = varInfo

    const rows: RowData[] = []
    for (const regionId of Object.keys(activeDataset)) {
      if (regionId === '_meta') continue
      const regionData = activeDataset[regionId] as Record<string, number | string | (number | string)[]>
      const row: RowData = { regionId }
      for (const year of years) {
        const timeOffset = year - meta.time.value[0]
        row[String(year)] = getValueAtTime(regionData, xCode, timeOffset, rangeStart)
      }
      rows.push(row)
    }

    return rows
  }, [activeDataset, selectedVariable, years])

  const columns = useMemo((): ColumnDef<RowData>[] => {
    const cols: ColumnDef<RowData>[] = [
      {
        accessorKey: 'regionId',
        header: 'Region',
        cell: (info) => <span className="text-sm">{info.getValue() as string}</span>,
        enableSorting: true,
      },
    ]

    for (const year of years) {
      const key = String(year)
      cols.push({
        accessorKey: key,
        header: key,
        cell: (info) => {
          const val = info.getValue() as number | null
          return <span className="text-sm">{val !== null ? val.toFixed(digits) : 'NA'}</span>
        },
        sortingFn: 'basic',
      })
    }

    return cols
  }, [years, digits])

  // Sort by the selected year column by default
  const sortingState = useMemo(() => {
    if (!tableAutosort) return []
    return [{ id: String(selectedYear), desc: true }]
  }, [tableAutosort, selectedYear])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting: sortingState,
    },
  })

  const rows = table.getRowModel().rows

  // Virtualize rows so only the visible window is in the DOM (regions can number in the thousands).
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 33,
    overscan: 12,
  })
  const virtualRows = rowVirtualizer.getVirtualItems()
  const totalSize = rowVirtualizer.getTotalSize()
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0
  const paddingBottom = virtualRows.length > 0 ? totalSize - virtualRows[virtualRows.length - 1].end : 0
  const colCount = columns.length

  // Auto-scroll to selected region (via the virtualizer, since the row may not be mounted)
  useEffect(() => {
    if (!tableAutoscroll || !selectedRegionId) return
    const index = rows.findIndex((r) => r.original.regionId === selectedRegionId)
    if (index >= 0) {
      rowVirtualizer.scrollToIndex(index, {
        align: 'center',
        behavior: tableScrollBehavior === 'smooth' ? 'smooth' : 'auto',
      })
    }
  }, [selectedRegionId, tableAutoscroll, tableScrollBehavior, rows, rowVirtualizer])

  return (
    <div data-testid="rank-table" ref={containerRef} className="mt-2 max-h-[300px] overflow-auto rounded border dark:border-gray-700">
      <table className="w-full text-left">
        <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const yearNum = Number(header.id)
                const isYearCol = !isNaN(yearNum)
                const isSelectedYear = header.id === String(selectedYear)
                return (
                  <th
                    key={header.id}
                    onClick={(e) => {
                      if (isYearCol) {
                        setSelectedYear(yearNum)
                      } else {
                        header.column.getToggleSortingHandler()?.(e)
                      }
                    }}
                    className={`cursor-pointer whitespace-nowrap px-3 py-2 text-xs font-medium ${
                      isSelectedYear
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : 'text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() === 'asc' ? ' ↑' : header.column.getIsSorted() === 'desc' ? ' ↓' : ''}
                  </th>
                )
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {paddingTop > 0 && (
            <tr aria-hidden>
              <td colSpan={colCount} style={{ height: paddingTop }} className="p-0" />
            </tr>
          )}
          {virtualRows.map((virtualRow) => {
            const row = rows[virtualRow.index]
            const regionId = row.original.regionId
            return (
              <RankTableRow
                key={row.id}
                row={row}
                dataIndex={virtualRow.index}
                measureRef={rowVirtualizer.measureElement}
                selectedYearStr={String(selectedYear)}
                isHovered={regionId === hoveredRegionId}
                isSelected={regionId === selectedRegionId}
                onHover={setHoveredRegionId}
                onSelect={setSelectedRegionId}
              />
            )
          })}
          {paddingBottom > 0 && (
            <tr aria-hidden>
              <td colSpan={colCount} style={{ height: paddingBottom }} className="p-0" />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
