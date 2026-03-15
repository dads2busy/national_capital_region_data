import { test, expect } from '@playwright/test'
import { attachNetworkGuards, waitForAppShell, waitForDataUpdate, assertSomeDataAppears } from './lib/signals'
import { getAvailableVariables, selectVariableFromSidePanel, selectVariableFromDropdown } from './lib/navigation'

test.describe('Variable coverage', () => {
  test.describe.configure({ mode: 'serial', timeout: 300_000 })

  let variables: string[]

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage()
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await waitForAppShell(page)
    variables = await getAvailableVariables(page)
    await page.close()
  })

  test('every variable loads data when selected', async ({ page }) => {
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
        failures.push(`${v}: ${(e as Error).message.slice(0, 200)}`)
      }
    }

    expect(
      failures,
      `${failures.length} variable(s) failed to load data:\n${failures.join('\n')}`
    ).toEqual([])
  })
})
