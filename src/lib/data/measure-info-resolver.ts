import type { MeasureInfoMap } from './types'

interface ResolvedVariable {
  name: string
  label: string
  category: string
}

/**
 * Build a lookup that resolves any variable name (including those expanded from
 * measure_info templates) to a display label and category.
 *
 * measure_info.json contains two kinds of entries:
 *  1. Direct entries (e.g., "disconnectedYouth") with a short_name and category.
 *  2. Template entries (e.g., "race_{variant.name}{category.name}") that expand
 *     into concrete variable names by combining variant keys and category keys.
 *
 * The dataset _meta.variables has only concrete, expanded names. This function
 * maps those concrete names back to the template, resolves {variant} and
 * {category} placeholders in short_name, and returns a human-readable label.
 */
export function resolveVariables(
  measureInfo: MeasureInfoMap,
  datasetVariableNames: string[]
): ResolvedVariable[] {
  // Build a map from expanded variable name -> resolved info
  const resolvedMap = new Map<string, { label: string; category: string }>()

  for (const [name, info] of Object.entries(measureInfo)) {
    if (name === '_references' || !info || typeof info !== 'object') continue
    const entry = info as Record<string, unknown>
    if (!('category' in entry)) continue

    const category = (entry.category as string) || 'Other'
    const shortName = (entry.short_name as string) || name

    if (!name.includes('{')) {
      // Direct entry
      resolvedMap.set(name, { label: shortName, category })
    } else {
      // Template entry — expand all variant x category combinations
      const variants = entry.variants as Record<string, Record<string, string>> | undefined
      const categories = entry.categories as Record<string, Record<string, string>> | undefined
      const hasVariants = variants && Object.keys(variants).length > 0
      const hasCategories = categories && Object.keys(categories).length > 0

      if (hasVariants && hasCategories) {
        for (const [varKey, varMeta] of Object.entries(variants)) {
          for (const [catKey, catMeta] of Object.entries(categories)) {
            const label = resolveLabel(shortName, varMeta, catMeta)
            for (const expanded of expandNames(name, varKey, catKey)) {
              resolvedMap.set(expanded, { label, category })
            }
          }
        }
      } else if (hasVariants) {
        for (const [varKey, varMeta] of Object.entries(variants)) {
          const label = resolveLabel(shortName, varMeta, null)
          for (const expanded of expandNames(name, varKey, null)) {
            resolvedMap.set(expanded, { label, category })
          }
        }
      } else if (hasCategories) {
        for (const [catKey, catMeta] of Object.entries(categories)) {
          const label = resolveLabel(shortName, null, catMeta)
          for (const expanded of expandNames(name, null, catKey)) {
            resolvedMap.set(expanded, { label, category })
          }
        }
      }
    }
  }

  return datasetVariableNames.map((varName) => {
    const resolved = resolvedMap.get(varName)
    if (resolved) {
      return { name: varName, label: resolved.label, category: resolved.category }
    }
    return { name: varName, label: formatFallbackLabel(varName), category: 'Other' }
  })
}

/**
 * Expand a template pattern name into a concrete variable name by substituting
 * variant and category keys into the placeholder positions.
 *
 * Examples:
 *   "race_{variant.name}{category.name}" + varKey="afr_amer_alone_percent" + catKey="_direct"
 *   -> "race_afr_amer_alone_percent_direct"
 *
 *   "{variant.name}_read_pass_rate" + varKey="median" + catKey=null
 *   -> "median_read_pass_rate"
 *
 *   "population{variant}{category.name}" + varKey="blank" + catKey="_direct"
 *   -> "population_direct"  (because "blank" is a special empty-string key)
 */
/**
 * Expand a template name into all possible concrete variable names.
 * Some keys (like "blank" for variants or "all" for categories) can mean
 * either their literal key or an empty string, depending on the template.
 * We return all possibilities and let the caller register each.
 */
function expandNames(pattern: string, varKey: string | null, catKey: string | null): string[] {
  const varOptions = varKey == null ? [''] : varKey === 'blank' ? ['', 'blank'] : [varKey]
  const catOptions = catKey == null ? [''] : catKey === 'all' ? ['', 'all'] : [catKey]

  const results: string[] = []
  for (const v of varOptions) {
    for (const c of catOptions) {
      const result = pattern
        .replace(/\{variant\.name\}/g, v)
        .replace(/\{variant\}/g, v)
        .replace(/\{category\.name\}/g, c)
        .replace(/\{category\}/g, c)
      results.push(result)
    }
  }
  return results
}

function resolveLabel(
  template: string,
  variantMeta: Record<string, string> | null,
  categoryMeta: Record<string, string> | null
): string {
  let label = template

  // Resolve {variant} and {variant.name} with variant's short_name, default, description, or long_name
  const variantValue = variantMeta
    ? (variantMeta.short_name || variantMeta.default || variantMeta.description || variantMeta.long_name || '')
    : ''
  label = label.replace(/\{variant\.name\}/g, variantValue)
  label = label.replace(/\{variant\}/g, variantValue)

  // Resolve {category} and {category.name} with category's short_name, default, description, or long_name
  const categoryValue = categoryMeta
    ? (categoryMeta.short_name || categoryMeta.default || categoryMeta.description || categoryMeta.long_name || '')
    : ''
  label = label.replace(/\{category\.name\}/g, categoryValue)
  label = label.replace(/\{category\}/g, categoryValue)

  // Clean up any remaining placeholders and extra whitespace
  label = label.replace(/\{[^}]+\}/g, '').replace(/\s+/g, ' ').trim()

  return label || template
}

function formatFallbackLabel(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Group resolved variables by category, sorted.
 */
export function groupByCategory(
  variables: ResolvedVariable[]
): { category: string; variables: { name: string; label: string }[] }[] {
  const groups = new Map<string, { name: string; label: string }[]>()
  for (const v of variables) {
    if (!groups.has(v.category)) groups.set(v.category, [])
    groups.get(v.category)!.push({ name: v.name, label: v.label })
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, vars]) => ({
      category,
      variables: vars.sort((a, b) => a.label.localeCompare(b.label)),
    }))
}
