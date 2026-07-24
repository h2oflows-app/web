import { computed } from 'vue'

// useInvites — GET /me/invites list + accept/dismiss (Trip Calendar #246 W4).
// useState (not a plain module ref, unlike useCalendar) — NotificationBell
// mounts inside AppHeader on every page, including ssr:true ones, so a plain
// module ref would leak invite state across unrelated SSR requests the way
// useCalendar's own doc comment warns against. useState is per-request on
// the server and a hydrated singleton on the client, matching useMyProfile's
// handle/loaded pattern for the same reason.

export interface InvitePlanSummary {
  id: string
  slug: string
  name: string
  type: string
  start_date: string
  end_date: string
  location?: string | null
  host_handle: string
}

export interface Invite {
  member_id: string
  status: string // invited | accepted | declined (this feed is origin='invite' only)
  dismissed_at?: string | null
  invited_via: 'handle' | 'email'
  created_at: string
  plan: InvitePlanSummary
}

// pending = the definition the banner/badge/day-ribbon all key off: still
// awaiting a response AND not dismissed. Dismissed invites stay in the
// /invites feed (contract: "dismiss keeps the row") but drop out of the
// badge count and banner.
function isPending(i: Invite): boolean {
  return i.status === 'invited' && !i.dismissed_at
}

export function useInvites() {
  const invites = useState<Invite[]>('invites:list', () => [])
  const loaded = useState<boolean>('invites:loaded', () => false)
  const unreadCount = useState<number>('invites:unread', () => 0)

  const { apiBase } = useRuntimeConfig().public
  const { getToken, isAuthenticated } = useAuth()
  const toast = useToast()

  function recomputeUnread() {
    unreadCount.value = invites.value.filter(isPending).length
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

  // token: the ?invite=<token> from the email link, forwarded in the POST
  // body — API's AcceptInvite (invites.go) accepts it as a fallback match
  // for the "signed up with a different email than the invite" case, where
  // the invite's plan_members row isn't bound to (or discoverable via
  // /me/invites' email match for) this account yet.
  async function accept(memberId: string, token?: string): Promise<boolean> {
    const prev = invites.value
    invites.value = invites.value.map(i => i.member_id === memberId ? { ...i, status: 'accepted' } : i)
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
    // The invited plan's ribbon on /calendar flips dashed→solid purely off
    // useCalendar's cached `plans[].role` — refreshing it here (rather than
    // making every caller remember to) is what makes that flip happen
    // without a reload. Safe to call even off /calendar: refresh() is a
    // no-op until a range has been loaded at least once.
    await useCalendar().refresh()
    return true
  }

  async function dismiss(memberId: string): Promise<boolean> {
    const prev = invites.value
    const now = new Date().toISOString()
    invites.value = invites.value.map(i => i.member_id === memberId ? { ...i, dismissed_at: now } : i)
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
  // OLDEST pending invite first — /me/invites is already ORDER BY created_at
  // DESC, so pending-only + reverse gives oldest-first without a second sort.
  const firstPending = computed(() => {
    const pending = invites.value.filter(isPending)
    return pending.length ? pending[pending.length - 1] : null
  })

  return { invites, loaded, unreadCount, firstPending, refresh, accept, dismiss }
}
