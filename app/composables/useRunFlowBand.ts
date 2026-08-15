import type { FlowBands } from '~/utils/flowBand'
import { bandForCfs as computeBandForCfs, flowStatusForColorKey } from '~/utils/flowBand'

/** A run whose flow-ranges lookup failed is cached too, so the next prefetch
 *  doesn't re-issue the request (#429): `GaugeRunGroup` and `DashboardRunGroup`
 *  prefetch on mount AND on every items change, so an uncached miss re-requests
 *  on more or less every re-render.
 *
 *  It expires rather than sticking for the session because not every failure is
 *  permanent — a prefetch that fires before auth has settled 401s on the `/me/`
 *  path, and a run with no author handle has no public path to fall back to. A
 *  session-long tombstone would hide that run's bands until a reload. At this
 *  TTL a genuinely band-less run costs one request per 5 minutes it stays on
 *  screen instead of one per render. */
const NEGATIVE_TTL_MS = 5 * 60_000

interface CacheEntry {
  bands: FlowBands | null  // null = the lookup failed
  at:    number            // epoch ms of the attempt; only read for misses
}

/** In-flight lookups, keyed by slug. Deliberately NOT `useState`: it holds
 *  promises, which don't survive payload serialization, and it only ever
 *  collapses duplicates inside one client session. The server never populates
 *  it — a module-level map there would be shared across requests. */
const inflight = new Map<string, Promise<void>>()

export function useRunFlowBand() {
  const { apiBase } = useRuntimeConfig().public
  const { getToken } = useAuth()
  // Shared across every component instance so a parent's prefetch is visible to
  // the child rows that resolve bands from it (e.g. <RunRow>, which owns band
  // resolution but not prefetching). useState scopes it per-request on the
  // server — no cross-request bleed — and dedupes fetches app-wide.
  const cache = useState<Record<string, CacheEntry>>('run-flow-band-cache', () => ({}))

  // Hits never expire (flow ranges are edited by hand, and re-fetching them on
  // a live dashboard is the cost this cache exists to avoid); misses do.
  function isCached(slug: string): boolean {
    const entry = cache.value[slug]
    if (!entry) return false
    return entry.bands !== null || Date.now() - entry.at < NEGATIVE_TTL_MS
  }

  async function lookup(slug: string, handle?: string | null) {
    try {
      const token = await getToken()
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
      const meRes = await fetch(`${apiBase}/api/v1/me/runs/${slug}/flow-ranges`, { headers })
      if (meRes.ok) { cache.value[slug] = { bands: await meRes.json(), at: Date.now() }; return }
      // Not the caller's own run — fall back to public handle-scoped endpoint.
      if (handle) {
        const pubRes = await fetch(`${apiBase}/api/v1/users/${handle}/runs/${slug}/flow-ranges`)
        if (pubRes.ok) { cache.value[slug] = { bands: await pubRes.json(), at: Date.now() }; return }
      }
      cache.value[slug] = { bands: null, at: Date.now() }
    } catch {
      // A thrown fetch (offline, CORS, aborted) is a miss like any other —
      // tombstone it so it retries on the TTL, not on the next render.
      cache.value[slug] = { bands: null, at: Date.now() }
    }
  }

  function prefetch(slug: string, handle?: string | null): Promise<void> {
    if (isCached(slug)) return Promise.resolve()
    // The check above sits in front of an await, so without this two callers in
    // the same tick — GaugeRunGroup's onMounted and its reachItems watcher —
    // would each issue the same request.
    const pending = inflight.get(slug)
    if (pending) return pending
    const run = lookup(slug, handle).finally(() => inflight.delete(slug))
    if (import.meta.client) inflight.set(slug, run)
    return run
  }

  // V9: highest threshold where cfs >= value; else base. Returns null when no data.
  function bandForCfs(
    slug: string | null | undefined,
    cfs: number | null | undefined,
  ): { label: string; color: string } | null {
    if (!slug || cfs == null) return null
    const bands = cache.value[slug]?.bands
    if (!bands) return null
    return computeBandForCfs(cfs, bands)
  }

  /** Re-read one run's bands after a write to them (#441).
   *
   *  Hits never expire — flow ranges only change when a human edits them — so
   *  the cache is only correct if the edit path says so. The wizard's save
   *  PUTs `/me/runs/{slug}/flow-ranges` and then routes back to the dashboard,
   *  which is still the same client session: `useState` survives client-side
   *  navigation, so without this the dashboard keeps colouring the row from
   *  the pre-edit thresholds until a full page reload wipes the payload.
   *
   *  A failed re-read is cleared rather than left as a tombstone: this is a
   *  one-shot call on a known-good write, so the 5-minute anti-thrash TTL that
   *  protects render-loop prefetches would only suppress the dashboard's own
   *  next attempt. Empty means "unknown", and unknown re-fetches. */
  async function refresh(slug: string, handle?: string | null): Promise<void> {
    delete cache.value[slug]
    await lookup(slug, handle)
    if (cache.value[slug]?.bands === null) delete cache.value[slug]
  }

  function statusForColor(colorKey: string | null | undefined): string {
    return flowStatusForColorKey(colorKey)
  }

  return { prefetch, refresh, bandForCfs, statusForColor }
}
