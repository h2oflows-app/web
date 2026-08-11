import { computed, ref, toValue, watch, type ComputedRef, type MaybeRefOrGetter } from 'vue'

/**
 * useGaugeSeasonal — month-by-month percentile record for a gauge.
 *
 * Hoisted out of `GaugeSeasonalBanner`, which used to run this fetch in its own
 * `onMounted`. The sheet modal now has two consumers per gauge — the graph
 * (which draws the current month's p25/p50/p75 as reference lines when a gauge
 * has no flow ranges) and the Season & cycle drawer — so the request is shared
 * through a module-level cache: N consumers, 1 network call.
 *
 * Same endpoint, same shape, same silent-failure behaviour as before: a failed
 * fetch resolves to an empty record and the banner simply doesn't render.
 */
export interface MonthStats {
  month:    number
  mean:     number | null
  p10:      number | null
  p25:      number | null
  p50:      number | null
  p75:      number | null
  p90:      number | null
  count:    number
  coverage: number  // 0–1 relative to most-active month
}

export interface UseGaugeSeasonal {
  stats:        ComputedRef<MonthStats[]>
  currentMonth: ComputedRef<MonthStats | null>
  loading:      ComputedRef<boolean>
}

/** Matches useDiurnalCache's STALE_MS so the two gauge caches age alike. */
const STALE_MS = 15 * 60 * 1000

interface CacheEntry {
  req:       Promise<MonthStats[]>
  startedAt: number
}

/**
 * In-flight + settled requests, keyed by gauge id. A failed request evicts its
 * own key so a later mount can retry — which is exactly what the per-component
 * `onMounted` fetch used to do.
 *
 * `startedAt` is stamped when the request is issued rather than when it settles:
 * an in-flight entry is only ever seconds old, so the two differ by the
 * request's own duration and the simpler one can't leave a pending entry
 * looking infinitely fresh.
 */
const cache = new Map<string, CacheEntry>()

function fetchSeasonal(apiBase: string, gaugeId: string): Promise<MonthStats[]> {
  const hit = cache.get(gaugeId)
  // Reuse anything in flight or younger than the TTL; re-issue once it ages out
  // so a long-lived tab doesn't pin a month-old record.
  if (hit && Date.now() - hit.startedAt < STALE_MS) return hit.req

  const req: Promise<MonthStats[]> = (async () => {
    try {
      const res = await fetch(`${apiBase}/api/v1/gauges/${gaugeId}/seasonal`)
      if (!res.ok) {
        cache.delete(gaugeId)
        return []
      }
      return (await res.json()) as MonthStats[]
    } catch {
      /* non-fatal */
      cache.delete(gaugeId)
      return []
    }
  })()

  cache.set(gaugeId, { req, startedAt: Date.now() })
  return req
}

export function useGaugeSeasonal(
  gaugeId: MaybeRefOrGetter<string | null | undefined>,
): UseGaugeSeasonal {
  const { apiBase } = useRuntimeConfig().public

  const stats    = ref<MonthStats[]>([])
  const loading  = ref(false)
  const nowMonth = new Date().getMonth() + 1 // 1–12

  // Guards against a slow response for a previous gauge id landing last.
  let seq = 0

  watch(
    () => toValue(gaugeId),
    (id) => {
      const token = ++seq
      stats.value = []

      // Client-only, matching the old onMounted fetch — nothing to prerender here.
      if (!id || !import.meta.client) {
        loading.value = false
        return
      }

      loading.value = true
      void fetchSeasonal(apiBase, id).then((rows) => {
        if (token !== seq) return
        stats.value   = rows
        loading.value = false
      })
    },
    { immediate: true },
  )

  return {
    stats:        computed(() => stats.value),
    currentMonth: computed(() => stats.value.find(s => s.month === nowMonth) ?? null),
    loading:      computed(() => loading.value),
  }
}
