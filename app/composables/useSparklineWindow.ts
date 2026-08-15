/**
 * useSparklineWindow — the time window every dashboard sparkline draws (#402).
 *
 * There are two levels and the resolution order is the whole design:
 *
 *   override[key] ?? global
 *
 * `global` is the dashboard-wide window, set from the toolbar's Window control
 * and persisted in that dashboard's prefs blob. An override is what a single
 * sparkline's own 12h/1d/1w/1m buttons write, so one run can sit at a month
 * while the rest of the board stays on a week. Setting the global window
 * clears every override — the dashboard control means *all of them*, which is
 * why the toolbar warns first when any override is live.
 *
 * State lives in `useState` rather than module scope so the server never shares
 * one user's window with the next request. Persistence is deliberately NOT
 * here: `dashboard.vue` owns the localStorage prefs blob and hydrates/saves
 * these refs alongside viewMode and grouping, which is what makes the window
 * per-dashboard. Sparklines rendered outside the dashboard (run browse rows,
 * the wizard's gauge step) read the same default and simply never persist.
 */
import { computed } from 'vue'

export type SparklineHours = 12 | 24 | 168 | 720

export const SPARKLINE_WINDOWS: { hours: SparklineHours; short: string; label: string }[] = [
  { hours: 12,  short: '12h', label: '12 hours' },
  { hours: 24,  short: '1d',  label: '1 day'    },
  { hours: 168, short: '1w',  label: '1 week'   },
  { hours: 720, short: '1m',  label: '1 month'  },
]

/** A week. Twelve hours of a gauge is a wiggle; a week has the shape of the
 *  storm that made it, which is the thing a boater is reading for (#402). */
export const DEFAULT_SPARKLINE_HOURS: SparklineHours = 168

const VALID = new Set<number>(SPARKLINE_WINDOWS.map(w => w.hours))

export function isSparklineHours(v: unknown): v is SparklineHours {
  return typeof v === 'number' && VALID.has(v)
}

export function sparklineWindowShort(hours: SparklineHours): string {
  return SPARKLINE_WINDOWS.find(w => w.hours === hours)?.short ?? `${hours}h`
}

export function useSparklineWindow() {
  const globalHours = useState<SparklineHours>('sparkline-window', () => DEFAULT_SPARKLINE_HOURS)
  const overrides   = useState<Record<string, SparklineHours>>('sparkline-window-overrides', () => ({}))

  function resolve(key: string | null | undefined): SparklineHours {
    if (key) {
      const own = overrides.value[key]
      if (own) return own
    }
    return globalHours.value
  }

  /** One sparkline's own buttons. Choosing the window the board is already on
   *  drops the override instead of recording a redundant one — otherwise the
   *  toolbar would warn about "gauges set differently" that are set the same. */
  function setForKey(key: string | null | undefined, hours: SparklineHours) {
    if (!key) return
    const next = { ...overrides.value }
    if (hours === globalHours.value) delete next[key]
    else next[key] = hours
    overrides.value = next
  }

  /** The toolbar control. `reset` is what the warning warns about. */
  function setGlobal(hours: SparklineHours, opts: { reset?: boolean } = {}) {
    globalHours.value = hours
    if (opts.reset !== false) overrides.value = {}
  }

  function hydrate(hours: SparklineHours, ovr: Record<string, SparklineHours>) {
    globalHours.value = hours
    overrides.value = { ...ovr }
  }

  // Only overrides that actually differ from the board count as divergent —
  // setForKey keeps them out, but a hydrated blob written before that rule (or
  // by a global change from another tab) can still carry one.
  const divergentKeys = computed(() =>
    Object.entries(overrides.value).filter(([, h]) => h !== globalHours.value).map(([k]) => k),
  )

  return {
    globalHours,
    overrides,
    divergentKeys,
    resolve,
    setForKey,
    setGlobal,
    hydrate,
  }
}
