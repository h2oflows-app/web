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
   * Index in the river's NHDPlus flowline order (mig 000151, web#392).
   *
   * The only key here that is not a proxy. Elevation and longitude both
   * *correlate* with flow direction and each fails predictably — elevation on
   * flat rivers (the Green through Canyonlands, the Menominee), longitude on
   * anything not flowing west→east. This is the network topology itself, so
   * it is right regardless of gradient or bearing.
   *
   * NULL when the river has not been sequenced yet, or when the run sits off
   * the sequenced mainstem (a tributary, or a put-in snapped to the far side
   * of a confluence).
   */
  sequence: number | null
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
 * Topological sequence ASC first, then elevation DESC, then longitude ASC.
 *
 * Each tier applies ONLY when both sides have that key. This is deliberately
 * not "whoever has the better key wins": a run carrying a sequence is never
 * blanket-prioritized ahead of one without, because that would hoist every
 * sequenced run above an unsequenced neighbour regardless of where the two
 * actually sit on the river. Partial data instead degrades to the next tier
 * (with its own null handling) rather than inventing an ordering.
 *
 * That matters in practice: a river can be partly sequenced. On the Colorado,
 * Cataract Canyon's put-in snapped to the Green side of the confluence and
 * Poudre tributary runs sit off the mainstem, so those keep a null sequence
 * while their neighbours have one — and comparing them by elevation is
 * exactly right.
 *
 * Runs missing every key sort last, in their original relative order.
 */
export function compareRiverPosition(a: RiverPosition, b: RiverPosition): number {
  if (a.sequence != null && b.sequence != null) return a.sequence - b.sequence
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
