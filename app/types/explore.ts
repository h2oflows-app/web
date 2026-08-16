import type { ReachListItem } from '~/components/map/RunsMap.vue'

// A sidebar river group on /explore. name '__flat__' is the sentinel for the
// ungrouped (upvote-sorted) browse view — the header row is suppressed for it.
export interface ExploreReachGroup {
  name: string
  reaches: ReachListItem[]
}

// The three sidebar scopes of the redesigned /explore (web#335).
// 'mine' = today's map-fed run list; 'community' = global /discover/runs
// search; 'gauges' = custom + external gauge search.
export type ExploreScope = 'mine' | 'community' | 'gauges'

// Legacy tab key mapping: the old GaugeSearchModal called the community tab
// 'discover' and old deep links (?discover=true, ?scope=discover) still say
// so. One normalizer, same rule as the modal's normalizeTab.
export function normalizeExploreScope(v: unknown): ExploreScope | null {
  const s = typeof v === 'string' ? v.toLowerCase() : ''
  if (s === 'discover' || s === 'community') return 'community'
  if (s === 'mine' || s === 'gauges') return s
  return null
}
