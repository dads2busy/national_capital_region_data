'use client'

import { useMemo, useRef, useEffect } from 'react'
import { useReactTable, getCoreRowModel, getSortedRowModel, flexRender, type ColumnDef } from '@tanstack/react-table'
import { useDashboardStore } from '@/lib/store'
import { useData } from '@/components/DataProvider'
import { getRegionValues } from '@/lib/data/aggregation'

interface RowData {
  regionId: string
  value: number | null
}

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

  const { activeDataset } = useData()
  const containerRef = useRef<HTMLDivElement>(null)

  // Build table data
  const data = useMemo((): RowData[] => {
    if (!activeDataset) return []

    const meta = activeDataset._meta
    const timeOffset = selectedYear - meta.time.value[0]
    const values = getRegionValues(activeDataset, selectedVariable, timeOffset)

    const rows: RowData[] = []
    for (const regionId of Object.keys(activeDataset)) {
      if (regionId === '_meta') continue
      rows.push({ regionId, value: values.get(regionId) ?? null })
    }

    return rows
  }, [activeDataset, selectedVariable, selectedYear])

  const columns = useMemo((): ColumnDef<RowData>[] => {
    return [
      {
        accessorKey: 'regionId',
        header: 'Region',
        cell: (info) => <span className="text-sm">{info.getValue() as string}</span>,
      },
      {
        accessorKey: 'value',
        header: selectedVariable,
        cell: (info) => {
          const val = info.getValue() as number | null
          return <span className="text-sm">{val !== null ? val.toFixed(digits) : 'NA'}</span>
        },
        sortingFn: 'basic',
      },
    ]
  }, [selectedVariable, digits])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      sorting: tableAutosort ? [{ id: 'value', desc: true }] : [],
    },
  })

  // Auto-scroll to selected region
  useEffect(() => {
    if (!tableAutoscroll || !selectedRegionId || !containerRef.current) return
    const row = containerRef.current.querySelector(`[data-region="${selectedRegionId}"]`)
    if (row) {
      row.scrollIntoView({ behavior: tableScrollBehavior, block: 'center' })
    }
  }, [selectedRegionId, tableAutoscroll, tableScrollBehavior])

  return (
    <div ref={containerRef} className="mt-2 max-h-[300px] overflow-y-auto rounded border dark:border-gray-700">
      <table className="w-full text-left">
        <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  className="cursor-pointer px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-300"
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {header.column.getIsSorted() === 'asc' ? ' ↑' : header.column.getIsSorted() === 'desc' ? ' ↓' : ''}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => {
            const regionId = row.original.regionId
            const isHovered = regionId === hoveredRegionId
            const isSelected = regionId === selectedRegionId
            return (
              <tr
                key={row.id}
                data-region={regionId}
                onMouseEnter={() => setHoveredRegionId(regionId)}
                onMouseLeave={() => setHoveredRegionId(null)}
                onClick={() => setSelectedRegionId(regionId)}
                className={`cursor-pointer border-b text-sm transition-colors dark:border-gray-700 ${
                  isSelected
                    ? 'bg-blue-100 dark:bg-blue-900'
                    : isHovered
                      ? 'bg-gray-100 dark:bg-gray-800'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-1.5">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
