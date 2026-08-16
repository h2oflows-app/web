import { ref, type Ref } from 'vue'
import type { DiscoverRun } from '~/composables/useCommunitySearch'

/**
 * Add/Fork actions for the explore Community scope (web#335) — the
 * GaugeSearchModal flows lifted, with the logged-out silent no-op replaced by
 * a /login?redirect= bounce and success feedback gated on the server's answer
 * (#422: a success message that cannot fail is worse than none).
 */
export function useExploreAdd(opts: {
  dashboardId: Ref<string | null>
  myHandle: Ref<string | null>
}) {
  const { getToken } = useAuth()
  const db = useDashboards()
  const { addReachToWatchlist, addUserReachToWatchlist, addReferenceToWatchlist } = useWatchlistSync()
  const toast = useToast()
  const route = useRoute()

  const addingRunId = ref<string | null>(null)
  const addedRunIds = ref<Set<string>>(new Set())

  const forkingId = ref<string | null>(null)
  const forkedForRunId = ref<string | null>(null)
  const pendingForkedSlug = ref<string | null>(null)
  const pendingForkedGaugeId = ref<string | null>(null)
  const addingToDashId = ref<string | null>(null)

  // Explore requires auth on the bare route, but the session can expire while
  // the tab sits open — bounce through login with a return path instead of
  // the modal's silent no-op + false success toast.
  async function requireToken(): Promise<string | null> {
    const token = await getToken()
    if (!token) {
      navigateTo(`/login?redirect=${encodeURIComponent(route.fullPath)}`)
      return null
    }
    return token
  }

  function flashAdded(runId: string, dashId: string | null) {
    addedRunIds.value = new Set([...addedRunIds.value, runId])
    const dashName = db.dashboards.value.find(d => d.id === dashId)?.name ?? 'dashboard'
    toast.add({ title: `Added to ${dashName}`, color: 'success', duration: 3000 })
    setTimeout(() => {
      addedRunIds.value = new Set([...addedRunIds.value].filter(x => x !== runId))
    }, 3000)
  }

  function failToast() {
    toast.add({ title: 'Could not add — try again', color: 'error', duration: 3000 })
  }

  // The dashboard hides trashed runs per-dashboard in localStorage keyed by
  // run id; a successful re-add must un-hide or the add looks like a no-op.
  function unhideRun(runId: string, dashId: string | null) {
    if (!import.meta.client || !dashId) return
    const key = `h2oflow_hidden_reaches_${dashId}`
    try {
      const set = new Set<string>(JSON.parse(localStorage.getItem(key) ?? '[]'))
      if (set.delete(runId)) localStorage.setItem(key, JSON.stringify([...set]))
    } catch {}
  }

  /**
   * Add a community run to a dashboard. Own runs (author == me) get a real
   * reach_slug row; anyone else's gets a reference — getting this backwards
   * writes a row nothing reads (#422).
   */
  async function addRun(run: DiscoverRun, dashId?: string | null) {
    if (!(await requireToken())) return
    const target = dashId !== undefined ? dashId : opts.dashboardId.value
    addingRunId.value = run.id
    try {
      const isOwn = !!opts.myHandle.value
        && run.handle.toLowerCase() === opts.myHandle.value.toLowerCase()
      let ok: boolean
      if (isOwn) {
        // gauge_id TRUTHINESS on purpose: forks/legacy rows can carry "" for
        // "no gauge" and ""::uuid would 500 server-side.
        ok = run.gauge_id
          ? await addUserReachToWatchlist(run.gauge_id, run.slug, target)
          : await addReachToWatchlist(run.slug, target)
      } else {
        ok = await addReferenceToWatchlist(run.id, target)
      }
      if (ok) {
        flashAdded(run.id, target)
        unhideRun(run.id, target)
      } else {
        failToast()
      }
    } finally {
      addingRunId.value = null
    }
  }

  /**
   * Fork & customize: POST /user-runs/{id}/fork, then add the fork to a
   * dashboard. One dashboard → immediate; several → the row shows an inline
   * picker (forkedForRunId) until confirmForkDashboard/cancelFork.
   */
  async function startFork(run: DiscoverRun) {
    const token = await requireToken()
    if (!token) return
    const { apiBase } = useRuntimeConfig().public
    forkingId.value = run.id
    forkedForRunId.value = null
    pendingForkedSlug.value = null
    try {
      const res = await fetch(`${apiBase}/api/v1/user-runs/${run.id}/fork`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null)
      if (!res?.ok) { failToast(); return }
      const forked = await res.json()
      pendingForkedSlug.value = forked.slug ?? forked.id
      // The fork endpoint serialises gauge_id as a plain string — "" when the
      // fork has no gauge. Keep it as-is; routing below checks TRUTHINESS.
      pendingForkedGaugeId.value = forked.gauge_id ?? null
      if (db.dashboards.value.length <= 1) {
        await confirmForkDashboard(opts.dashboardId.value)
      } else {
        forkedForRunId.value = run.id
      }
    } finally {
      forkingId.value = null
    }
  }

  async function confirmForkDashboard(dashId: string | null) {
    if (!pendingForkedSlug.value) return
    addingToDashId.value = dashId
    try {
      const ok = pendingForkedGaugeId.value
        ? await addUserReachToWatchlist(pendingForkedGaugeId.value, pendingForkedSlug.value, dashId)
        : await addReachToWatchlist(pendingForkedSlug.value, dashId)
      if (ok) {
        const dashName = db.dashboards.value.find(d => d.id === dashId)?.name ?? 'dashboard'
        toast.add({ title: `Forked — your editable copy added to ${dashName}`, color: 'success', duration: 3000 })
      } else {
        failToast()
      }
    } finally {
      addingToDashId.value = null
      forkedForRunId.value = null
      pendingForkedSlug.value = null
      pendingForkedGaugeId.value = null
    }
  }

  function cancelFork() {
    forkedForRunId.value = null
    pendingForkedSlug.value = null
    pendingForkedGaugeId.value = null
  }

  return {
    addingRunId, addedRunIds,
    forkingId, forkedForRunId, addingToDashId,
    addRun, startFork, confirmForkDashboard, cancelFork,
    // The chip's target ref, passed through so row-level actions (inline
    // "+ New dashboard") can retarget it — modal parity: creating a dashboard
    // from the picker also makes it the active add target.
    targetDashboardId: opts.dashboardId,
  }
}

export type ExploreAdd = ReturnType<typeof useExploreAdd>
