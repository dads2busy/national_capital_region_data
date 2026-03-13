'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useDashboardStore } from '@/lib/store'
import { useData } from '@/components/DataProvider'
import { sendMessage } from '@/lib/gemini/client'
import { buildGeminiContext, detectMentionedVariables } from '@/lib/gemini/context'
import { selectShapes } from '@/lib/store/selectors'
import { ChatInput } from './ChatInput'
import type { MeasureInfo, MeasureInfoMap } from '@/lib/data/types'

const DRILL_DOWN_RE = /\[DRILL_DOWN:([^\]]+)\]\s*$/

function findMeasureInfo(measureInfo: MeasureInfoMap, variableName: string): MeasureInfo | null {
  const direct = measureInfo[variableName]
  if (direct && typeof direct === 'object' && 'short_name' in direct) return direct as MeasureInfo
  for (const [pattern, entry] of Object.entries(measureInfo)) {
    if (!pattern.includes('{') || !entry || typeof entry !== 'object' || !('short_name' in entry)) continue
    const regexStr = '^' + pattern.replace(/\{[^}]+\}/g, '(.+)') + '$'
    if (variableName.match(new RegExp(regexStr))) return entry as MeasureInfo
  }
  return null
}

/** Parse [DRILL_DOWN:var1,var2] tag from response and return cleaned text + variable names */
function parseDrillDown(response: string): { text: string; variables: string[] } {
  const match = response.match(DRILL_DOWN_RE)
  if (!match) return { text: response, variables: [] }
  const text = response.replace(DRILL_DOWN_RE, '').trim()
  const variables = match[1].split(',').map((v) => v.trim()).filter(Boolean)
  return { text, variables }
}

export function ChatDrawer() {
  const chatOpen = useDashboardStore((s) => s.chatOpen)
  const setChatOpen = useDashboardStore((s) => s.setChatOpen)
  const chatMessages = useDashboardStore((s) => s.chatMessages)
  const addChatMessage = useDashboardStore((s) => s.addChatMessage)
  const clearChatMessages = useDashboardStore((s) => s.clearChatMessages)
  const selectedVariable = useDashboardStore((s) => s.selectedVariable)
  const selectedYear = useDashboardStore((s) => s.selectedYear)
  const selectedRegionId = useDashboardStore((s) => s.selectedRegionId)
  const shapes = useDashboardStore(selectShapes)

  const { datasets, activeDataset, measureInfo, datapackage, narratives, correlations, regionNameMap } = useData()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [drillDownVars, setDrillDownVars] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const prevVarYear = useRef(`${selectedVariable}-${selectedYear}`)

  // Reset chat when variable or year changes
  useEffect(() => {
    const key = `${selectedVariable}-${selectedYear}`
    if (key !== prevVarYear.current) {
      clearChatMessages()
      setDrillDownVars([])
      prevVarYear.current = key
    }
  }, [selectedVariable, selectedYear, clearChatMessages])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const handleSend = useCallback(
    async (userMessage: string) => {
      if (!activeDataset || !measureInfo) return

      addChatMessage({ role: 'user', text: userMessage })
      setLoading(true)
      setError(null)

      try {
        const info = findMeasureInfo(measureInfo, selectedVariable)

        // Build datasets array for context from county/tract/block_group
        const datasetsForContext: { level: string; dataset: NonNullable<typeof activeDataset> }[] = []
        for (const level of ['county', 'tract', 'block_group'] as const) {
          const ds = datasets[level]
          if (ds) datasetsForContext.push({ level, dataset: ds })
        }

        // Detect variables mentioned in user message + recent chat history
        const recentText = chatMessages.slice(-4).map((m) => m.text).join(' ') + ' ' + userMessage
        const mentioned = detectMentionedVariables(recentText, measureInfo)

        const context = buildGeminiContext({
          datasets: datasetsForContext,
          variableName: selectedVariable,
          measureInfo: info,
          measureInfoMap: measureInfo,
          datapackage,
          year: selectedYear,
          currentLevel: shapes,
          selectedRegionId,
          narrative: narratives[selectedVariable] || null,
          regionNameMap,
          correlations,
          focusVariables: mentioned.length > 0 ? mentioned : undefined,
          drillDownVariables: drillDownVars.length > 0 ? drillDownVars : undefined,
        })

        const response = await sendMessage(userMessage, context, chatMessages)
        const { text, variables } = parseDrillDown(response)
        addChatMessage({ role: 'model', text })

        // If the model suggested a drill-down, store the variables
        if (variables.length > 0) {
          setDrillDownVars(variables)
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'An error occurred'
        if (msg.includes('429')) {
          setError('Please wait a moment before sending another message.')
        } else if (msg.includes('403') || msg.includes('PERMISSION_DENIED') || msg.includes('blocked')) {
          setError('API key permission error. Check referrer restrictions in Google Cloud Console.')
        } else {
          setError('Unable to reach the AI service. Please try again.')
        }
      } finally {
        setLoading(false)
      }
    },
    [datasets, activeDataset, measureInfo, datapackage, selectedVariable, selectedYear, shapes, selectedRegionId, narratives, correlations, regionNameMap, drillDownVars, chatMessages, addChatMessage]
  )

  if (!chatOpen) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-[1000] flex max-h-[50vh] flex-col rounded-t-xl border-t bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-2 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span className="text-sm font-medium">Ask Gemini</span>
          <span className="text-xs text-gray-400">AI-powered</span>
        </div>
        <button
          onClick={() => setChatOpen(false)}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {chatMessages.length === 0 && (
          <p className="text-center text-xs text-gray-400">
            Ask a question about the currently displayed data.
          </p>
        )}
        {chatMessages.map((msg, i) => (
          <div
            key={i}
            className={`mb-3 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}
          >
            <div
              className={`inline-block max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="mb-3 text-left">
            <div className="inline-block rounded-lg bg-gray-100 px-3 py-2 dark:bg-gray-800">
              <span className="inline-flex gap-1">
                <span className="h-2 w-2 animate-pulse rounded-full bg-purple-400" />
                <span className="h-2 w-2 animate-pulse rounded-full bg-purple-400" style={{ animationDelay: '0.2s' }} />
                <span className="h-2 w-2 animate-pulse rounded-full bg-purple-400" style={{ animationDelay: '0.4s' }} />
              </span>
            </div>
          </div>
        )}
        {error && (
          <div className="mb-3 text-center">
            <span className="text-xs text-red-500">{error}</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={loading} />
    </div>
  )
}
