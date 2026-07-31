import { computed } from 'vue'
import type { PlanCrewMeterInfo } from '~/utils/plan'

// useInvites — GET /me/invites list + accept/dismiss (Trip Calendar #246 W4;
// remodeled #246 W5 per IMPLEMENTATION_PLAN.md §6 REVISED 2026-07-25: crew
// and invite RSVPs are PER-RUN, not per-plan; re-keyed AGAIN web#354 W4 to
// match invites.go's A2 rework — MyInvites now returns a FLAT,
// run_date-sorted list of run_invites rows, one item per invited RUN, with
// no plan/event wrapper and no runs[] fan-out to group. A single invite
// action always targets exactly one run now (A2 dropped the old
// multi-run-per-plan invite entirely), so "one list item = one run" needs no
// grouping step at all — see plan.ts's CalendarEventDetail doc comment for
// the parallel event-side rename.
//
// useState (not a plain module ref, unlike useCalendar) — NotificationBell
// mounts inside AppHeader on every page, including ssr:true ones, so a plain
// module ref would leak invite state across unrelated SSR requests the way
// useCalendar's own doc comment warns against. useState is per-request on
// the server and a hydrated singleton on the client, matching useMyProfile's
// handle/loaded pattern for the same reason.

// The run summary embedded on each invite item (invites.go inviteRunSummary)
// — river/state, date/time, meetup, flow, crew meter, and the host's handle,
// enough for the banner/card/accept-surface to render without a second
// fetch.
export interface InviteRunSummary {
  run_id: string
  slug: string
  // Name (web#354 A4) is the calendar run's OWN name — REQUIRED, always
  // populated. ReachName is the attached library run's own name (nil for an
  // orphaned run) — separate from RiverName below, which is the actual
  // named river (e.g. "Blue River"), not the user's own saved-run name.
  name: string
  reach_name?: string | null
  river_name?: string | null
  state_abbr?: string | null
  run_date: string
  run_time?: string | null
  meetup_spot?: string | null
  gauge_cfs?: number | null
  flow_band?: string | null
  flow_color?: string | null
  crew: PlanCrewMeterInfo
  host_handle: string
}

export interface Invite {
  id: string
  status: string // invited | accepted | declined
  dismissed_at?: string | null
  invited_via: 'handle' | 'email'
  created_at: string
  run: InviteRunSummary
}

// A single item is "pending" iff it still needs a response — every
// surface (banner, badge, feed) keys off this. Exported so callers don't
// re-derive the same two-field check independently.
export function isPendingInvite(i: Invite): boolean {
  return i.status === 'invited' && !i.dismissed_at
}

export function useInvites() {
  const invites = useState<Invite[]>('invites:list', () => [])
  const loaded = useState<boolean>('invites:loaded', () => false)
  const unreadCount = useState<number>('invites:unread', () => 0)

  const { apiBase } = useRuntimeConfig().public
  const { getToken, isAuthenticated } = useAuth()
  const toast = useToast()

  // web#354 W4: one list item IS one run now, so "pending" is a straight
  // filter — no more per-group runs[] fan-out to flatten first (contrast the
  // old #246 W5 version, which counted individual pending RUN rows across
  // invite groups).
  function recomputeUnread() {
    unreadCount.value = invites.value.filter(isPendingInvite).length
  }

  async function authHeaders(): Promise<Record<string, string>> {
    const token = await getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  async function refresh(): Promise<void> {
    if (!isAuthenticated.value) {
      invites.value = []
      unreadCount.value = 0
      loaded.value = true
      return
    }
    const headers = await authHeaders()
    const res = await fetch(`${apiBase}/api/v1/me/invites`, { headers }).catch(() => null)
    if (!res?.ok) {
      loaded.value = true
      return
    }
    const data = await res.json().catch(() => null)
    invites.value = data?.invites ?? []
    recomputeUnread()
    loaded.value = true
  }

  function patchInvite(id: string, patch: Partial<Invite>) {
    invites.value = invites.value.map(i => (i.id === id ? { ...i, ...patch } : i))
  }

  // Low-level POST /invites/{id}/accept — extracted (uninvite-autoaccept-
  // organizer follow-up) so a caller that needs different side-effects than
  // accept() below (toast wording, navigation, refresh timing) can still
  // issue the EXACT SAME request instead of hand-rolling a second copy.
  // plan-runs/[id].vue's auto-accept-on-landing (?accept=1 email links) is
  // the motivating case: accept()'s own toast/navigateTo assume a manual
  // click from a list context, neither of which fits landing already ON the
  // run page. token: the ?invite=<token> from the email link, forwarded in
  // the POST body — API's AcceptInvite (invites.go) accepts it as a
  // fallback match for the "signed up with a different email than the
  // invite" case, where the invite's run_invites row isn't bound to (or
  // discoverable via /me/invites' email match for) this account yet.
  async function acceptRequest(id: string, token?: string): Promise<{ ok: boolean; status: number; body: any }> {
    const headers = await authHeaders()
    const res = await fetch(`${apiBase}/api/v1/invites/${id}/accept`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(token ? { token } : {}),
    }).catch(() => null)
    const body = await res?.json().catch(() => null)
    return { ok: !!res?.ok, status: res?.status ?? 0, body }
  }

  async function accept(id: string, token?: string): Promise<boolean> {
    const prev = invites.value
    patchInvite(id, { status: 'accepted' })
    recomputeUnread()

    const { ok, status, body } = await acceptRequest(id, token)
    if (!ok) {
      invites.value = prev
      recomputeUnread()
      toast.add({ title: 'Could not accept invite', description: status === 409 ? body?.error ?? 'Already a member' : body?.error, color: 'error' })
      return false
    }

    toast.add({ title: 'Added to your calendar', color: 'success' })
    await refresh()
    // Refreshing the calendar store here (rather than making every caller
    // remember to) is what surfaces the newly-accepted run on /calendar
    // without a reload. Safe to call even off /calendar: refresh() is a
    // no-op until a range has been loaded at least once.
    await useCalendar().refresh()

    // web#354 W4: the api names the run in its response ({status, run_id,
    // slug}) specifically so the web can route straight there without a
    // second lookup (invites.go AcceptInvite doc comment). Route by id
    // (not slug) — GetRun's slug-resolution branch only fires when the slug
    // is globally unique across ALL owners (plan_runs.go), which a run's own
    // per-owner-unique slug doesn't guarantee; the id is always safe.
    if (body?.run_id) {
      await navigateTo(`/plan-runs/${body.run_id}`)
    }
    return true
  }

  async function dismiss(id: string): Promise<boolean> {
    const prev = invites.value
    const now = new Date().toISOString()
    patchInvite(id, { dismissed_at: now })
    recomputeUnread()

    const headers = await authHeaders()
    const res = await fetch(`${apiBase}/api/v1/invites/${id}/dismiss`, { method: 'POST', headers }).catch(() => null)
    if (!res?.ok) {
      invites.value = prev
      recomputeUnread()
      toast.add({ title: 'Could not dismiss invite', color: 'error' })
      return false
    }
    return true
  }

  // The banner always shows the invite for the SOONEST upcoming run still
  // needing a response — /me/invites is already ORDER BY run_date (then
  // created_at) ASC (MyInvites, invites.go), so pending-only + first-match
  // gives soonest-first with no extra sort needed here.
  const firstPending = computed(() => invites.value.find(isPendingInvite) ?? null)

  return { invites, loaded, unreadCount, firstPending, refresh, accept, acceptRequest, dismiss }
}
