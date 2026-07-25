import type { CalendarPlan, CalendarRun } from '~/composables/useCalendar'
import { flowBandLabel } from '~/utils/flowBand'

// usePlans — CRUD for plans + plan-runs (Trip Calendar #246 W2). Optimistic
// calendar insert then refresh; useToast on error; 422 (e.g. future-paddle,
// crew/max_crew validation) reverts the optimistic insert and toasts the
// server's `error` message verbatim.

// #246 W5: looking_for_crew/max_crew moved OFF plans onto plan_runs (mig
// 000144, IMPLEMENTATION_PLAN.md §6 REVISED 2026-07-25) — a plan is just the
// container now. visibility stays plan-level.
export interface CreatePlanBody {
  name: string
  type?: string
  start_date: string
  end_date: string
  location?: string
  visibility?: string
}

export interface CreatePlanRunBody {
  user_reach_id?: string
  reach_slug?: string
  run_date: string
  run_time?: string
  notes?: string
  companions?: string
  paddled?: boolean
  looking_for_crew?: boolean
  max_crew?: number
}

export interface UpdatePlanRunBody {
  run_date?: string
  run_time?: string
  notes?: string
  companions?: string
  sort_order?: number
  paddled?: boolean
  looking_for_crew?: boolean
  max_crew?: number
}

async function apiErrorMessage(res: Response | null): Promise<string | undefined> {
  if (!res) return undefined
  try {
    const data = await res.json()
    return typeof data?.error === 'string' ? data.error : undefined
  } catch {
    return undefined
  }
}

export function usePlans() {
  const { apiBase } = useRuntimeConfig().public
  const { getToken } = useAuth()
  const toast = useToast()
  const calendar = useCalendar()

  async function authHeaders(): Promise<Record<string, string>> {
    const token = await getToken()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`
    return headers
  }

  async function createPlan(body: CreatePlanBody): Promise<{ id: string; slug: string; url: string } | null> {
    const tempId = `tmp-${Date.now()}`
    const optimistic: CalendarPlan = {
      id: tempId,
      slug: '',
      name: body.name,
      type: body.type ?? 'personal',
      start_date: body.start_date,
      end_date: body.end_date,
      visibility: body.visibility ?? 'public',
      role: 'own',
    }
    calendar.insertPlanOptimistic(optimistic)

    const headers = await authHeaders()
    const res = await fetch(`${apiBase}/api/v1/plans`, {
      method: 'POST', headers, body: JSON.stringify(body),
    }).catch(() => null)

    if (!res?.ok) {
      calendar.removePlanOptimistic(tempId)
      const msg = await apiErrorMessage(res)
      toast.add({ title: 'Could not create plan', description: msg, color: 'error' })
      return null
    }

    const data = await res.json()
    calendar.removePlanOptimistic(tempId)
    await calendar.refresh()
    toast.add({ title: 'Plan created', color: 'success' })
    return data
  }

  async function patchPlan(id: string, body: Partial<CreatePlanBody>): Promise<boolean> {
    const headers = await authHeaders()
    const res = await fetch(`${apiBase}/api/v1/plans/${id}`, {
      method: 'PATCH', headers, body: JSON.stringify(body),
    }).catch(() => null)
    if (!res?.ok) {
      const msg = await apiErrorMessage(res)
      toast.add({ title: 'Could not update plan', description: msg, color: 'error' })
      return false
    }
    await calendar.refresh()
    return true
  }

  async function deletePlan(id: string): Promise<boolean> {
    const headers = await authHeaders()
    const res = await fetch(`${apiBase}/api/v1/plans/${id}`, {
      method: 'DELETE', headers,
    }).catch(() => null)
    if (!res?.ok && res?.status !== 204) {
      const msg = await apiErrorMessage(res)
      toast.add({ title: 'Could not delete plan', description: msg, color: 'error' })
      return false
    }
    calendar.removePlanOptimistic(id)
    await calendar.refresh()
    toast.add({ title: 'Plan deleted', color: 'success' })
    return true
  }

  async function addRun(planId: string, body: CreatePlanRunBody): Promise<{ id: string; slug: string } | null> {
    const tempId = `tmp-${Date.now()}`
    const optimistic: CalendarRun = {
      id: tempId,
      plan_id: planId,
      run_date: body.run_date,
      paddled: !!body.paddled,
      run_time: body.run_time,
    } as CalendarRun
    calendar.insertRunOptimistic(body.run_date, optimistic)

    const headers = await authHeaders()
    const res = await fetch(`${apiBase}/api/v1/plans/${planId}/runs`, {
      method: 'POST', headers, body: JSON.stringify(body),
    }).catch(() => null)

    if (!res?.ok) {
      calendar.removeRunOptimistic(body.run_date, tempId)
      const msg = await apiErrorMessage(res)
      toast.add({ title: 'Could not save run', description: msg, color: 'error' })
      return null
    }

    const data = await res.json()
    calendar.removeRunOptimistic(body.run_date, tempId)
    await calendar.refresh()
    return data
  }

  async function patchRun(runId: string, body: UpdatePlanRunBody): Promise<boolean> {
    const headers = await authHeaders()
    const res = await fetch(`${apiBase}/api/v1/plan-runs/${runId}`, {
      method: 'PATCH', headers, body: JSON.stringify(body),
    }).catch(() => null)
    if (!res?.ok) {
      const msg = await apiErrorMessage(res)
      toast.add({ title: 'Could not update run', description: msg, color: 'error' })
      return false
    }
    await calendar.refresh()
    return true
  }

  // Mark-paddled quick action (PlanRunItem's pill button, day sheet +
  // anywhere it's used): optimistic hollow->filled dot flip, revert on
  // 422 (future date) / 403 (already locked). The PATCH response itself
  // carries no stamped values ({"status":"ok"}) — after a successful patch
  // we refresh the range and read the server-stamped flow back out of the
  // calendar cache to build the "Logged — Running · 1,180 cfs" toast.
  async function markPaddled(runId: string, date: string): Promise<boolean> {
    calendar.patchRunOptimistic(date, runId, { paddled: true })

    const headers = await authHeaders()
    const res = await fetch(`${apiBase}/api/v1/plan-runs/${runId}`, {
      method: 'PATCH', headers, body: JSON.stringify({ paddled: true }),
    }).catch(() => null)

    if (!res?.ok) {
      calendar.patchRunOptimistic(date, runId, { paddled: false })
      const msg = await apiErrorMessage(res)
      toast.add({ title: 'Could not mark paddled', description: msg, color: 'error' })
      return false
    }

    await calendar.refresh()
    const day = calendar.days.value.find(d => d.date === date)
    const run = day?.runs.find(r => r.id === runId)
    let title = 'Run logged — nice paddle!'
    if (run?.flow_band) {
      const cfsPart = run.gauge_cfs != null ? ` · ${Math.round(run.gauge_cfs).toLocaleString()} cfs` : ''
      title = `Logged — ${flowBandLabel(run.flow_band)}${cfsPart}`
    }
    toast.add({ title, color: 'success' })
    return true
  }

  async function deleteRun(runId: string, date: string): Promise<boolean> {
    const headers = await authHeaders()
    const res = await fetch(`${apiBase}/api/v1/plan-runs/${runId}`, {
      method: 'DELETE', headers,
    }).catch(() => null)
    if (!res?.ok && res?.status !== 204) {
      const msg = await apiErrorMessage(res)
      toast.add({ title: 'Could not delete run', description: msg, color: 'error' })
      return false
    }
    calendar.removeRunOptimistic(date, runId)
    await calendar.refresh()
    return true
  }

  // Join Run (#246 W5) — per-run now: POST /plan-runs/{id}/join replaces the
  // old plan-level /plans/{id}/join. origin=request/status=requested;
  // 409 unless public plan + looking_for_crew + filled<max_crew + not
  // already a member of THIS run; dup -> 200 existing (treated as success).
  async function joinPlanRun(runId: string): Promise<boolean> {
    const headers = await authHeaders()
    const res = await fetch(`${apiBase}/api/v1/plan-runs/${runId}/join`, {
      method: 'POST', headers, body: JSON.stringify({}),
    }).catch(() => null)
    if (!res?.ok) {
      const msg = await apiErrorMessage(res)
      toast.add({ title: res?.status === 409 ? 'Crew is full' : 'Could not send join request', description: msg, color: 'error' })
      return false
    }
    toast.add({ title: "Request sent — you'll hear back", color: 'success' })
    return true
  }

  // Resend an email invite (#246 W5 item 2) — host action, per email chip in
  // PlanMembersRow. Re-sends the plan link + .ics to an invite_email that
  // hasn't resolved to an account yet; 409 means every run row for that
  // email is already accepted.
  async function resendInvite(planId: string, email: string): Promise<boolean> {
    const headers = await authHeaders()
    const res = await fetch(`${apiBase}/api/v1/plans/${planId}/invite/resend`, {
      method: 'POST', headers, body: JSON.stringify({ email }),
    }).catch(() => null)
    if (!res?.ok) {
      if (res?.status === 409) {
        toast.add({ title: 'Already accepted', color: 'info' })
        return false
      }
      const msg = await apiErrorMessage(res)
      toast.add({ title: 'Could not resend invite', description: msg, color: 'error' })
      return false
    }
    toast.add({ title: 'Invite resent', color: 'success' })
    return true
  }

  return { createPlan, patchPlan, deletePlan, addRun, patchRun, markPaddled, deleteRun, joinPlanRun, resendInvite }
}
