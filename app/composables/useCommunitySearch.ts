import { ref, computed } from 'vue'

// A row from GET /api/v1/discover/runs. Flow fields (current_cfs, flow_band,
// flow_color, gauge_id) arrived with api#212 — flow_color is the p<n> palette
// key resolved client-side via utils/flowBand (never trust flow_status; its
// server CASE went degenerate with mig 000129).
export interface DiscoverRun {
  id: string; slug: string; name: string; handle: string
  is_special: boolean
  class_min: number | null; class_max: number | null
  length_mi: number | null
  upvote_count: number
  last_forked_at: string | null
  gauge_name: string | null
  gauge_id: string | null
  current_cfs: number | null
  flow_band: string | null
  flow_color: string | null
  put_in_lng: number; put_in_lat: number
  original_author_handle: string | null
  fork_count: number
}

/**
 * Community-scope search state for /explore (web#335): the GaugeSearchModal
 * community tab's fetch logic, lifted, plus the map-source URL that keeps
 * RunsMap's pins equal to the list.
 *
 * Storm guard: RunsMap re-fetches on EVERY sourceUrl string change, so mapUrl
 * is updated only when a fresh (non-append) list fetch actually fires — one
 * settled search = one MapCommunity fetch, regardless of how many keystrokes
 * got debounced away. Load more never touches the map (the map is unpaged and
 * already shows the full filtered set).
 */
export function useCommunitySearch() {
  const { apiBase } = useRuntimeConfig().public

  const runs = ref<DiscoverRun[]>([])
  const loading = ref(false)
  const hasMore = ref(false)
  const offset = ref(0)
  const query = ref('')
  const minClass = ref<number | null>(null)
  const maxClass = ref<number | null>(null)
  const hasGauge = ref(false)
  const handleFilter = ref('')
  const inBand = ref(false)
  const mapUrl = ref<string | null>(null)
  const loadedOnce = ref(false)

  const activeFilterCount = computed(() => {
    let n = 0
    if (minClass.value != null) n++
    if (maxClass.value != null) n++
    if (hasGauge.value) n++
    if (handleFilter.value.trim()) n++
    if (inBand.value) n++
    return n
  })

  // One filter builder for both feeds so pins == list can't drift client-side
  // (the api guarantees it server-side via a shared parser, api#212).
  function filterParams(): URLSearchParams {
    const params = new URLSearchParams()
    if (query.value.trim()) params.set('q', query.value.trim())
    if (minClass.value != null) params.set('min_class', String(minClass.value))
    if (maxClass.value != null) params.set('max_class', String(maxClass.value))
    if (hasGauge.value) params.set('has_gauge', 'true')
    if (handleFilter.value.trim()) params.set('handle', handleFilter.value.trim().replace(/^@/, ''))
    if (inBand.value) params.set('in_band', 'true')
    return params
  }

  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  function onQueryInput() {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => { load(false) }, 350)
  }

  async function load(append = false) {
    if (!append) { offset.value = 0; runs.value = [] }
    loading.value = true
    try {
      const params = filterParams()
      if (!append) {
        // Sync the map to this exact filter set — assign only on real change
        // so RunsMap doesn't re-fetch when a reload lands on identical params.
        const qs = params.toString()
        const nextMapUrl = `${apiBase}/api/v1/user-runs/map/community${qs ? `?${qs}` : ''}`
        if (mapUrl.value !== nextMapUrl) mapUrl.value = nextMapUrl
      }
      params.set('limit', '20')
      params.set('offset', String(offset.value))
      const res = await fetch(`${apiBase}/api/v1/discover/runs?${params}`)
      if (!res.ok) return
      const data = await res.json()
      const items: DiscoverRun[] = data.items ?? []
      runs.value = append ? [...runs.value, ...items] : items
      hasMore.value = data.has_more ?? false
      offset.value += items.length
      loadedOnce.value = true
    } catch { /* non-fatal */ } finally {
      loading.value = false
    }
  }

  return {
    runs, loading, hasMore, query, minClass, maxClass, hasGauge, handleFilter,
    inBand, activeFilterCount, mapUrl, onQueryInput,
    reload: () => load(false),
    loadMore: () => load(true),
    loadedOnce,
  }
}

export type CommunitySearch = ReturnType<typeof useCommunitySearch>
