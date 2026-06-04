'use client'

import { memo } from 'react'
import { flexRender, type Row } from '@tanstack/react-table'

export interface RankRowData {
  regionId: string
  [year: string]: number | string | null
}

interface RankTableRowProps {
  row: Row<RankRowData>
  dataIndex: number
  selectedYearStr: string
  isHovered: boolean
  isSelected: boolean
  measureRef: (el: HTMLTableRowElement | null) => void
  onHover: (regionId: string | null) => void
  onSelect: (regionId: string) => void
}

function RankTableRowImpl({
  row,
  dataIndex,
  selectedYearStr,
  isHovered,
  isSelected,
  measureRef,
  onHover,
  onSelect,
}: RankTableRowProps) {
  const regionId = row.original.regionId
  return (
    <tr
      ref={measureRef}
      data-index={dataIndex}
      data-region={regionId}
      onMouseEnter={() => onHover(regionId)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onSelect(regionId)}
      className={`cursor-pointer border-b text-sm transition-colors dark:border-gray-700 ${
        isSelected
          ? 'bg-blue-100 dark:bg-blue-900'
          : isHovered
            ? 'bg-gray-100 dark:bg-gray-800'
            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
      }`}
    >
      {row.getVisibleCells().map((cell) => {
        const isSelectedYear = cell.column.id === selectedYearStr
        return (
          <td key={cell.id} className={`px-3 py-1.5 ${isSelectedYear ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        )
      })}
    </tr>
  )
}

/** Memoized so that hovering/selecting only re-renders the affected rows, not the whole window. */
export const RankTableRow = memo(RankTableRowImpl)
