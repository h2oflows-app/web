/**
 * useMyProfile — current user's handle, fetched once and shared app-wide via
 * useState. Used to tell "my run" from another user's run (e.g. picking the
 * owner-authed vs public flow-ranges endpoint for run coloring).
 */
export function useMyProfile() {
  const handle = useState<string | null>('me:handle', () => null)
  const loaded = useState<boolean>('me:handleLoaded', () => false)
  const { getToken } = useAuth()
  const { apiBase } = useRuntimeConfig().public

  async function load() {
    if (loaded.value) return
    const token = await getToken()
    if (!token) return
    const res = await fetch(`${apiBase}/api/v1/me/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => null)
    if (res?.ok) {
      const data = await res.json().catch(() => null)
      handle.value = data?.handle ?? null
    }
    loaded.value = true
  }

  // True when the given owner handle is the current user (case-insensitive).
  function isMine(ownerHandle: string | null | undefined): boolean {
    if (!ownerHandle || !handle.value) return false
    return ownerHandle.toLowerCase() === handle.value.toLowerCase()
  }

  return { handle, load, isMine }
}
