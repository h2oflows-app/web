import { ref } from 'vue'
import { clientTz } from '~/utils/calendarDate'

// TS types — Trip Calendar (#246). Never bare `Run`/`Report`: a CalendarRun
// is a `plan_runs` row (a dated log entry inside a Plan), distinct from a
// river run (`user_reaches`, rendered by RunRow.vue).
export interface CalendarRun {
  id: string
  user_reach_id?: string
  name?: string
  flow_band?: string
  flow_color?: string
  gauge_cfs?: number
  paddled: boolean
  run_time?: string
  plan_id: string
}

export interface CalendarDay {
  date: string // YYYY-MM-DD
  runs: CalendarRun[]
  needs_confirm: boolean // A5 data always empty for now — see day-cell TODO(W6)
}

export type PlanRole = 'own' | 'member' | 'invited'

export interface CalendarPlan {
  id: string
  slug: string
  name: string
  type: string
  start_date: string
  end_date: string
  visibility: string
  role: PlanRole
  member_status?: string
}

interface RangeCache {
  from: string
  to: string
  days: CalendarDay[]
  plans: CalendarPlan[]
  nudgeDotDates: string[]
}

// Module-level state — shared across all composable calls in the same page
// lifecycle (mirrors useDashboards). Safe only because /calendar is
// ssr:false (a module ref would otherwise leak across SSR requests).
const cache = new Map<string, RangeCache>()
const days = ref<CalendarDay[]>([])
const plans = ref<CalendarPlan[]>([])
const nudgeDots = ref<string[]>([])
const loading = ref(false)
const lastRange = ref<{ from: string; to: string; key: string } | null>(null)

// Shared "jump to this date" signal — set by PlanCreateSheet after a
// successful create so calendar/index.vue can flip its month view to
// contain the new plan's start_date (works whether the sheet was opened
// from /calendar itself or navigated to from elsewhere, e.g. the tab-bar +).
export function useCalendarFocusDate() {
  const focusDate = useState<string | null>('calendar:focus-date', () => null)
  return focusDate
}

export function useCalendar() {
  const { apiBase } = useRuntimeConfig().public
  const { getToken } = useAuth()

  async function fetchRange(from: string, to: string): Promise<RangeCache | null> {
    const token = await getToken()
    if (!token) return null
    const tz = clientTz()
    const url = `${apiBase}/api/v1/me/calendar?from=${from}&to=${to}&tz=${encodeURIComponent(tz)}`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null)
    if (!res?.ok) return null
    const data = await res.json()
    return { from, to, days: data.days ?? [], plans: data.plans ?? [], nudgeDotDates: data.nudge_dot_dates ?? [] }
  }

  // cacheKey defaults to the from/to pair; callers with a natural key (e.g.
  // a `YYYY-MM` month, or `year:YYYY`) should pass one so repeat visits to
  // the same month/year don't refetch.
  async function loadRange(from: string, to: string, cacheKey?: string, force = false) {
    const key = cacheKey ?? `${from}|${to}`
    if (!force && cache.has(key)) {
      const c = cache.get(key)!
      days.value = c.days
      plans.value = c.plans
      nudgeDots.value = c.nudgeDotDates
      lastRange.value = { from, to, key }
      return
    }
    loading.value = true
    const result = await fetchRange(from, to)
    loading.value = false
    if (!result) return
    cache.set(key, result)
    days.value = result.days
    plans.value = result.plans
    nudgeDots.value = result.nudgeDotDates
    lastRange.value = { from, to, key }
  }

  // Refetches the most recently loaded range, bypassing its cache entry —
  // used after any plan/run mutation so the grid reflects server truth.
  async function refresh() {
    if (!lastRange.value) return
    await loadRange(lastRange.value.from, lastRange.value.to, lastRange.value.key, true)
  }

  // ── Optimistic helpers (create-then-refresh pattern, usePlans) ──────────

  function insertPlanOptimistic(plan: CalendarPlan) {
    plans.value = [...plans.value, plan]
  }

  function removePlanOptimistic(id: string) {
    plans.value = plans.value.filter(p => p.id !== id)
  }

  function insertRunOptimistic(date: string, run: CalendarRun) {
    const idx = days.value.findIndex(d => d.date === date)
    if (idx >= 0) {
      const next = [...days.value]
      next[idx] = { ...next[idx], runs: [...next[idx].runs, run] }
      days.value = next
    } else {
      days.value = [...days.value, { date, runs: [run], needs_confirm: false }]
        .sort((a, b) => a.date.localeCompare(b.date))
    }
  }

  function removeRunOptimistic(date: string, runId: string) {
    const idx = days.value.findIndex(d => d.date === date)
    if (idx < 0) return
    const next = [...days.value]
    next[idx] = { ...next[idx], runs: next[idx].runs.filter(r => r.id !== runId) }
    days.value = next
  }

  return {
    days, plans, nudgeDots, loading,
    loadRange, refresh,
    insertPlanOptimistic, removePlanOptimistic,
    insertRunOptimistic, removeRunOptimistic,
  }
}
