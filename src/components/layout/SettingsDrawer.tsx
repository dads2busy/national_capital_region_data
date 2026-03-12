'use client'

import { useDashboardStore, type DashboardSettings } from '@/lib/store'
import { useTheme } from 'next-themes'

interface SettingsDrawerProps {
  open: boolean
  onClose: () => void
}

export function SettingsDrawer({ open, onClose }: SettingsDrawerProps) {
  const settings = useDashboardStore((s) => s.settings)
  const setSetting = useDashboardStore((s) => s.setSetting)
  const { setTheme } = useTheme()

  const handleThemeToggle = (value: boolean) => {
    setSetting('themeDark', value)
    setTheme(value ? 'dark' : 'light')
  }

  return (
    <div className={`fixed inset-0 z-50 flex justify-end transition-colors duration-300 ${open ? 'bg-black/30 backdrop-blur-sm' : 'pointer-events-none bg-black/0'}`}>
      <div className="absolute inset-0" onClick={onClose} />
      <div className={`relative z-10 flex h-full w-80 flex-col bg-white shadow-xl transition-transform duration-300 ease-out dark:bg-gray-900 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between border-b px-4 py-3 dark:border-gray-700">
          <h5 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>Settings</h5>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            &times;
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <ToggleSetting label="Dark Theme" value={settings.themeDark} onChange={handleThemeToggle} />
          <ToggleSetting
            label="Color by Rank"
            value={settings.colorByOrder}
            onChange={(v) => setSetting('colorByOrder', v)}
            note="Switch from coloring by value to coloring by sorted index."
          />
          <SelectSetting
            label="Color Scale Center"
            value={settings.colorScaleCenter}
            options={[
              { value: 'none', label: 'None' },
              { value: 'median', label: 'Median' },
              { value: 'mean', label: 'Mean' },
            ]}
            onChange={(v) => setSetting('colorScaleCenter', v as DashboardSettings['colorScaleCenter'])}
          />
          <ToggleSetting
            label="Hide URL Settings"
            value={settings.hideUrlParameters}
            onChange={(v) => setSetting('hideUrlParameters', v)}
          />
          <ToggleSetting
            label="Hide Tooltips"
            value={settings.hideTooltips}
            onChange={(v) => setSetting('hideTooltips', v)}
          />
          <ToggleSetting
            label="Show Missing Years"
            value={settings.showEmptyTimes}
            onChange={(v) => setSetting('showEmptyTimes', v)}
          />
          <NumberSetting
            label="Digits"
            value={settings.digits}
            min={0}
            max={6}
            onChange={(v) => setSetting('digits', v)}
          />
          <SelectSetting
            label="Summary Level"
            value={settings.summarySelection}
            options={[
              { value: 'dataset', label: 'All Regions' },
              { value: 'filtered', label: 'Selected Region Types' },
              { value: 'all', label: 'Selected Region' },
            ]}
            onChange={(v) => setSetting('summarySelection', v as DashboardSettings['summarySelection'])}
          />

          <p className="mt-4 mb-2 text-sm font-semibold text-gray-500 dark:text-gray-400">Map Options</p>
          <SelectSetting
            label="Animations"
            value={settings.mapAnimations}
            options={[
              { value: 'fly', label: 'Fly' },
              { value: 'zoom', label: 'Zoom' },
              { value: 'none', label: 'None' },
            ]}
            onChange={(v) => setSetting('mapAnimations', v as DashboardSettings['mapAnimations'])}
          />
          <ToggleSetting
            label="Background On Top"
            value={settings.backgroundTop}
            onChange={(v) => setSetting('backgroundTop', v)}
          />
          <NumberSetting
            label="Outline Weight"
            value={settings.polygonOutline}
            min={0}
            max={10}
            step={0.5}
            onChange={(v) => setSetting('polygonOutline', v)}
          />
          <NumberSetting
            label="Background Outline Weight"
            value={settings.backgroundPolygonOutline}
            min={0}
            max={10}
            step={0.5}
            onChange={(v) => setSetting('backgroundPolygonOutline', v)}
          />
          <NumberSetting
            label="Overlay Circle Size"
            value={settings.circleRadius}
            min={1}
            max={20}
            step={1}
            onChange={(v) => setSetting('circleRadius', v)}
          />

          <p className="mt-4 mb-2 text-sm font-semibold text-gray-500 dark:text-gray-400">Plot Options</p>
          <SelectSetting
            label="Plot Type"
            value={settings.plotType}
            options={[
              { value: 'scatter', label: 'Scatter' },
              { value: 'scattergl', label: 'ScatterGL' },
              { value: 'bar', label: 'Bar' },
            ]}
            onChange={(v) => setSetting('plotType', v as DashboardSettings['plotType'])}
          />
          <ToggleSetting label="Box Plots" value={settings.boxplots} onChange={(v) => setSetting('boxplots', v)} />
          <ToggleSetting
            label="Use IQR Whiskers"
            value={settings.iqrBox}
            onChange={(v) => setSetting('iqrBox', v)}
            note="Define box plot fences by 1.5 * IQR (true) or min and max (false)."
          />
          <NumberSetting
            label="Trace Limit"
            value={settings.traceLimit}
            min={1}
            max={100}
            onChange={(v) => setSetting('traceLimit', v)}
          />

          <p className="mt-4 mb-2 text-sm font-semibold text-gray-500 dark:text-gray-400">Table Options</p>
          <ToggleSetting
            label="Auto-Sort"
            value={settings.tableAutosort}
            onChange={(v) => setSetting('tableAutosort', v)}
          />
          <ToggleSetting
            label="Auto-Scroll"
            value={settings.tableAutoscroll}
            onChange={(v) => setSetting('tableAutoscroll', v)}
          />
          <SelectSetting
            label="Scroll Behavior"
            value={settings.tableScrollBehavior}
            options={[
              { value: 'instant', label: 'Instant' },
              { value: 'smooth', label: 'Smooth' },
              { value: 'auto', label: 'Auto' },
            ]}
            onChange={(v) => setSetting('tableScrollBehavior', v as DashboardSettings['tableScrollBehavior'])}
          />
        </div>
        <div className="border-t p-4 dark:border-gray-700">
          <button
            onClick={() => {
              localStorage.removeItem('vdh-dashboard-settings')
              window.location.reload()
            }}
            className="w-full rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
          >
            Clear Settings
          </button>
        </div>
      </div>
    </div>
  )
}

function ToggleSetting({
  label,
  value,
  onChange,
  note,
}: {
  label: string
  value: boolean
  onChange: (val: boolean) => void
  note?: string
}) {
  return (
    <div className="mb-3">
      <label className="flex cursor-pointer items-center justify-between">
        <span className="text-sm">{label}</span>
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 rounded"
        />
      </label>
      {note && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{note}</p>}
    </div>
  )
}

function SelectSetting({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (val: string) => void
}) {
  return (
    <div className="mb-3">
      <label className="block text-sm">
        {label}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 block w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

function NumberSetting({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  note,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (val: number) => void
  note?: string
}) {
  return (
    <div className="mb-3">
      <label className="block text-sm">
        {label}
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          className="mt-1 block w-20 rounded border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800"
        />
      </label>
      {note && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{note}</p>}
    </div>
  )
}
