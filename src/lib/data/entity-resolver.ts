import type { EntityInfoMap } from './types'

/**
 * Resolve an entity ID to a display name using entity_info.json.
 * Searches the specific geo level first, then falls back to all levels.
 */
export function resolveEntityName(
  entityInfo: EntityInfoMap | null,
  entityId: string,
  geoLevel?: string
): string {
  if (!entityInfo) return entityId

  // Try the specific geo level first
  if (geoLevel && entityInfo[geoLevel]?.[entityId]) {
    return entityInfo[geoLevel][entityId].name
  }

  // Search all levels
  for (const level of Object.values(entityInfo)) {
    if (level[entityId]) return level[entityId].name
  }

  return entityId
}
