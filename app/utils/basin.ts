export function cleanBasinName(name: string | null): string | null {
  if (!name) return null
  const cleaned = name
    .replace(/^(Upper|Middle|Lower)\s+/i, '')
    .replace(/\s+(River|Rivers|Basin)s?$/i, '')
    .trim()
  return cleaned || null
}

// basinLabel — render a basin name for display, appending "Basin" only when
// the value doesn't already end with it.
//
// Stored basin values are deliberately suffix-free ("Arkansas", not "Arkansas
// River Basin") — CanonicalBasin in the api says so explicitly — so display
// sites append the word themselves.
//
// That holds for NLDI-derived values, which also pass through cleanBasinName
// above. It does NOT hold for a user's own override: resolveBasinForRun /
// resolveBasinForGauge return the override RAW and deliberately skip
// cleanBasinName (which would strip an intentional "Upper"/"Lower" prefix,
// turning "Upper Colorado" into "Colorado"). So someone typing "South Platte
// Basin" in the run edit form would otherwise render "South Platte Basin
// Basin". Collapse the duplicate here rather than instructing people not to
// type it.
export function basinLabel(name: string | null | undefined): string {
  const trimmed = (name ?? '').trim()
  if (!trimmed) return 'Basin'
  // Case-insensitive, and \b so a name merely ending in those letters isn't
  // mistaken for the suffix.
  return /\bbasin$/i.test(trimmed) ? trimmed : `${trimmed} Basin`
}

export function slugifyBasin(name: string): string {
  return (cleanBasinName(name) ?? name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
