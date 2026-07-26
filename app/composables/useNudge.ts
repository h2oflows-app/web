// useNudge — GET /me/nudge/candidate + shown/dismiss/confirm (Trip Calendar
// #246 W6). useState throughout (mirrors useInvites) since NudgeCard mounts
// on /calendar (ssr:false) but the shownThisSession guard and member state
// still need to survive component remounts within the same client session —
// a plain ref would reset on every NudgeCard mount and defeat the "1/day,
// second mount silent" contract (nudges.go POST /shown is the server-side
// cap; this is the client-side belt making sure a SPA nav back to /calendar
// within the same session doesn't re-render/re-POST for the same candidate).

export interface NudgeMember {
  user_reach_id: string
  run_name: string
  run_date: string // YYYY-MM-DD
  flow_band: string
  gauge_cfs?: number | null
  reason: string
}

export function useNudge() {
  const member = useState<NudgeMember | null>('nudge:member', () => null)
  const promptAllowed = useState<boolean>('nudge:prompt-allowed', () => false)
  const loaded = useState<boolean>('nudge:loaded', () => false)
  // Flips true the first time markShown() actually fires this session —
  // guards against a second /calendar mount re-POSTing /me/nudge/shown.
  const shownThisSession = useState<boolean>('nudge:shown-this-session', () => false)

  const { apiBase } = useRuntimeConfig().public
  const { getToken } = useAuth()

  async function authHeaders(): Promise<Record<string, string>> {
    const token = await getToken()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`
    return headers
  }

  async function loadCandidate(): Promise<void> {
    const headers = await authHeaders()
    if (!headers.Authorization) {
      loaded.value = true
      return
    }
    const res = await fetch(`${apiBase}/api/v1/me/nudge/candidate`, { headers }).catch(() => null)
    if (res?.ok) {
      const data = await res.json().catch(() => null)
      member.value = data?.member ?? null
      promptAllowed.value = !!data?.prompt_allowed
    }
    loaded.value = true
  }

  // Fires POST /me/nudge/shown at most once per session — callers should
  // gate rendering the popup on `!shownThisSession` BEFORE calling this (see
  // NudgeCard's mount-time latch), not rely on this guard alone to hide UI.
  async function markShown(): Promise<void> {
    if (shownThisSession.value) return
    shownThisSession.value = true
    const headers = await authHeaders()
    await fetch(`${apiBase}/api/v1/me/nudge/shown`, { method: 'POST', headers }).catch(() => null)
  }

  // Server-persisted, never re-asks for this (owner, reach, date). Refreshes
  // the calendar range (if one is loaded) so the day's '?' badge clears
  // without a manual reload — mirrors useInvites.accept()'s same pattern.
  async function dismiss(userReachId: string, runDate: string): Promise<boolean> {
    const headers = await authHeaders()
    const res = await fetch(`${apiBase}/api/v1/me/nudge/dismiss`, {
      method: 'POST', headers,
      body: JSON.stringify({ user_reach_id: userReachId, run_date: runDate }),
    }).catch(() => null)
    if (!res?.ok) return false
    member.value = null
    await useCalendar().refresh()
    return true
  }

  async function confirm(userReachId: string, runDate: string, notes?: string): Promise<boolean> {
    const headers = await authHeaders()
    const res = await fetch(`${apiBase}/api/v1/me/nudge/confirm`, {
      method: 'POST', headers,
      body: JSON.stringify({ user_reach_id: userReachId, run_date: runDate, notes: notes || undefined }),
    }).catch(() => null)
    if (!res?.ok) return false
    member.value = null
    await useCalendar().refresh()
    return true
  }

  return { member, promptAllowed, loaded, shownThisSession, loadCandidate, markShown, dismiss, confirm }
}
