// useSeason — GET /me/season?year= (Trip Calendar #246 W6). useState (not a
// plain module ref, unlike useCalendar) — CalendarMenuHeader mounts inside
// AppHeader on EVERY page, including ssr:true ones (index.vue, explore,
// runs/[slug]/[run].vue), so a plain module-level cache would leak across
// unrelated SSR requests the way useCalendar's own doc comment warns against
// (mirrors useInvites' identical rationale). 60s client-side TTL per year,
// keyed in a useState record so it stays request-scoped on the server and a
// hydrated singleton on the client.

export interface SeasonHighestFlow {
  cfs: number
  plan_run_id: string
  slug?: string
  run_name?: string
  date?: string
}

export interface SeasonNewRun {
  slug: string
  name: string
  date: string
}

// web#354 A1: seasonRecentRun (nudges.go) has no plan_id — runs are
// decoupled from events entirely.
export interface SeasonRecentRun {
  id: string
  slug: string
  name?: string | null
  run_date: string
  flow_band?: string | null
  flow_color?: string | null
  gauge_cfs?: number | null
  notes?: string | null
}

export interface SeasonStats {
  days_on_water: number
  rivers: number
  runs: number
  streak: number
  highest_flow?: SeasonHighestFlow | null
  new_runs: SeasonNewRun[]
  goal_days?: number | null
  recent: SeasonRecentRun[]
}

const TTL_MS = 60_000

export function useSeason() {
  const stats = useState<SeasonStats | null>('season:stats', () => null)
  const loading = useState<boolean>('season:loading', () => false)
  const loaded = useState<boolean>('season:loaded', () => false)
  const currentYear = useState<number | null>('season:current-year', () => null)
  const cache = useState<Record<number, { data: SeasonStats; at: number }>>('season:cache', () => ({}))

  const { apiBase } = useRuntimeConfig().public
  const { getToken } = useAuth()

  async function load(year?: number, force = false): Promise<void> {
    const y = year ?? new Date().getFullYear()
    const cached = cache.value[y]
    if (!force && cached && Date.now() - cached.at < TTL_MS) {
      stats.value = cached.data
      currentYear.value = y
      loaded.value = true
      return
    }
    loading.value = true
    const token = await getToken()
    if (!token) {
      loading.value = false
      loaded.value = true
      return
    }
    const res = await fetch(`${apiBase}/api/v1/me/season?year=${y}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => null)
    loading.value = false
    loaded.value = true
    if (!res?.ok) return
    const data = await res.json().catch(() => null)
    if (!data) return
    cache.value = { ...cache.value, [y]: { data, at: Date.now() } }
    stats.value = data
    currentYear.value = y
  }

  // Refetches the currently-loaded year, bypassing its TTL — used after a
  // goal-edit PATCH so the hero reflects the new goal_days immediately.
  async function refresh(): Promise<void> {
    await load(currentYear.value ?? undefined, true)
  }

  return { stats, loading, loaded, currentYear, load, refresh }
}
