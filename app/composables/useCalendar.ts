import { ref } from 'vue'
import { clientTz } from '~/utils/calendarDate'

// TS types — Trip Calendar (#246, reworked web#354 A1/W1). Never bare
// `Run`/`Report`: a CalendarRun is a `calendar_runs` row (a dated log entry
// on the calendar), distinct from a river run (`user_reaches`, rendered by
// RunRow.vue). web#354: Events and Runs are decoupled — no plan_id anywhere;
// they're related only by date.
export interface CalendarRun {
  id: string
  user_reach_id?: string
  name?: string
  flow_band?: string
  flow_color?: string
  gauge_cfs?: number
  paddled: boolean
  run_time?: string
  // Not populated by GET /me/calendar today (lighter list payload) — present
  // when a run is fetched individually (GET /plan-runs/{id}) or once a
  // future /me/calendar extension adds it. Optional so PlanRunFeedCard etc.
  // can render it when available and degrade gracefully when not.
  notes?: string
  // "Meet up at" display text (see planRun.ts PlanRunDetail for the full
  // contract note) — same lighter-payload caveat as `notes` above; renders
  // only when present.
  meetup_spot?: string
}

export interface CalendarDay {
  date: string // YYYY-MM-DD
  runs: CalendarRun[]
  needs_confirm: boolean // Tier-A nudge candidate day (#246 A5/W6) — drives CalendarDayCell's '?' badge
}

// CalendarEvent (was CalendarPlan) — web#354 A1/W1: event-type and
// visibility concepts dropped entirely (no `type`, no `visibility`); events
// are owner-only now, so there's no `role`/`member_status` either (every
// event in this feed is the viewer's own).
export interface CalendarEvent {
  id: string
  slug: string
  name: string
  start_date: string
  end_date: string
  location?: string | null
  host_handle?: string
}

interface RangeCache {
  from: string
  to: string
  days: CalendarDay[]
  events: CalendarEvent[]
  nudgeDotDates: string[]
}

// Module-level state — shared across all composable calls in the same page
// lifecycle (mirrors useDashboards). Safe only because /calendar is
// ssr:false (a module ref would otherwise leak across SSR requests).
const cache = new Map<string, RangeCache>()
const days = ref<CalendarDay[]>([])
const events = ref<CalendarEvent[]>([])
const nudgeDots = ref<string[]>([])
const loading = ref(false)
const lastRange = ref<{ from: string; to: string; key: string } | null>(null)

// Shared "jump to this date" signal — set by PlanRunLogSheet's event branch
// after a successful create so calendar/index.vue can flip its month view to
// contain the new event's start_date (works whether the sheet was opened
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
    return { from, to, days: data.days ?? [], events: data.events ?? [], nudgeDotDates: data.nudge_dot_dates ?? [] }
  }

  // cacheKey defaults to the from/to pair; callers with a natural key (e.g.
  // a `YYYY-MM` month, or `year:YYYY`) should pass one so repeat visits to
  // the same month/year don't refetch.
  async function loadRange(from: string, to: string, cacheKey?: string, force = false) {
    const key = cacheKey ?? `${from}|${to}`
    if (!force && cache.has(key)) {
      const c = cache.get(key)!
      days.value = c.days
      events.value = c.events
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
    events.value = result.events
    nudgeDots.value = result.nudgeDotDates
    lastRange.value = { from, to, key }
  }

  // Refetches the most recently loaded range, bypassing its cache entry —
  // used after any event/run mutation so the grid reflects server truth.
  async function refresh() {
    if (!lastRange.value) return
    await loadRange(lastRange.value.from, lastRange.value.to, lastRange.value.key, true)
  }

  // ── Optimistic helpers (create-then-refresh pattern, usePlans) ──────────

  function insertEventOptimistic(event: CalendarEvent) {
    events.value = [...events.value, event]
  }

  function removeEventOptimistic(id: string) {
    events.value = events.value.filter(e => e.id !== id)
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

  // Patches one run in place within its date bucket — used for the
  // mark-paddled quick action's optimistic hollow->filled dot flip (and its
  // revert on 422/403), without waiting on a full range refetch.
  function patchRunOptimistic(date: string, runId: string, patch: Partial<CalendarRun>) {
    const idx = days.value.findIndex(d => d.date === date)
    if (idx < 0) return
    const next = [...days.value]
    next[idx] = {
      ...next[idx],
      runs: next[idx].runs.map(r => (r.id === runId ? { ...r, ...patch } : r)),
    }
    days.value = next
  }

  return {
    days, events, nudgeDots, loading,
    loadRange, refresh,
    insertEventOptimistic, removeEventOptimistic,
    insertRunOptimistic, removeRunOptimistic, patchRunOptimistic,
  }
}
