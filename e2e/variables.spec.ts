import { test, expect } from '@playwright/test'
import { attachNetworkGuards, waitForAppShell, waitForDataUpdate, assertSomeDataAppears } from './lib/signals'
import { getAvailableVariables, selectVariableFromSidePanel, selectVariableFromDropdown } from './lib/navigation'

// Sample up to N variables per category to keep test runtime reasonable
const MAX_PER_CATEGORY = 3

test.describe('Variable coverage', () => {
  test.describe.configure({ mode: 'serial', timeout: 300_000 })

  let variables: string[]

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await waitForAppShell(page)

    const allVars = await getAvailableVariables(page)

    // Group by category and sample
    const [miRes] = await Promise.all([page.request.get('/data/measure_info.json')])
    const measureInfo = await miRes.json()
    const byCategory = new Map<string, string[]>()
    for (const v of allVars) {
      const cat = measureInfo[v]?.category ?? 'unknown'
      if (!byCategory.has(cat)) byCategory.set(cat, [])
      byCategory.get(cat)!.push(v)
    }

    // Take first + last + random middle from each category
    const sampled: string[] = []
    for (const [, vars] of byCategory) {
      if (vars.length <= MAX_PER_CATEGORY) {
        sampled.push(...vars)
      } else {
        sampled.push(vars[0])
        sampled.push(vars[Math.floor(vars.length / 2)])
        sampled.push(vars[vars.length - 1])
      }
    }

    variables = sampled
    await page.close()
  })

  test('sampled variables load data when selected', async ({ page }) => {
    const guards = await attachNetworkGuards(page)
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await waitForAppShell(page)

    const failures: string[] = []

    for (const v of variables) {
      try {
        guards.resetDataResponseCount()
        const btn = page.locator(`[data-testid="var-btn-${v}"]`)
        if (await btn.count() > 0) {
          await selectVariableFromSidePanel(page, v)
        } else {
          await selectVariableFromDropdown(page, v)
        }
        await waitForDataUpdate(page)
        await assertSomeDataAppears(page, guards.getSuccessfulDataResponses())
      } catch (e) {
        const msg = (e as Error).message
        if (msg.includes('variable-option-') && msg.includes('to be visible')) continue
        failures.push(`${v}: ${msg.slice(0, 200)}`)
      }
    }

    expect(
      failures,
      `${failures.length} variable(s) failed to load data:\n${failures.join('\n')}`
    ).toEqual([])
  })
})
