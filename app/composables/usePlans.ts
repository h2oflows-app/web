import type { CalendarPlan, CalendarRun } from '~/composables/useCalendar'

// usePlans — CRUD for plans + plan-runs (Trip Calendar #246 W2). Optimistic
// calendar insert then refresh; useToast on error; 422 (e.g. future-paddle,
// crew/max_crew validation) reverts the optimistic insert and toasts the
// server's `error` message verbatim.

export interface CreatePlanBody {
  name: string
  type?: string
  start_date: string
  end_date: string
  location?: string
  visibility?: string
  looking_for_crew?: boolean
  max_crew?: number
}

export interface CreatePlanRunBody {
  user_reach_id?: string
  reach_slug?: string
  run_date: string
  run_time?: string
  notes?: string
  companions?: string
  paddled?: boolean
}

export interface UpdatePlanRunBody {
  run_date?: string
  run_time?: string
  notes?: string
  companions?: string
  sort_order?: number
  paddled?: boolean
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

  return { createPlan, patchPlan, deletePlan, addRun, patchRun, deleteRun }
}
