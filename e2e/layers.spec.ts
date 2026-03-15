import { test, expect } from '@playwright/test'
import { attachNetworkGuards, waitForAppShell, waitForDataUpdate, assertSomeDataAppears } from './lib/signals'
import { switchLayer, getDashboardName, isVA } from './lib/navigation'

test.describe('Geographic layer switching', () => {
  test.describe.configure({ mode: 'serial' })

  test('can switch through all core layers with data loading', async ({ page }) => {
    const guards = await attachNetworkGuards(page)
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await waitForAppShell(page)

    const dashboardName = await getDashboardName(page)
    const layers = isVA(dashboardName)
      ? ['district', 'county', 'tract']
      : ['county', 'tract', 'block_group']

    for (const layer of layers) {
      await switchLayer(page, layer)
      await waitForDataUpdate(page)
      await assertSomeDataAppears(page, guards.getSuccessfulDataResponses())
    }

    const failures = guards.getFailures()
    expect(
      failures,
      `Failed requests during layer switching:\n${failures
        .map((f) => `- ${f.method} ${f.status ?? ''} ${f.url}`)
        .join('\n')}`
    ).toEqual([])
  })
})
