import { Page } from '@playwright/test'

// --- Dashboard detection ---

let _dashboardName = ''

export async function getDashboardName(page: Page): Promise<string> {
  if (_dashboardName) return _dashboardName
  const res = await page.request.get('/data/datapackage.json')
  const pkg = await res.json()
  _dashboardName = pkg.name ?? ''
  return _dashboardName
}

export function isVA(name: string): boolean {
  return name === 'vdh_rural_health'
}

// --- Filter menu ---

export async function openFilterMenu(page: Page) {
  const filterMenu = page.locator('[data-testid="filter-menu"]')
  if (await filterMenu.count() > 0) return // already open
  // Click the Filter button in the navbar
  await page.locator('button', { hasText: /filter/i }).click()
  await filterMenu.waitFor({ state: 'visible', timeout: 5_000 })
}

// --- Variable selection ---

export async function selectVariableFromSidePanel(page: Page, variableKey: string) {
  const dashboardName = await getDashboardName(page)
  const btn = page.locator(`[data-testid="var-btn-${variableKey}"]`)

  if (!isVA(dashboardName)) {
    // NCR: categories may be collapsed; expand by clicking category headers until button is visible
    if (await btn.count() === 0 || !(await btn.isVisible())) {
      const categories = page.locator('[data-testid^="var-category-"]')
      const count = await categories.count()
      for (let i = 0; i < count; i++) {
        await categories.nth(i).click()
        if (await btn.isVisible().catch(() => false)) break
      }
    }
  }

  await btn.click()
}

export async function selectVariableFromDropdown(page: Page, variableKey: string) {
  await openFilterMenu(page)
  const trigger = page.locator('[data-testid="variable-dropdown"]')
  await trigger.click()
  const option = page.locator(`[data-testid="variable-option-${variableKey}"]`)
  await option.waitFor({ state: 'visible', timeout: 5_000 })
  await option.click()
}

// --- Layer switching ---

export async function switchLayer(page: Page, level: string) {
  await openFilterMenu(page)
  const dashboardName = await getDashboardName(page)

  if (isVA(dashboardName)) {
    const btn = page.locator(`[data-testid="layer-btn-${level}"]`)
    await btn.click()
  } else {
    await page.selectOption('[data-testid="layer-select"]', level)
  }
}

// --- Metric set (VA only) ---

export async function switchMetricSet(page: Page, set: string) {
  const tab = page.locator(`[data-testid="metric-tab-${set}"]`)
  await tab.click()
}

// --- Year navigation ---

export async function changeYear(page: Page, direction: 'prev' | 'next') {
  const btn = page.locator(`[data-testid="year-${direction}"]`)
  await btn.click()
}

export async function getCurrentYear(page: Page): Promise<number> {
  const input = page.locator('[data-testid="year-input"]')
  const val = await input.inputValue()
  return parseInt(val, 10)
}

// --- Variable list ---

interface MeasureInfo {
  [key: string]: { category: string; [k: string]: unknown }
}

interface DatapackageResource {
  name: string
  schema: { fields: { name: string }[] }
}

interface Datapackage {
  name: string
  resources: DatapackageResource[]
}

export async function getAvailableVariables(page: Page): Promise<string[]> {
  const [miRes, dpRes] = await Promise.all([
    page.request.get('/data/measure_info.json'),
    page.request.get('/data/datapackage.json'),
  ])
  const measureInfo: MeasureInfo = await miRes.json()
  const datapackage: Datapackage = await dpRes.json()

  const datapackageFields = new Set<string>()
  for (const resource of datapackage.resources) {
    for (const field of resource.schema.fields) {
      datapackageFields.add(field.name)
    }
  }

  return Object.keys(measureInfo).filter((key) => {
    if (key.endsWith('_geo10')) return false
    if (key === 'time') return false
    return datapackageFields.has(key)
  })
}
