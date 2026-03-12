import type { DataLookup, MeasureInfoMap, Datapackage, GeoJSONFeatureCollection, DatasetName, EntityInfoMap } from './types'

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
const dataCache = new Map<string, unknown>()

/** Datasets served as gzip-compressed .json.gz (too large for regular git) */
const GZIPPED_DATASETS = new Set<string>(['tract', 'block_group'])

async function fetchJson<T>(url: string, cacheKey?: string): Promise<T> {
  const key = cacheKey || url
  if (dataCache.has(key)) return dataCache.get(key) as T

  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`)
  const data = (await response.json()) as T
  dataCache.set(key, data)
  return data
}

/** Fetch a gzip-compressed JSON file and decompress it in the browser */
async function fetchGzippedJson<T>(url: string, cacheKey?: string): Promise<T> {
  const key = cacheKey || url
  if (dataCache.has(key)) return dataCache.get(key) as T

  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`)

  const ds = new DecompressionStream('gzip')
  const decompressed = response.body!.pipeThrough(ds)
  const text = await new Response(decompressed).text()
  const data = JSON.parse(text) as T
  dataCache.set(key, data)
  return data
}

/** Load a dataset lookup JSON (gzip-compressed for large datasets) */
export async function loadDataset(name: DatasetName): Promise<DataLookup> {
  if (GZIPPED_DATASETS.has(name)) {
    return fetchGzippedJson<DataLookup>(`${basePath}/data/${name}.json.gz`, `dataset:${name}`)
  }
  return fetchJson<DataLookup>(`${basePath}/data/${name}.json`, `dataset:${name}`)
}

/** Load measure_info.json */
export async function loadMeasureInfo(): Promise<MeasureInfoMap> {
  return fetchJson<MeasureInfoMap>(`${basePath}/data/measure_info.json`, 'measure_info')
}

/** Load datapackage.json */
export async function loadDatapackage(): Promise<Datapackage> {
  return fetchJson<Datapackage>(`${basePath}/data/datapackage.json`, 'datapackage')
}

/** Load entity_info.json */
export async function loadEntityInfo(): Promise<EntityInfoMap> {
  return fetchJson<EntityInfoMap>(`${basePath}/data/entity_info.json`, 'entity_info')
}

/** Load a GeoJSON shape file */
export async function loadGeoJson(path: string): Promise<GeoJSONFeatureCollection> {
  const url = path.startsWith('/') ? `${basePath}${path}` : path
  const raw = await fetchJson<GeoJSONFeatureCollection & Record<string, unknown>>(url, `geo:${path}`)
  // Strip non-standard top-level properties (e.g. "name", "crs") that cause
  // Leaflet to reject the object with "Invalid GeoJSON object"
  return { type: raw.type, features: raw.features }
}

/** Check if a dataset is already cached */
export function isDatasetCached(name: DatasetName): boolean {
  return dataCache.has(`dataset:${name}`)
}

/** Clear all cached data */
export function clearCache(): void {
  dataCache.clear()
}

/**
 * Load the initial set of data needed for the dashboard:
 * - county.json (default view)
 * - measure_info.json
 * - datapackage.json
 * - entity_info.json
 *
 * All other datasets are loaded lazily when their layer is selected.
 */
export async function loadInitialData(): Promise<{
  county: DataLookup
  measureInfo: MeasureInfoMap
  datapackage: Datapackage
  entityInfo: EntityInfoMap
}> {
  const [county, measureInfo, datapackage, entityInfo] = await Promise.all([
    loadDataset('county'),
    loadMeasureInfo(),
    loadDatapackage(),
    loadEntityInfo(),
  ])

  return { county, measureInfo, datapackage, entityInfo }
}
