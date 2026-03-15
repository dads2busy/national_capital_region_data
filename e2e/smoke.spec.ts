import { test, expect } from '@playwright/test'
import { attachNetworkGuards, waitForAppShell, waitForDataUpdate, assertSomeDataAppears } from './lib/signals'

test.describe('Dashboard smoke', () => {
  test('home loads with data visible', async ({ page }) => {
    const guards = await attachNetworkGuards(page)

    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await waitForAppShell(page)
    await waitForDataUpdate(page)

    await assertSomeDataAppears(page, guards.getSuccessfulDataResponses())

    const failures = guards.getFailures()
    expect(
      failures,
      `Expected no failed requests, but saw:\n${failures
        .slice(0, 10)
        .map((f) => `- ${f.method} ${f.status ?? ''} ${f.url}`)
        .join('\n')}`
    ).toEqual([])
  })

  test('clicking a variable button loads new data', async ({ page }) => {
    const guards = await attachNetworkGuards(page)

    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await waitForAppShell(page)
    await waitForDataUpdate(page)

    // Find any variable button that is not already selected and click it
    const varButtons = page.locator('[data-testid^="var-btn-"]')
    const count = await varButtons.count()
    expect(count, 'Expected at least one variable button').toBeGreaterThan(0)

    // Click the second button (first might already be selected)
    const idx = count > 1 ? 1 : 0
    await varButtons.nth(idx).click()
    await waitForDataUpdate(page)

    await assertSomeDataAppears(page, guards.getSuccessfulDataResponses())

    const failures = guards.getFailures()
    expect(
      failures,
      `Expected no failed requests, but saw:\n${failures
        .slice(0, 10)
        .map((f) => `- ${f.method} ${f.status ?? ''} ${f.url}`)
        .join('\n')}`
    ).toEqual([])
  })
})
