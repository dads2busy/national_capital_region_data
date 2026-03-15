import { expect, Page, Request } from '@playwright/test'

const APP_SHELL_TIMEOUT_MS = 30_000

export type DataSignal = {
  tablesWithRows: number
  plotlyCharts: number
  mapContainers: number
  successfulDataResponses: number
}

export async function collectDataSignals(page: Page): Promise<DataSignal> {
  const dom = await page.evaluate(() => {
    function isVisible(el: HTMLElement) {
      const style = window.getComputedStyle(el)
      const rect = el.getBoundingClientRect()
      return (
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        rect.width > 0 &&
        rect.height > 0 &&
        rect.bottom >= 0 &&
        rect.right >= 0
      )
    }

    const tables = Array.from(document.querySelectorAll('table')).filter(
      (t) => t instanceof HTMLTableElement && isVisible(t as unknown as HTMLElement)
    ) as HTMLTableElement[]

    const tablesWithRows = tables.filter((t) => {
      const bodyRows = t.tBodies?.[0]?.rows?.length ?? 0
      if (bodyRows > 0) return true
      return (t.rows?.length ?? 0) >= 2
    }).length

    const plotlyCharts = Array.from(document.querySelectorAll('.js-plotly-plot')).filter((el) =>
      isVisible(el as HTMLElement)
    ).length

    const mapContainers = Array.from(document.querySelectorAll('.leaflet-container')).filter((el) =>
      isVisible(el as HTMLElement)
    ).length

    return { tablesWithRows, plotlyCharts, mapContainers }
  })

  return { ...dom, successfulDataResponses: 0 }
}

export function looksLikeDataUrl(url: string): boolean {
  return (
    url.includes('/data/') &&
    (url.endsWith('.json') || url.includes('.json?') || url.endsWith('.csv') || url.includes('.csv?'))
  )
}

export async function attachNetworkGuards(page: Page) {
  const failures: { url: string; status?: number; method: string }[] = []
  let successfulDataResponses = 0

  page.on('requestfailed', (req: Request) => {
    const url = req.url()
    if (url.includes('favicon')) return
    failures.push({ url, method: req.method() })
  })

  page.on('response', async (res) => {
    const url = res.url()
    if (!looksLikeDataUrl(url)) return
    if (res.ok()) {
      successfulDataResponses += 1
      return
    }
    failures.push({ url, status: res.status(), method: res.request().method() })
  })

  return {
    getFailures: () => failures.slice(),
    getSuccessfulDataResponses: () => successfulDataResponses,
    resetDataResponseCount: () => { successfulDataResponses = 0 },
  }
}

export async function waitForAppShell(page: Page) {
  await page.waitForLoadState('domcontentloaded')
  await page.waitForLoadState('networkidle', { timeout: APP_SHELL_TIMEOUT_MS }).catch(() => {})
  await expect(page.locator('body')).toBeVisible()
}

export async function waitForDataUpdate(page: Page) {
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
  await page.waitForTimeout(500)
}

export async function assertSomeDataAppears(page: Page, successfulDataResponses: number) {
  const signals = await collectDataSignals(page)
  signals.successfulDataResponses = successfulDataResponses

  const totalSignals =
    signals.tablesWithRows + signals.plotlyCharts + signals.mapContainers + signals.successfulDataResponses

  expect(
    totalSignals,
    `Expected at least one data signal, got:\n` +
    `tablesWithRows=${signals.tablesWithRows}\n` +
    `plotlyCharts=${signals.plotlyCharts}\n` +
    `mapContainers=${signals.mapContainers}\n` +
    `successfulDataResponses=${signals.successfulDataResponses}\n` +
    `URL=${page.url()}`
  ).toBeGreaterThan(0)

  if (signals.tablesWithRows > 0) {
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.toLowerCase()).not.toContain('no data')
  }
}
