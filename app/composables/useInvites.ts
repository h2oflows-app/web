import { computed } from 'vue'

// useInvites — GET /me/invites list + accept/dismiss (Trip Calendar #246 W4;
// remodeled #246 W5 per IMPLEMENTATION_PLAN.md §6 REVISED 2026-07-25: crew
// and invite RSVPs are PER-RUN, not per-plan). useState (not a plain module
// ref, unlike useCalendar) — NotificationBell mounts inside AppHeader on
// every page, including ssr:true ones, so a plain module ref would leak
// invite state across unrelated SSR requests the way useCalendar's own doc
// comment warns against. useState is per-request on the server and a
// hydrated singleton on the client, matching useMyProfile's handle/loaded
// pattern for the same reason.

// web#354 A1: invitedEvent (invites.go) dropped `type` entirely (event-type
// concept removed) and the JSON wrapper key itself renamed `plan`→`event`
// (see Invite below).
export interface InviteEventSummary {
  id: string
  slug: string
  name: string
  start_date: string
  end_date: string
  location?: string | null
  host_handle: string
}

// One row per invited run within this invite batch — membership rows are
// run-scoped now, so a single "invite" (one handle-add or one email send)
// fans out to one plan_members row (member_id) per plan_run_id, each with
// its own accept/decline lifecycle.
export interface InviteRun {
  member_id: string
  plan_run_id: string
  run_name?: string | null
  run_date: string
  run_time?: string | null
  status: string // invited | accepted | declined
  dismissed_at?: string | null
}

export interface Invite {
  // Groups the fanned-out per-run rows that were created by the same invite
  // action (same event + same recipient) — the feed card/banner render ONE
  // item per group with a per-run row list, per the contract ("feed card
  // lists the invited runs each with its own Accept button").
  invited_via: 'handle' | 'email'
  created_at: string
  event: InviteEventSummary
  runs: InviteRun[]
}

function isPendingRun(r: InviteRun): boolean {
  return r.status === 'invited' && !r.dismissed_at
}

// A group is "pending" iff at least one of its per-run rows still needs a
// response — the banner/badge/plan-ribbon surfaces all key off this.
function isPending(i: Invite): boolean {
  return i.runs.some(isPendingRun)
}

// First still-pending run within a group, for surfaces that name ONE run
// (the banner: "invited you to run Foxton on 7/26 at 10:00 AM").
function firstPendingRun(i: Invite): InviteRun | undefined {
  return i.runs.find(isPendingRun)
}

export function useInvites() {
  const invites = useState<Invite[]>('invites:list', () => [])
  const loaded = useState<boolean>('invites:loaded', () => false)
  const unreadCount = useState<number>('invites:unread', () => 0)

  const { apiBase } = useRuntimeConfig().public
  const { getToken, isAuthenticated } = useAuth()
  const toast = useToast()

  // Counts individual pending RUN rows (not invite groups) — matches the
  // per-run RSVP model literally: "@maya invited to 2 runs" is 2 pending
  // items, not 1, until each run gets its own response.
  function recomputeUnread() {
    unreadCount.value = invites.value.reduce((n, i) => n + i.runs.filter(isPendingRun).length, 0)
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

  // Patches ONE run row (by member_id) across all invite groups — accept/
  // dismiss both target a single per-run plan_members row now.
  function patchRun(memberId: string, patch: Partial<InviteRun>) {
    invites.value = invites.value.map(i => ({
      ...i,
      runs: i.runs.map(r => (r.member_id === memberId ? { ...r, ...patch } : r)),
    }))
  }

  // token: the ?invite=<token> from the email link, forwarded in the POST
  // body — API's AcceptInvite (invites.go) accepts it as a fallback match
  // for the "signed up with a different email than the invite" case, where
  // the invite's plan_members row isn't bound to (or discoverable via
  // /me/invites' email match for) this account yet. memberId identifies a
  // single RUN's row — accept is per-run, not per-plan.
  async function accept(memberId: string, token?: string): Promise<boolean> {
    const prev = invites.value
    patchRun(memberId, { status: 'accepted' })
    recomputeUnread()

    const headers = await authHeaders()
    const res = await fetch(`${apiBase}/api/v1/invites/${memberId}/accept`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(token ? { token } : {}),
    }).catch(() => null)
    if (!res?.ok) {
      invites.value = prev
      recomputeUnread()
      const msg = await res?.json().catch(() => null)
      toast.add({ title: 'Could not accept invite', description: res?.status === 409 ? msg?.error ?? 'Already a member' : msg?.error, color: 'error' })
      return false
    }

    toast.add({ title: 'Added to your calendar', color: 'success' })
    await refresh()
    // Refreshing the calendar store here (rather than making every caller
    // remember to) is what surfaces the newly-accepted run on /calendar
    // without a reload. Safe to call even off /calendar: refresh() is a
    // no-op until a range has been loaded at least once.
    await useCalendar().refresh()
    return true
  }

  async function dismiss(memberId: string): Promise<boolean> {
    const prev = invites.value
    const now = new Date().toISOString()
    patchRun(memberId, { dismissed_at: now })
    recomputeUnread()

    const headers = await authHeaders()
    const res = await fetch(`${apiBase}/api/v1/invites/${memberId}/dismiss`, { method: 'POST', headers }).catch(() => null)
    if (!res?.ok) {
      invites.value = prev
      recomputeUnread()
      toast.add({ title: 'Could not dismiss invite', color: 'error' })
      return false
    }
    return true
  }

  // The banner (and any "first pending invite" surface) always shows the
  // OLDEST pending invite GROUP first — /me/invites is already ORDER BY
  // created_at DESC, so pending-only + reverse gives oldest-first without a
  // second sort.
  const firstPending = computed(() => {
    const pending = invites.value.filter(isPending)
    return pending.length ? pending[pending.length - 1] : null
  })

  return { invites, loaded, unreadCount, firstPending, refresh, accept, dismiss, firstPendingRun, isPendingRun }
}
