'use client'

import { useState } from 'react'
import { useDashboardStore } from '@/lib/store'
import { SettingsDrawer } from './SettingsDrawer'
import { AboutDrawer } from './AboutDrawer'

export function Navbar() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const resetSelection = useDashboardStore((s) => s.resetSelection)
  const filterOpen = useDashboardStore((s) => s.filterOpen)
  const setFilterOpen = useDashboardStore((s) => s.setFilterOpen)

  return (
    <>
      <nav className="flex items-center justify-between px-4 py-2 text-white" style={{ backgroundColor: 'var(--navbar-bg)' }}>
        <div className="flex items-center gap-2">
          <img src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/icon.svg`} alt="site logo" width={24} height={24} />
          <span className="text-lg font-semibold">National Capital Region Data Commons</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={resetSelection}
            className="rounded px-3 py-1 text-sm text-white/80 hover:text-white hover:bg-white/10"
          >
            Reset
          </button>
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className="rounded px-3 py-1 text-sm text-white/80 hover:text-white hover:bg-white/10"
          >
            Filter
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="rounded px-3 py-1 text-sm text-white/80 hover:text-white hover:bg-white/10"
          >
            Settings
          </button>
          <button
            onClick={() => setAboutOpen(true)}
            className="rounded px-3 py-1 text-sm text-white/80 hover:text-white hover:bg-white/10"
          >
            About
          </button>
        </div>
      </nav>
      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <AboutDrawer open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </>
  )
}
