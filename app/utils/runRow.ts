// Normalized view-model for the shared <RunRow> component (issue #329).
//
// Run rows are rendered from two different data shapes:
//   • UserReachSummary  — dashboard.vue's own runs (name is a link, cfs is
//     server-precomputed and static, flow falls back to the palette-aware
//     bandSolid/bandBadgeClass helpers).
//   • WatchedGauge      — reaches attached to a gauge group (name is plain,
//     the sparkline feeds a live cfs back into the badge, flow falls back to
//     a neutral gray).
//
// RunRow owns the *entire* flow resolution (primary band lookup + fallback +
// live cfs). The only per-family difference is the fallback chain, carried
// here as `fallbackFlavor` so the component keeps a single code path.

import type { WatchedGauge } from '~/stores/watchlist'

export interface RunRowVM {
  runId: string
  slug: string
  authorHandle: string | null
  label: string
  riverName: string | null

  // Base cfs — used until the sparkline emits a fresher live reading (only
  // when the consuming row sets `live-flow`).
  cfs: number | null

  // Sparkline source. A run has either a real gauge (gaugeId) or a custom
  // gauge (customGaugeSlug); gauge sub-rows carry neither.
  gaugeId: string | null
  customGaugeSlug: string | null
  pollHealth?: 'healthy' | 'degraded' | 'stale' | 'unreachable' | null
  lastReadingAt?: string | null
  // Passed through to GaugeSparkline; irrelevant to appearance while a color
  // override is set, but kept faithful to each call site's original value.
  sparklineFlowStatus: string

  // Card-only footer (dashboard runs only; groups leave these null).
  gaugeSource: string | null
  gaugeExternalId: string | null
  lastReadingLabel: string | null

  // Flow-band fallback, applied when no user threshold band matches the cfs.
  //   'palette' → flowBandLabel / bandSolid / bandBadgeClass on (rawBand,
  //               rawStatus); badge gate is the raw (rawStatus/rawBand).
  //   'neutral' → fallbackLabel verbatim, gray color/badge; badge gate is the
  //               resolved status/label.
  fallbackFlavor: 'palette' | 'neutral'
  rawBand: string | null
  rawStatus: string
  fallbackLabel: string | null
}

// Structural subset of dashboard.vue's UserReachSummary — declared locally so
// this util doesn't depend on the page. The page's fuller type satisfies it.
export interface UserReachLike {
  id: string
  slug: string
  name: string
  long_name: string | null
  river_name: string | null
  author_handle: string | null
  current_cfs: number | null
  flow_band: string | null
  flow_status: string
  gauge_id: string | null
  custom_gauge_slug: string | null
  gauge_source: string | null
  gauge_external_id: string | null
  last_reading_at: string | null
}

// Family A — dashboard's own runs. `lastReadingLabel` is passed in because it
// is produced by a page-scoped relative-time formatter.
export function userReachToRunRowVM(
  r: UserReachLike,
  opts: { lastReadingLabel?: string | null } = {},
): RunRowVM {
  return {
    runId: r.id,
    slug: r.slug,
    authorHandle: r.author_handle,
    label: r.name || r.long_name || r.slug,
    riverName: r.river_name,
    cfs: r.current_cfs,
    gaugeId: r.gauge_id,
    customGaugeSlug: r.custom_gauge_slug,
    // Dashboard's own-run sparklines never wired poll-health/last-reading, so
    // leave them null to keep the (non-compact, full-view) poll indicator
    // exactly as it was. The card footer uses `lastReadingLabel` instead.
    pollHealth: null,
    lastReadingAt: null,
    sparklineFlowStatus: r.flow_status,
    gaugeSource: r.gauge_source,
    gaugeExternalId: r.gauge_external_id,
    lastReadingLabel: opts.lastReadingLabel ?? null,
    fallbackFlavor: 'palette',
    rawBand: r.flow_band,
    rawStatus: r.flow_status,
    fallbackLabel: null,
  }
}

// Family B — a reach in a gauge group.
export function watchedGaugeToRunRowVM(g: WatchedGauge): RunRowVM {
  const label =
    g.contextReachCommonName ??
    g.contextReachFullName ??
    g.reachName ??
    g.name ??
    g.externalId
  return {
    runId: g.id,
    slug: g.contextReachSlug ?? '',
    authorHandle: g.contextReachAuthorHandle ?? null,
    label,
    riverName: g.contextReachRiverName ?? null,
    cfs: g.currentCfs,
    // Groups drive the sparkline off the gauge id; there is no custom-gauge case.
    gaugeId: g.id,
    customGaugeSlug: null,
    pollHealth: g.pollHealth,
    lastReadingAt: g.lastReadingAt,
    // Original group sparklines pass a constant "unknown" (color always overrides).
    sparklineFlowStatus: 'unknown',
    gaugeSource: null,
    gaugeExternalId: null,
    lastReadingLabel: null,
    fallbackFlavor: 'neutral',
    rawBand: null,
    rawStatus: g.flowStatus ?? 'unknown',
    fallbackLabel: g.flowBandLabel ?? null,
  }
}
