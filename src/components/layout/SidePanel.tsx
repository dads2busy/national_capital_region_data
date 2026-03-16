'use client'

import { useDashboardStore } from '@/lib/store'

interface FeaturedButton {
  label: string
  variable: string
}

interface FeaturedSection {
  heading: string
  buttons: FeaturedButton[]
}

const featuredSections: FeaturedSection[] = [
  {
    heading: 'Community Indices',
    buttons: [
      { label: 'Social Vulnerability Index', variable: 'vi_overall' },
      { label: 'H+T Affordability Index', variable: 'affordability_index_geo20' },
      { label: 'Material Deprivation', variable: 'material_deprivation_indicator_geo20' },
      { label: 'Walkability Index', variable: 'walkability_index_geo20' },
      { label: 'Income Inequality (Gini)', variable: 'gini_index_geo20' },
    ],
  },
  {
    heading: 'Health',
    buttons: [
      { label: 'Frequent Mental Distress', variable: 'perc_freq_mental_distress' },
      { label: 'Frequent Physical Distress', variable: 'perc_freq_physical_distress' },
      { label: 'APNCU: Inadequate', variable: 'inadequate_pc' },
      { label: 'APNCU: Adequate', variable: 'adequate_pc' },
      { label: 'Uninsured Population', variable: 'no_hlth_ins_pct_geo20' },
    ],
  },
  {
    heading: 'Broadband & Connectivity',
    buttons: [
      { label: 'Average Download Speed', variable: 'avg_down_speed_geo20' },
      { label: 'Households with Broadband', variable: 'perc_hh_with_broadband_geo20' },
    ],
  },
  {
    heading: 'Housing & Transportation Costs',
    buttons: [
      { label: 'Housing Cost %', variable: 'housing_cost_pct_geo20' },
      { label: 'Transport Cost %', variable: 'transport_cost_pct_geo20' },
    ],
  },
]

export function SidePanel() {
  const selectedVariable = useDashboardStore((s) => s.selectedVariable)
  const setSelectedVariable = useDashboardStore((s) => s.setSelectedVariable)

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-gray-50 dark:border-gray-700 dark:bg-gray-900 lg:block">
      <div className="border-b px-4 py-3 dark:border-gray-700">
        <span className="text-sm font-medium">Featured Measures</span>
      </div>

      <div className="overflow-y-auto p-2" style={{ maxHeight: 'calc(100vh - 150px)' }}>
        {featuredSections.map((section) => (
          <div key={section.heading} className="mb-2">
            <p className="px-2 pt-2 pb-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
              {section.heading}
            </p>
            {section.buttons.map((btn) => (
              <button
                key={btn.variable}
                data-testid={`var-btn-${btn.variable}`}
                onClick={() => setSelectedVariable(btn.variable)}
                className={`w-full rounded px-3 py-1.5 text-left text-sm transition-colors ${
                  selectedVariable === btn.variable
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    </aside>
  )
}
