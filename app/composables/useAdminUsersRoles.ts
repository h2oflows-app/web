/**
 * useAdminUsersRoles — shared admin state for the Users & Roles tab (#315 / #314).
 *
 * Module-level refs (mirrors useDashboards.ts pattern) so admin.vue and its
 * child components (AdminUserRail, SpecialUserDetail, RoleDetail, UserDetail,
 * BulkApiPanel, modals) all read/write the same reactive data without prop
 * drilling every mutation back up.
 *
 * API contract (h2oflows-app/api, coordinated in ADMIN_REDESIGN.md):
 *   GET/POST   /api/v1/admin/special-users
 *   PATCH/DEL  /api/v1/admin/special-users/{ownerId}
 *   POST       /api/v1/admin/special-users/{ownerId}/rotate-key
 *   GET        /api/v1/admin/roles
 *   POST/DEL   /api/v1/admin/roles/{role}/members[/{userId}]
 *   GET        /api/v1/admin/users?q=&limit=&offset=
 *   PATCH      /api/v1/admin/users/{ownerId}/rate-limit
 *   POST       /api/v1/admin/users/{ownerId}/rotate-key
 */

export interface RateLimit {
  runs_per_hour: number
  max_batch: number
  requests_per_minute: number
  concurrent_jobs: number
}

export interface SpecialUser {
  id: string
  handle: string
  display_name: string | null
  is_special: true
  public_on_map: boolean
  delete_locked: boolean
  run_count: number
  member_count: number
  usage_hour: number
  api_key_last4: string
  created_at: string
  rate_limit: RateLimit
}

export interface RoleMember {
  user_id: string
  handle: string
  display_name: string | null
  is_bot?: boolean
}

export interface Role {
  name: string
  system: boolean
  members: RoleMember[]
}

export interface DirectoryUser {
  owner_id: string
  handle: string
  display_name: string | null
  is_special: boolean
  roles: string[]
  run_count: number
  api_key_last4: string
  usage_hour: number
  rate_limit: RateLimit
  created_at: string
}

// What's selected in the master-detail rail.
export type AdminSelection =
  | { kind: 'special'; id: string }
  | { kind: 'role'; name: string }
  | { kind: 'user'; ownerId: string }

export const SPECIAL_RATE_DEFAULTS: RateLimit = { runs_per_hour: 500, max_batch: 50, requests_per_minute: 60, concurrent_jobs: 1 }
export const STANDARD_RATE_DEFAULTS: RateLimit = { runs_per_hour: 100, max_batch: 10, requests_per_minute: 30, concurrent_jobs: 1 }

// Friendly display for system roles; per-special-user roles (handle-named) pass through raw.
export function roleLabel(name: string): { title: string; handle: string } {
  if (name === 'site_admin') return { title: 'Admins', handle: 'admins' }
  return { title: name, handle: name }
}

// ── Module-level shared state ──────────────────────────────────────────────
const specialUsers = ref<SpecialUser[]>([])
const specialUsersLoading = ref(false)
const specialUsersLoaded = ref(false)

const roles = ref<Role[]>([])
const rolesLoading = ref(false)
const rolesLoaded = ref(false)

const directoryUsers = ref<DirectoryUser[]>([])
const directoryLoading = ref(false)

// Last load failure across the three list loaders — distinguishes "the admin
// API is unreachable / doesn't have these endpoints" from a genuinely empty
// list (a 404 must not render as "no users").
const loadError = ref<string | null>(null)

// Avatar initials, null-safe. display_name is nullable on the API (*string)
// — most real users have no display name, only a handle. A raw
// name.trim() on null threw in the rail template and unmounted the whole
// list (the "flash then blank" bug). Falls back to the handle.
export function userInitials(name?: string | null, fallback?: string | null): string {
  const src = (name ?? '').trim() || (fallback ?? '').trim()
  if (!src) return '?'
  const parts = src.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

// Display label for a possibly-nameless user: display name, else @handle.
export function userLabel(name?: string | null, handle?: string | null): string {
  return (name ?? '').trim() || `@${handle ?? 'unknown'}`
}

// The currently-selected "All users" directory entry — held separately from
// directoryUsers so it survives the search list changing out from under it.
const selectedDirectoryUser = ref<DirectoryUser | null>(null)

export function useAdminUsersRoles() {
  const { apiBase } = useRuntimeConfig().public
  const { getToken } = useAuth()

  async function authHeaders(json = false): Promise<Record<string, string>> {
    const token = await getToken()
    const h: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
    if (json) h['Content-Type'] = 'application/json'
    return h
  }

  // ── Special users ─────────────────────────────────────────────────────
  async function loadSpecialUsers() {
    specialUsersLoading.value = true
    try {
      const res = await fetch(`${apiBase}/api/v1/admin/special-users`, { headers: await authHeaders() })
      if (res.ok) {
        specialUsers.value = await res.json()
        loadError.value = null
        specialUsersLoaded.value = true   // success only — a failed load must retry next visit
      } else {
        loadError.value = `Admin API returned ${res.status} — is the API running a build with special-user support (#314)?`
      }
    } catch {
      loadError.value = 'Admin API unreachable — network error.'
    } finally {
      specialUsersLoading.value = false
    }
  }

  async function createSpecialUser(payload: { handle: string; display_name: string; public_on_map?: boolean; runs_per_hour?: number }): Promise<(SpecialUser & { api_key: string }) | { error: string } | null> {
    try {
      const res = await fetch(`${apiBase}/api/v1/admin/special-users`, {
        method: 'POST',
        headers: await authHeaders(true),
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return { error: data.error ?? `Failed: ${res.status}` }
      // Response is SpecialUser fields + api_key (shown once) — strip the key
      // before appending so the list holds a clean SpecialUser shape.
      const { api_key: _key, ...su } = data
      specialUsers.value = [...specialUsers.value, su as SpecialUser]
      // No directory mirror: the All-users directory intentionally excludes
      // special accounts (they have their own section).
      return data
    } catch {
      return { error: 'Network error' }
    }
  }

  async function updateSpecialUser(ownerId: string, patch: Partial<Pick<SpecialUser, 'handle' | 'display_name' | 'public_on_map' | 'delete_locked'>>): Promise<boolean> {
    try {
      const res = await fetch(`${apiBase}/api/v1/admin/special-users/${ownerId}`, {
        method: 'PATCH',
        headers: await authHeaders(true),
        body: JSON.stringify(patch),
      })
      if (!res.ok) return false
      specialUsers.value = specialUsers.value.map(u => u.id === ownerId ? { ...u, ...patch } : u)
      return true
    } catch {
      return false
    }
  }

  async function deleteSpecialUser(ownerId: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(`${apiBase}/api/v1/admin/special-users/${ownerId}`, {
        method: 'DELETE',
        headers: await authHeaders(),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        return { ok: false, error: data.error ?? `Failed: ${res.status}` }
      }
      specialUsers.value = specialUsers.value.filter(u => u.id !== ownerId)
      // Keep the All-users directory in sync (separate list — a deleted
      // account lingered there until a page refresh).
      directoryUsers.value = directoryUsers.value.filter(u => u.owner_id !== ownerId)
      if (selectedDirectoryUser.value?.owner_id === ownerId) selectedDirectoryUser.value = null
      return { ok: true }
    } catch {
      return { ok: false, error: 'Network error' }
    }
  }

  async function rotateSpecialUserKey(ownerId: string): Promise<string | null> {
    try {
      const res = await fetch(`${apiBase}/api/v1/admin/special-users/${ownerId}/rotate-key`, {
        method: 'POST',
        headers: await authHeaders(),
      })
      if (!res.ok) return null
      const data = await res.json()
      const key = data.api_key as string
      const last4 = key.slice(-4)
      specialUsers.value = specialUsers.value.map(u => u.id === ownerId ? { ...u, api_key_last4: last4 } : u)
      return key
    } catch {
      return null
    }
  }

  // ── Roles ──────────────────────────────────────────────────────────────
  async function loadRoles() {
    rolesLoading.value = true
    try {
      const res = await fetch(`${apiBase}/api/v1/admin/roles`, { headers: await authHeaders() })
      if (res.ok) {
        roles.value = await res.json()
        loadError.value = null
        rolesLoaded.value = true   // success only
      } else {
        loadError.value = `Admin API returned ${res.status} — is the API running a build with special-user support (#314)?`
      }
    } catch {
      loadError.value = 'Admin API unreachable — network error.'
    } finally {
      rolesLoading.value = false
    }
  }

  async function addRoleMember(roleName: string, userId: string): Promise<boolean> {
    try {
      const res = await fetch(`${apiBase}/api/v1/admin/roles/${encodeURIComponent(roleName)}/members`, {
        method: 'POST',
        headers: await authHeaders(true),
        body: JSON.stringify({ user_id: userId }),
      })
      if (!res.ok) return false
      await Promise.all([loadRoles(), loadSpecialUsers()])
      return true
    } catch {
      return false
    }
  }

  async function removeRoleMember(roleName: string, userId: string): Promise<boolean> {
    try {
      const res = await fetch(`${apiBase}/api/v1/admin/roles/${encodeURIComponent(roleName)}/members/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        headers: await authHeaders(),
      })
      if (!res.ok) return false
      roles.value = roles.value.map(r => r.name === roleName ? { ...r, members: r.members.filter(m => m.user_id !== userId) } : r)
      await loadSpecialUsers()
      return true
    } catch {
      return false
    }
  }

  // ── Directory (All users) ───────────────────────────────────────────────
  async function searchDirectory(q: string, limit = 10, offset = 0) {
    directoryLoading.value = true
    try {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
      if (q) params.set('q', q)
      const res = await fetch(`${apiBase}/api/v1/admin/users?${params}`, { headers: await authHeaders() })
      if (res.ok) {
        directoryUsers.value = await res.json()
        loadError.value = null
      } else {
        loadError.value = `Admin API returned ${res.status} — is the API running a build with special-user support (#314)?`
      }
    } catch {
      loadError.value = 'Admin API unreachable — network error.'
    } finally {
      directoryLoading.value = false
    }
  }

  function selectDirectoryUser(u: DirectoryUser) {
    selectedDirectoryUser.value = u
  }

  function patchSelectedDirectoryUser(patch: Partial<DirectoryUser>) {
    if (!selectedDirectoryUser.value) return
    selectedDirectoryUser.value = { ...selectedDirectoryUser.value, ...patch }
    const id = selectedDirectoryUser.value.owner_id
    directoryUsers.value = directoryUsers.value.map(u => u.owner_id === id ? { ...u, ...patch } : u)
  }

  // ── Rate limits + key rotation (both special + standard users) ─────────
  async function updateRateLimit(ownerId: string, rateLimit: RateLimit): Promise<boolean> {
    try {
      const res = await fetch(`${apiBase}/api/v1/admin/users/${ownerId}/rate-limit`, {
        method: 'PATCH',
        headers: await authHeaders(true),
        body: JSON.stringify(rateLimit),
      })
      if (!res.ok) return false
      specialUsers.value = specialUsers.value.map(u => u.id === ownerId ? { ...u, rate_limit: rateLimit } : u)
      if (selectedDirectoryUser.value?.owner_id === ownerId) patchSelectedDirectoryUser({ rate_limit: rateLimit })
      return true
    } catch {
      return false
    }
  }

  async function rotateUserKey(ownerId: string): Promise<string | null> {
    try {
      const res = await fetch(`${apiBase}/api/v1/admin/users/${ownerId}/rotate-key`, {
        method: 'POST',
        headers: await authHeaders(),
      })
      if (!res.ok) return null
      const data = await res.json()
      const key = data.api_key as string
      const last4 = key.slice(-4)
      if (selectedDirectoryUser.value?.owner_id === ownerId) patchSelectedDirectoryUser({ api_key_last4: last4 })
      return key
    } catch {
      return null
    }
  }

  return {
    // state
    specialUsers, specialUsersLoading, specialUsersLoaded,
    roles, rolesLoading, rolesLoaded,
    directoryUsers, directoryLoading,
    selectedDirectoryUser, loadError,
    // special users
    loadSpecialUsers, createSpecialUser, updateSpecialUser, deleteSpecialUser, rotateSpecialUserKey,
    // roles
    loadRoles, addRoleMember, removeRoleMember,
    // directory
    searchDirectory, selectDirectoryUser, patchSelectedDirectoryUser,
    // rate limit / keys (generalized)
    updateRateLimit, rotateUserKey,
  }
}
