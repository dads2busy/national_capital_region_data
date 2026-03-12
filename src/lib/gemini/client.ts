'use client'

import { GoogleGenerativeAI, type GenerativeModel, type ChatSession } from '@google/generative-ai'
import type { ChatMessage, GeminiContext } from './types'

const SYSTEM_PROMPT = `You are a helpful assistant for the National Capital Region Data Commons dashboard. You have access to dashboard context (variable metadata, summary statistics, and regional values) provided below. Use this context for data-specific answers (values, rankings, trends). For general knowledge questions — such as methodology background, academic citations, index definitions, or public health context — draw on your broader training knowledge. Be concise (2-4 sentences unless more detail is needed). Don't fabricate dashboard statistics not in the context, but do provide relevant background information when asked.

The system provides pre-computed Pearson correlations for the currently selected variable against ALL other variables at each geographic level (county, tract, block_group). When the user asks about relationships between variables, look up the relevant variable in the correlation list — it contains every pair with |r| >= 0.3. Use the variable directory to identify which variable key the user is referring to, then find it in the correlations. If asked about two variables and neither is the currently selected one, note that you have correlation data for the selected variable and suggest switching to one of the mentioned variables for full correlation data.

After analyzing county-level relationships, you may offer the user the option to drill down to census tract level for a more granular analysis. To do this, end your message with the tag [DRILL_DOWN:variable_name_1,variable_name_2] using the exact variable names from the data context. This tag will trigger the system to load tract-level data for those variables. Only suggest this when it would add analytical value (e.g., correlation analysis, spatial patterns). The tag must be on its own line at the very end of your response.`

const MAX_HISTORY = 20

let genai: GoogleGenerativeAI | null = null
let model: GenerativeModel | null = null

function getModel(): GenerativeModel | null {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY
  if (!apiKey) return null
  if (!genai) {
    genai = new GoogleGenerativeAI(apiKey)
  }
  if (!model) {
    model = genai.getGenerativeModel({ model: 'gemini-2.5-flash' })
  }
  return model
}

export function isGeminiAvailable(): boolean {
  return !!process.env.NEXT_PUBLIC_GEMINI_API_KEY
}

function formatContext(ctx: GeminiContext): string {
  let text = `Current variable: ${ctx.variableLabel} (${ctx.variableName})\n`
  text += `Category: ${ctx.category}\n`
  text += `Description: ${ctx.description}\n`
  if (ctx.statement) text += `Statement: ${ctx.statement}\n`
  if (ctx.sources) text += `Sources: ${ctx.sources}\n`
  text += `Currently viewing: ${ctx.currentLevel} level\n`
  text += `Year: ${ctx.year}\n`
  if (ctx.selectedRegion) text += `Selected region: ${ctx.selectedRegion}\n`

  for (const ls of ctx.levelSummaries) {
    text += `\n--- ${ls.level.charAt(0).toUpperCase() + ls.level.slice(1)} level (${ls.n} regions) ---\n`
    text += `  Min: ${ls.min.toFixed(2)}, Q1: ${ls.q1.toFixed(2)}, Median: ${ls.median.toFixed(2)}, Mean: ${ls.mean.toFixed(2)}, Q3: ${ls.q3.toFixed(2)}, Max: ${ls.max.toFixed(2)}\n`
    if (ls.topRegions.length > 0) {
      text += `  Top 5: ${ls.topRegions.map((r) => `${r.id} (${r.value.toFixed(2)})`).join(', ')}\n`
    }
    if (ls.bottomRegions.length > 0) {
      text += `  Bottom 5: ${ls.bottomRegions.map((r) => `${r.id} (${r.value.toFixed(2)})`).join(', ')}\n`
    }
  }

  if (ctx.selectedRegionTimeSeries) {
    text += `\nSelected region time series:\n`
    text += ctx.selectedRegionTimeSeries.map((p) => `  ${p.year}: ${p.value.toFixed(2)}`).join('\n') + '\n'
  }

  if (ctx.narrative) {
    text += `\nAI-generated summary: ${ctx.narrative}\n`
  }

  if (ctx.correlationSummary) {
    text += `\n--- PRE-COMPUTED CORRELATIONS (Pearson r, latest year, |r| >= 0.3) ---\n`
    text += `Top correlations for the current and mentioned variables at each geographic level. Use these to answer questions about relationships between variables.\n`
    text += ctx.correlationSummary + '\n'
  }

  if (ctx.variableDirectory) {
    text += `\n--- ALL AVAILABLE VARIABLES (with county-level summary stats) ---\n`
    text += `The dashboard contains the following variables. Each includes county-level mean, sd, min, max where available.\n`
    text += ctx.variableDirectory + '\n'
  }

  if (ctx.countyDataCsv) {
    text += `\n--- COUNTY-LEVEL PAIRED DATA (latest year, relevant variables, CSV) ---\n`
    text += `Per-county values for the variables relevant to this question. Use this to analyze correlations and patterns.\n`
    text += ctx.countyDataCsv + '\n'
  }

  if (ctx.tractDataCsv) {
    text += `\n--- CENSUS TRACT-LEVEL DATA (drill-down, selected variables, CSV) ---\n`
    text += `This is the more granular tract-level data requested for the specified variables. Use it for deeper analysis.\n`
    text += ctx.tractDataCsv + '\n'
  }

  return text
}

export async function sendMessage(
  userMessage: string,
  context: GeminiContext,
  history: ChatMessage[]
): Promise<string> {
  const m = getModel()
  if (!m) throw new Error('Gemini API key not configured')

  const contextStr = formatContext(context)

  // Build chat history for the API
  const chatHistory = history.slice(-MAX_HISTORY).map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.text }],
  }))

  const chat: ChatSession = m.startChat({
    history: chatHistory,
    systemInstruction: {
      role: 'user',
      parts: [{ text: `${SYSTEM_PROMPT}\n\n--- DATA CONTEXT ---\n${contextStr}` }],
    },
  })

  const result = await chat.sendMessage(userMessage)
  return result.response.text().trim()
}
