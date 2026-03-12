'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import { useDashboardStore } from '@/lib/store'
import { useData } from '@/components/DataProvider'
import { resolveVariables, groupByCategory } from '@/lib/data/measure-info-resolver'

export function SidePanel() {
  const selectedVariable = useDashboardStore((s) => s.selectedVariable)
  const setSelectedVariable = useDashboardStore((s) => s.setSelectedVariable)

  const { measureInfo, datasets } = useData()

  // Build category-grouped variable list dynamically from measure_info + county dataset
  const categoryGroups = useMemo(() => {
    const county = datasets.county
    if (!measureInfo || !county) return []
    const varNames = Object.keys(county._meta.variables)
    const resolved = resolveVariables(measureInfo, varNames)
    return groupByCategory(resolved)
  }, [measureInfo, datasets])

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  // Track categories the user has explicitly collapsed
  const userCollapsed = useRef<Set<string>>(new Set())

  // Auto-expand the category when the selected variable changes
  useEffect(() => {
    for (const group of categoryGroups) {
      if (group.variables.some((v) => v.name === selectedVariable)) {
        if (!userCollapsed.current.has(group.category)) {
          setExpandedCategories((prev) => {
            if (prev.has(group.category)) return prev
            const next = new Set(prev)
            next.add(group.category)
            return next
          })
        }
        break
      }
    }
  }, [selectedVariable, categoryGroups])

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
        userCollapsed.current.add(category)
      } else {
        next.add(category)
        userCollapsed.current.delete(category)
      }
      return next
    })
  }

  const isCategoryOpen = (category: string) => expandedCategories.has(category)

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-gray-50 dark:border-gray-700 dark:bg-gray-900 lg:block">
      <div className="border-b px-4 py-3 dark:border-gray-700">
        <span className="text-sm font-medium">Variables</span>
      </div>

      <div className="overflow-y-auto p-2" style={{ maxHeight: 'calc(100vh - 150px)' }}>
        {categoryGroups.map((group) => {
          const open = isCategoryOpen(group.category)
          return (
            <div key={group.category} className="mb-1">
              <button
                onClick={() => toggleCategory(group.category)}
                className="flex w-full items-center justify-between rounded px-2 pt-2 pb-1 text-left text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <span>{group.category}</span>
                <span className="text-[10px]">{open ? '\u25B2' : '\u25BC'}</span>
              </button>
              {open && (
                <div>
                  {group.variables.map((v) => (
                    <button
                      key={v.name}
                      onClick={() => setSelectedVariable(v.name)}
                      className={`w-full rounded px-3 py-1.5 text-left text-sm transition-colors ${
                        selectedVariable === v.name
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800'
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </aside>
  )
}
