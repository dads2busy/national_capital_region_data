'use client'

import dynamic from 'next/dynamic'

const MapInner = dynamic(() => import('./MapInner').then((m) => m.MapInner), {
  ssr: false,
  loading: () => (
    <div className="flex h-[430px] items-center justify-center bg-gray-100 dark:bg-gray-800">Loading map...</div>
  ),
})

export function DashboardMap() {
  return <MapInner />
}
