'use client'

import { Suspense } from 'react'
import { Navbar } from '@/components/layout/Navbar'
import { SidePanel } from '@/components/layout/SidePanel'
import { FilterMenu } from '@/components/layout/FilterMenu'
import { DashboardMap } from '@/components/map/DashboardMap'
import { TimeSeriesPlot } from '@/components/plot/TimeSeriesPlot'
import { RankTable } from '@/components/table/RankTable'
import { ColorLegend } from '@/components/legend/ColorLegend'
import { VariableInfo } from '@/components/info/VariableInfo'
import { RegionInfo } from '@/components/info/RegionInfo'
import { SummaryInfo } from '@/components/info/SummaryInfo'

import { Breadcrumb } from '@/components/shared/Breadcrumb'
import { DynamicHeading } from '@/components/shared/DynamicHeading'
import { YearSelector } from '@/components/shared/YearSelector'
import { ExportDialog } from '@/components/shared/ExportDialog'
import { AutoExport } from '@/components/shared/AutoExport'
import { AskGeminiButton } from '@/components/chat/AskGeminiButton'
import { ChatDrawer } from '@/components/chat/ChatDrawer'
import { DataProvider } from '@/components/DataProvider'

export default function DashboardPage() {
  return (
    <DataProvider>
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <FilterMenu />
        <div className="flex flex-1">
          {/* Side panel with variable categories */}
          <SidePanel />

          {/* Main content area */}
          <main className="flex flex-1 flex-col p-4">
            <DynamicHeading />

            <div className="mx-auto mb-4">
              <YearSelector />
            </div>

            {/* Map + Info section */}
            <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <Breadcrumb />
                <Suspense fallback={<div className="flex h-[430px] items-center justify-center bg-gray-100 dark:bg-gray-800">Loading map...</div>}>
                  <DashboardMap />
                </Suspense>
              </div>
              <div className="flex flex-col gap-3 lg:col-span-5">
                <VariableInfo />
                <RegionInfo />
                <SummaryInfo />
                <ExportDialog />
                <AskGeminiButton />
              </div>
            </div>

            {/* Legend + Table + Plot section */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <ColorLegend />
                <RankTable />
              </div>
              <div className="lg:col-span-7">
                <Suspense fallback={<div className="flex h-[400px] items-center justify-center bg-gray-100 dark:bg-gray-800">Loading plot...</div>}>
                  <TimeSeriesPlot />
                </Suspense>
              </div>
            </div>
          </main>
        </div>
      </div>
      <ChatDrawer />
      <Suspense fallback={null}>
        <AutoExport />
      </Suspense>
    </DataProvider>
  )
}
