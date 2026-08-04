// Upstream → downstream ordering, shared by every surface that lists runs
// grouped by river: the dashboard, the explore sidebar, and /my/runs.
//
// Each of those grew its own copy of this comparator as the ordering work
// landed (web#386 → #377 → #397 → #403), and the copies had to be kept
// byte-identical by hand so two surfaces never disagreed about the same data.
// This is that comparator, once.
//
// Note this orders runs *within* one river. Grouping and group ordering stay
// with the caller — the surfaces disagree there legitimately (the dashboard
// groups by basin then river, explore and /my/runs group by river alone).

/**
 * The two keys that place a run on its river, in tier order.
 */
export interface RiverPosition {
  /**
   * Put-in elevation in feet (mig 000150). Higher = further upstream.
   * Direction-agnostic, which is why it supersedes longitude: the old
   * "west = upstream" heuristic (web#386) was backwards for north/south-
   * flowing rivers.
   */
  elevationFt: number | null
  /**
   * Put-in longitude. Fallback tier only, carrying the original
   * "west = upstream for Colorado rivers" convention.
   */
  lng: number | null
}

/**
 * Compares two runs upstream → downstream.
 *
 * Elevation DESC first, longitude ASC as the fallback. The fallback applies
 * ONLY when elevation is null on either side of a given comparison — this is
 * deliberately not "whoever has elevation wins", so a run with elevation data
 * is never blanket-prioritized ahead of one without it. Partial data degrades
 * to the longitude comparison (including its own null handling) rather than
 * introducing a third tier that neither key justifies.
 *
 * Runs missing both keys sort last, in their original relative order.
 */
export function compareRiverPosition(a: RiverPosition, b: RiverPosition): number {
  if (a.elevationFt != null && b.elevationFt != null) return b.elevationFt - a.elevationFt
  if (a.lng == null && b.lng == null) return 0
  if (a.lng == null) return 1
  if (b.lng == null) return -1
  return a.lng - b.lng
}

/**
 * Sorts a list of runs upstream → downstream, given how to read each one's
 * position. Returns a new array; the input is untouched (all three call sites
 * sort inside a computed, over props or store state).
 */
export function sortByRiverPosition<T>(items: T[], position: (item: T) => RiverPosition): T[] {
  return [...items].sort((a, b) => compareRiverPosition(position(a), position(b)))
}
