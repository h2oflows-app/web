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
   * Since web#406 the server fills this in for runs it cannot survey — a fork,
   * a tributary run, a put-in snapped across a confluence — by interpolating
   * from put-in elevation against the river's surveyed runs
   * (`river_sequence_inferred = true`). So on a river that has been sequenced
   * at all, this is populated for every run carrying an elevation.
   *
   * Still NULL when the river has never been sequenced, or when a run has no
   * elevation to interpolate from. Both mean genuinely unordered.
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
 * Ascending, nulls last. Returns 0 for equal *or* both-null so the caller can
 * chain with `||` and fall to the next tier.
 */
function ascNullsLast(a: number | null, b: number | null): number {
  if (a == null) return b == null ? 0 : 1
  if (b == null) return -1
  return a - b
}

/** Descending, nulls last — same contract as {@link ascNullsLast}. */
function descNullsLast(a: number | null, b: number | null): number {
  if (a == null) return b == null ? 0 : 1
  if (b == null) return -1
  return b - a
}

/**
 * Compares two runs upstream → downstream.
 *
 * Topological sequence ASC, then elevation DESC, then longitude ASC — strict
 * lexicographic tiers, each placing nulls last, matching the server's
 * `ORDER BY river_sequence ASC NULLS LAST, put_in_elevation_ft DESC NULLS
 * LAST, ST_X(put_in) ASC` exactly (internal/handlers/users.go).
 *
 * This USED to apply each tier only when both sides had that key, so a run
 * with a sequence was never blanket-hoisted above one without. That reads
 * better and was wrong: it is not transitive, and a non-transitive comparator
 * makes Array.prototype.sort return an implementation-defined order rather
 * than throwing. Given
 *
 *     A(seq=1, 50ft)   B(no seq, 100ft)   C(seq=2, 150ft)
 *     A < C by sequence;  B < A by elevation;  C < B by elevation
 *
 * the relation cycles. It needed elevation to *contradict* topology to bite,
 * which is exactly the flat-river case topology exists for — so the defect was
 * latent precisely where the feature earns its keep (web#406).
 *
 * A pairwise comparator is transitive only if every tier is a total preorder,
 * i.e. nulls have a fixed position. So correctness for partially-sequenced
 * rivers cannot live here; it lives in the DATA. The server now interpolates a
 * sequence for runs it cannot survey (mig 000152), which is the same elevation
 * fallback applied once at write time instead of re-derived at every
 * comparison — and it leaves one total key rather than two partial ones.
 *
 * Runs missing every key sort last, in their original relative order.
 */
export function compareRiverPosition(a: RiverPosition, b: RiverPosition): number {
  return (
    ascNullsLast(a.sequence, b.sequence) ||
    descNullsLast(a.elevationFt, b.elevationFt) ||
    ascNullsLast(a.lng, b.lng)
  )
}

/**
 * Sorts a list of runs upstream → downstream, given how to read each one's
 * position. Returns a new array; the input is untouched (all three call sites
 * sort inside a computed, over props or store state).
 */
export function sortByRiverPosition<T>(items: T[], position: (item: T) => RiverPosition): T[] {
  return [...items].sort((a, b) => compareRiverPosition(position(a), position(b)))
}
