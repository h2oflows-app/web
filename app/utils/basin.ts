// Default display-name overrides for HUC-derived basin labels that are
// technically correct but unfamiliar to users. Per-user basin overrides
// (from /me/basin-overrides) layer on top of these at grouping time in
// dashboard.vue — this table only fires when no user override exists.
//
// Key   = raw rivers.basin value (result of gaugecore.CanonicalBasin)
// Value = friendlier display label
//
// Keep this list minimal — only add entries that are genuinely confusing.
// "South Platte" and "North Platte" are already returned by CanonicalBasin
// for the correct HUC4 prefixes; "Missouri" appears for other HUC10xx
// sub-basins (e.g. Cheyenne, Niobrara) that legitimately belong to the
// Missouri drainage. Do not map those unless a specific user case arises.
const GLOBAL_BASIN_DEFAULTS: Record<string, string> = {
  // No global defaults needed yet — CanonicalBasin in the API already handles
  // the South Platte / North Platte / Missouri disambiguation at HUC4 level.
  // Add entries here when a canonical basin label proves consistently
  // confusing across all users (user-specific cases → /me/basin-overrides).
}

export function cleanBasinName(name: string | null): string | null {
  if (!name) return null

  // Apply global well-known defaults before stripping suffixes, so that
  // "South Platte" stays "South Platte" rather than being stripped to nothing.
  if (GLOBAL_BASIN_DEFAULTS[name]) return GLOBAL_BASIN_DEFAULTS[name]

  const cleaned = name
    .replace(/^(Upper|Middle|Lower)\s+/i, '')
    .replace(/\s+(River|Rivers|Basin)s?$/i, '')
    .trim()
  return cleaned || null
}

export function slugifyBasin(name: string): string {
  return (cleanBasinName(name) ?? name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
