import type { CalendarEvent, CalendarRun } from '~/composables/useCalendar'
import { flowBandLabel } from '~/utils/flowBand'

// usePlans — CRUD for events + calendar runs (Trip Calendar #246 W2,
// reworked web#354 A1/W1). Optimistic calendar insert then refresh;
// useToast on error; 422 (e.g. future-paddle, crew/max_crew validation)
// reverts the optimistic insert and toasts the server's `error` message
// verbatim.

// web#354 A1/W1: `type`/`visibility` dropped entirely (event-type + event
// visibility concepts removed) — an event is just name/date-range/location.
export interface CreatePlanBody {
  name: string
  start_date: string
  end_date: string
  location?: string
}

// "Meet up at" (product request 2026-07-25). Verified against the api's
// meetup patch on feat/246-crew-per-run (plan_runs.go): the request body
// nests the picked feature as `meetup_feature: {type, id}` — NOT flat
// meetup_feature_type/meetup_feature_id (those flat names are the RESPONSE
// shape only, see planRun.ts/PlanRunDetail; do not conflate the two).
//
// Clear semantics: meetup_spot and meetup_feature are a pair — a feature ref
// is inherently nullable state (not a plain optional edit like `notes`,
// which this handler's COALESCE-on-omit pattern only ever SETS, never
// clears — existing behavior, out of scope here). So:
//  - CREATE: omit meetup_feature when nothing was picked (undefined drops
//    the key). Send meetup_spot alone for free text; send meetup_feature
//    once a suggestion was picked.
//  - PATCH (edit mode): always send both, never omitted — '' clears the
//    spot text (and, per the api's binding rule, ALSO clears any feature
//    ref — the two can't be split in that direction); an explicit
//    `meetup_feature: null` (as opposed to the key being absent) clears a
//    previously-picked ref while KEEPING the (possibly hand-edited)
//    meetup_spot text ("typing after a pick clears the ref, text stays").
//    The api distinguishes an explicit null from an omitted key via a raw
//    JSON presence check, so `?? null` (not `?? undefined`) is load-bearing
//    here — see plan_runs.go's updatePlanRunBody doc comment.
export interface MeetupFeatureBody {
  type: 'rapid' | 'access'
  id: string
}

// web#354 A1: standalone run create body (POST /plan-runs) — no planId, no
// parent event; runs are decoupled entirely. Same field set the old
// plan-scoped create body had (CreateRun's addRun equivalent), minus the
// plan_id it never carried in the request anyway.
export interface CreatePlanRunBody {
  // Name (web#354 A4/W6) is the calendar run's OWN name — REQUIRED
  // (insertPlanRun 422s "name required" on empty/whitespace-only), always
  // sent. Independent of the attached library run's own name.
  name: string
  user_reach_id?: string
  reach_slug?: string
  run_date: string
  run_time?: string
  notes?: string
  companions?: string
  paddled?: boolean
  looking_for_crew?: boolean
  max_crew?: number
  meetup_spot?: string
  meetup_feature?: MeetupFeatureBody
}

export interface UpdatePlanRunBody {
  // Name (web#354 A4/W6) follows the "key omitted = don't touch" convention
  // like every other field here, EXCEPT it has no "clear" state — an
  // explicit empty/whitespace-only string 422s server-side (validateRunName,
  // plan_runs.go); only send a trimmed non-empty value. Also the ONE field
  // (besides notes) still writable on a paddled run within the api's 24h
  // post-paddle edit-lock window (UpdateRun's locked branch).
  name?: string
  run_date?: string
  run_time?: string
  notes?: string
  companions?: string
  sort_order?: number
  paddled?: boolean
  looking_for_crew?: boolean
  max_crew?: number
  meetup_spot?: string
  meetup_feature?: MeetupFeatureBody | null
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
    const optimistic: CalendarEvent = {
      id: tempId,
      slug: '',
      name: body.name,
      start_date: body.start_date,
      end_date: body.end_date,
      host_handle: '',
    }
    calendar.insertEventOptimistic(optimistic)

    const headers = await authHeaders()
    const res = await fetch(`${apiBase}/api/v1/plans`, {
      method: 'POST', headers, body: JSON.stringify(body),
    }).catch(() => null)

    if (!res?.ok) {
      calendar.removeEventOptimistic(tempId)
      const msg = await apiErrorMessage(res)
      toast.add({ title: 'Could not create event', description: msg, color: 'error' })
      return null
    }

    const data = await res.json()
    calendar.removeEventOptimistic(tempId)
    await calendar.refresh()
    toast.add({ title: 'Event created', color: 'success' })
    return data
  }

  async function patchPlan(id: string, body: Partial<CreatePlanBody>): Promise<boolean> {
    const headers = await authHeaders()
    const res = await fetch(`${apiBase}/api/v1/plans/${id}`, {
      method: 'PATCH', headers, body: JSON.stringify(body),
    }).catch(() => null)
    if (!res?.ok) {
      const msg = await apiErrorMessage(res)
      toast.add({ title: 'Could not update event', description: msg, color: 'error' })
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
      toast.add({ title: 'Could not delete event', description: msg, color: 'error' })
      return false
    }
    calendar.removeEventOptimistic(id)
    await calendar.refresh()
    toast.add({ title: 'Event deleted', color: 'success' })
    return true
  }

  // web#354 A1/W1: standalone run create — replaces the old plan-scoped
  // addRun(planId, body); POSTs the new POST /plan-runs (no parent event).
  async function createRun(body: CreatePlanRunBody): Promise<{ id: string; slug: string } | null> {
    const tempId = `tmp-${Date.now()}`
    const optimistic: CalendarRun = {
      id: tempId,
      name: body.name,
      run_time: body.run_time,
      paddled: !!body.paddled,
    } as CalendarRun
    calendar.insertRunOptimistic(body.run_date, optimistic)

    const headers = await authHeaders()
    const res = await fetch(`${apiBase}/api/v1/plan-runs`, {
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

  // Join Run (#246 W5) — per-run: POST /plan-runs/{id}/join. web#354 A1: the
  // api's only gate is the run's OWN looking_for_crew + crew headroom — the
  // old "parent plan must be public" layer is gone along with the
  // visibility concept entirely (invites.go JoinRun doc comment).
  async function joinPlanRun(runId: string): Promise<boolean> {
    const headers = await authHeaders()
    const res = await fetch(`${apiBase}/api/v1/plan-runs/${runId}/join`, {
      method: 'POST', headers, body: JSON.stringify({}),
    }).catch(() => null)
    if (!res?.ok) {
      const msg = await apiErrorMessage(res)
      // JoinRun (invites.go) returns 409 for three distinct reasons — "crew
      // is full", "host cannot request to join their own run", and "this
      // run is not open for crew requests" — hardcoding "Crew is full" for
      // every 409 mislabeled the other two. Surface the server's own
      // message as the title when we have one; only fall back to the old
      // defaults when the body carried no `error` (network failure).
      const title = res?.status === 409
        ? (msg ? msg.charAt(0).toUpperCase() + msg.slice(1) : 'Crew is full')
        : 'Could not send join request'
      toast.add({ title, description: res?.status === 409 ? undefined : msg, color: 'error' })
      return false
    }
    toast.add({ title: "Request sent — you'll hear back", color: 'success' })
    return true
  }

  // Resend an email invite (#246 W5 item 2, re-keyed web#354 W4) — host
  // action, backs InviteSheet's "Pending invites" resend button. Re-sends
  // the run link + .ics to an invite_email that hasn't resolved to an
  // account yet; 409 means it's already been accepted or declined.
  // web#354 A2/W4: invites are run-scoped now (run_invites, no more
  // plan-wide fan-out) — this targets the run-scoped
  // POST /plan-runs/{id}/invite/resend (invites.go ResendInvite); the old
  // plan-scoped /plans/{planId}/invite/resend endpoint (and its
  // PlanMembersRow caller) are gone.
  async function resendInvite(runId: string, email: string): Promise<boolean> {
    const headers = await authHeaders()
    const res = await fetch(`${apiBase}/api/v1/plan-runs/${runId}/invite/resend`, {
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

  return { createPlan, patchPlan, deletePlan, createRun, patchRun, markPaddled, deleteRun, joinPlanRun, resendInvite }
}
