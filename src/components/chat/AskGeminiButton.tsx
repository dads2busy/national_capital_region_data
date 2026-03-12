'use client'

import { useDashboardStore } from '@/lib/store'
import { isGeminiAvailable } from '@/lib/gemini/client'

export function AskGeminiButton() {
  const setChatOpen = useDashboardStore((s) => s.setChatOpen)

  if (!isGeminiAvailable()) return null

  return (
    <button
      onClick={() => setChatOpen(true)}
      className="mt-2 flex w-full items-center justify-center gap-2 rounded border border-purple-300 px-3 py-2 text-sm text-purple-600 transition-colors hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-900/30"
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      Ask about this data
    </button>
  )
}
