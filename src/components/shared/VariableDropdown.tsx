'use client'

import { useState, useRef, useEffect } from 'react'

interface VariableGroup {
  category: string
  variables: { name: string; label: string; shortDescription: string; longDescription: string }[]
}

interface Props {
  value: string
  onChange: (value: string) => void
  options: VariableGroup[]
}

export function VariableDropdown({ value, onChange, options }: Props) {
  const [open, setOpen] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => {
    for (const group of options) {
      if (group.variables.some((v) => v.name === value)) {
        return new Set([group.category])
      }
    }
    return new Set()
  })
  const containerRef = useRef<HTMLDivElement>(null)

  const currentLabel =
    options.flatMap((g) => g.variables).find((v) => v.name === value)?.label || value

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    for (const group of options) {
      if (group.variables.some((v) => v.name === value)) {
        setExpandedCategories((prev) => {
          if (prev.has(group.category)) return prev
          return new Set([...prev, group.category])
        })
        break
      }
    }
  }, [value, options])

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) {
        next.delete(cat)
      } else {
        next.add(cat)
      }
      return next
    })
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        data-testid="variable-dropdown"
        onClick={() => setOpen(!open)}
        className="w-full rounded border border-slate-600 bg-slate-700 px-3 py-1 text-left text-sm text-slate-200"
      >
        <span className="block truncate">{currentLabel}</span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 max-h-[400px] w-full overflow-y-auto rounded border border-slate-600 bg-slate-700 shadow-xl animate-[dropdown-in_150ms_ease-out]">
          {options.map((group) => {
            const isExpanded = expandedCategories.has(group.category)
            return (
              <div key={group.category}>
                <button
                  onClick={() => toggleCategory(group.category)}
                  className="flex w-full items-center gap-1 bg-slate-800 px-3 py-1.5 text-left text-xs font-semibold text-slate-300 hover:bg-slate-750"
                >
                  <span className="inline-block w-3 text-center text-[10px]">{isExpanded ? '▼' : '▶'}</span>
                  {group.category}
                  <span className="ml-auto text-[10px] text-slate-500">{group.variables.length}</span>
                </button>
                {isExpanded &&
                  group.variables.map((v) => (
                    <button
                      key={v.name}
                      data-testid={`variable-option-${v.name}`}
                      onClick={() => {
                        onChange(v.name)
                        setOpen(false)
                      }}
                      className={`w-full px-3 py-1.5 pl-7 text-left ${
                        v.name === value
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-200 hover:bg-slate-600'
                      }`}
                    >
                      <span className="block text-sm font-medium">{v.label}</span>
                      {v.shortDescription && (
                        <span className={`block text-xs ${
                          v.name === value ? 'text-blue-200' : 'text-slate-400'
                        }`}>
                          {v.shortDescription}
                        </span>
                      )}
                    </button>
                  ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
