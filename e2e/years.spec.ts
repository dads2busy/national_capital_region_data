import { test, expect } from '@playwright/test'
import { attachNetworkGuards, waitForAppShell, waitForDataUpdate, assertSomeDataAppears } from './lib/signals'
import { changeYear, getCurrentYear } from './lib/navigation'

test.describe('Year navigation', () => {
  test('can navigate years and data persists', async ({ page }) => {
    const guards = await attachNetworkGuards(page)
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await waitForAppShell(page)
    await waitForDataUpdate(page)

    const startYear = await getCurrentYear(page)

    const nextBtn = page.locator('[data-testid="year-next"]')
    const prevBtn = page.locator('[data-testid="year-prev"]')

    // Try navigating forward (skip if already at max)
    if (!(await nextBtn.isDisabled())) {
      await changeYear(page, 'next')
      await waitForDataUpdate(page)
      const afterNext = await getCurrentYear(page)
      expect(afterNext).toBe(startYear + 1)
      await assertSomeDataAppears(page, guards.getSuccessfulDataResponses())
    }

    // Navigate backward (should always work unless at min)
    if (!(await prevBtn.isDisabled())) {
      guards.resetDataResponseCount()
      await changeYear(page, 'prev')
      await waitForDataUpdate(page)
      await assertSomeDataAppears(page, guards.getSuccessfulDataResponses())
    }
  })

  test('prev button disabled at min year', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await waitForAppShell(page)

    const prevBtn = page.locator('[data-testid="year-prev"]')
    for (let i = 0; i < 30; i++) {
      if (await prevBtn.isDisabled()) break
      await prevBtn.click()
      await page.waitForTimeout(100)
    }
    await expect(prevBtn).toBeDisabled()
  })

  test('next button disabled at max year', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await waitForAppShell(page)

    const nextBtn = page.locator('[data-testid="year-next"]')
    for (let i = 0; i < 30; i++) {
      if (await nextBtn.isDisabled()) break
      await nextBtn.click()
      await page.waitForTimeout(100)
    }
    await expect(nextBtn).toBeDisabled()
  })
})
