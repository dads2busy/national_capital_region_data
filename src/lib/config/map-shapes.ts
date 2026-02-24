/**
 * Map shape configuration for National Capital Region.
 * 8 geographic levels served from public/geo/.
 */

export interface MapShapeSource {
  name: string
  localPath: string
  idProperty: string
}

export const mapShapeSources: MapShapeSource[] = [
  { name: 'county', localPath: '/geo/county.geojson', idProperty: 'geoid' },
  { name: 'tract', localPath: '/geo/tract.geojson', idProperty: 'geoid' },
  { name: 'block_group', localPath: '/geo/block_group.geojson', idProperty: 'geoid' },
  { name: 'civic_association', localPath: '/geo/civic_association.geojson', idProperty: 'geoid' },
  { name: 'zip_code', localPath: '/geo/zip_code.geojson', idProperty: 'geoid' },
  { name: 'planning_district', localPath: '/geo/planning_district.geojson', idProperty: 'geoid' },
  { name: 'supervisor_district', localPath: '/geo/supervisor_district.geojson', idProperty: 'geoid' },
  { name: 'human_services_region', localPath: '/geo/human_services_region.geojson', idProperty: 'geoid' },
]

/** Map tile URLs for light and dark themes */
export const tileSources = {
  light: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
}

/** Default map center and zoom for National Capital Region (DC area) */
export const mapDefaults = {
  center: [38.9936, -77.3135] as [number, number],
  zoom: 8,
  height: '430px',
  bounds: [[38.0, -78.5], [39.8, -76.0]] as [[number, number], [number, number]],
}
