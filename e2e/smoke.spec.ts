import { test, expect } from '@playwright/test'
import { attachNetworkGuards, waitForAppShell, waitForDataUpdate, assertSomeDataAppears } from './lib/signals'

async function clickFirstUsefulNavLink(page: import('@playwright/test').Page) {
  const candidates = page
    .locator('a[href^="/"]')
    .filter({ hasNotText: /github|privacy|terms|mailto|http/i })

  const count = await candidates.count()
  for (let i = 0; i < Math.min(count, 30); i++) {
    const a = candidates.nth(i)
    if (!(await a.isVisible())) continue

    const href = (await a.getAttribute('href')) ?? ''
    if (!href || href === '/' || href.startsWith('/#')) continue

    await a.click()
    return
  }
}

test.describe('Dashboard smoke', () => {
  test('home loads and at least one data-driven view can be reached', async ({ page }) => {
    const guards = await attachNetworkGuards(page)

    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await waitForAppShell(page)

    await clickFirstUsefulNavLink(page)
    await waitForAppShell(page)
    await page.waitForTimeout(500)

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

  test('can click through a few internal links without blanking out data', async ({ page }) => {
    const guards = await attachNetworkGuards(page)

    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await waitForAppShell(page)

    for (let step = 0; step < 3; step++) {
      await clickFirstUsefulNavLink(page)
      await waitForAppShell(page)
      await page.waitForTimeout(500)
      await assertSomeDataAppears(page, guards.getSuccessfulDataResponses())
    }

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
