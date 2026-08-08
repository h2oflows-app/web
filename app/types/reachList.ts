// The shared shape of a run as it appears in a browse list (#411).
//
// There used to be two separate interfaces named `ReachListItem` — one in
// components/map/RunsMap.vue, one in components/run/RunBrowseRow.vue —
// describing the same domain object with different fields, and consumers
// imported whichever was nearest.
//
// That drift caused a real bug. web#405 added the upstream→downstream sort keys
// to the RunBrowseRow declaration, but the explore sidebar imports the RunsMap
// one, so `sortReachesByRiverPosition` sorted on `r.river_sequence` against a
// type that never declared it. It worked at runtime because the API supplies
// the field; nothing surfaced the mismatch until vue-tsc landed in web#409,
// two PRs and a deploy later.
//
// Everything genuinely common now lives here once — identity, flow, and above
// all the three sort keys, which is where the bug was. The two components each
// extend it with the fields they legitimately differ on: map/pin concerns for
// one, row-rendering concerns for the other.

/**
 * The four values the API's flow-status CASE can emit. Previously `string` on
 * the map side and this union on the row side, for the same field.
 */
export type FlowStatus = 'runnable' | 'caution' | 'flood' | 'unknown'

/**
 * Fields every browse-list run carries, from every endpoint that serves one.
 */
export interface ReachListItemBase {
  slug: string
  name: string
  river_name: string | null
  common_name: string | null
  class_max: number | null
  current_cfs: number | null
  flow_status: FlowStatus
  gauge_id: string | null
  author_handle: string | null

  /**
   * Upstream→downstream sort keys, in tier order — see utils/riverPosition.ts.
   *
   * REQUIRED, not optional, deliberately. They were optional on the row side
   * and every producer that forgot them silently sorted on undefined. Making
   * them required means a new endpoint cannot feed a browse list without
   * deciding what a run's position is.
   *
   * `river_sequence` is the exact NHDPlus topological key (mig 000151); the
   * other two are the documented proxy fallbacks, null on runs the topology
   * sweep hasn't covered.
   */
  river_sequence: number | null
  put_in_elevation_ft: number | null
  put_in_lng: number | null
}
