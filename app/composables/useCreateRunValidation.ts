/**
 * useCreateRunValidation — dupe-geometry + name-conflict checks for the Create Run wizard.
 *
 * CREATE mode only. State is owned by the composable instance (per-mount in StepDetails),
 * so a fresh wizard (Add another run / store.reset()) always starts clean.
 *
 * Mirrors the checks in UserRunAuthor.vue §V21 + §V22.
 */
import { ref } from 'vue'
import { useRunWizardStore } from '~/stores/runWizard'

export interface ClusterRun {
  id: string
  slug: string
  name: string
  author_handle: string | null
  is_special: boolean
  class_min: number | null
  class_max: number | null
  rank_score: number
}

export function useCreateRunValidation() {
  const store = useRunWizardStore()
  const { getToken } = useAuth()
  const { apiBase } = useRuntimeConfig().public

  // ── State ────────────────────────────────────────────────────────────────
  const dupeRuns              = ref<ClusterRun[]>([])
  const dupeDismissed         = ref(false)
  const nameConflictSlug      = ref<string | null>(null)
  const nameConflictDismissed = ref(false)

  // ── V21: geometry dupe check ─────────────────────────────────────────────
  async function checkDupes(): Promise<void> {
    if (!store.putIn || !store.takeOut) return
    dupeDismissed.value = false
    dupeRuns.value = []
    try {
      const token = await getToken()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers.Authorization = `Bearer ${token}`
      const res = await fetch(`${apiBase}/api/v1/user-runs/dupe-check`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          put_in_lat:   store.putIn.lat,
          put_in_lng:   store.putIn.lng,
          take_out_lat: store.takeOut.lat,
          take_out_lng: store.takeOut.lng,
          up_comid:     store.upComID ?? '',
        }),
      })
      if (res.ok) {
        const data = await res.json()
        dupeRuns.value = data.runs ?? []
      }
    } catch { /* non-fatal */ }
  }

  // ── V22: name uniqueness check against own runs ──────────────────────────
  // Returns the conflicting slug if found, null otherwise (never throws).
  async function checkNameConflict(): Promise<string | null> {
    try {
      const token = await getToken()
      const headers: Record<string, string> = {}
      if (token) headers.Authorization = `Bearer ${token}`
      const res = await fetch(`${apiBase}/api/v1/me/reaches`, { headers })
      if (!res.ok) return null
      const runs: Array<{ slug: string; name: string; long_name: string | null }> = await res.json()
      const nameLower     = store.name.trim().toLowerCase()
      const longNameLower = store.longName.trim().toLowerCase()
      const conflict = runs.find(r =>
        r.name.toLowerCase() === nameLower ||
        (longNameLower && r.long_name?.toLowerCase() === longNameLower)
      )
      return conflict?.slug ?? null
    } catch {
      return null // non-fatal — never block on a failed check
    }
  }

  return {
    dupeRuns,
    dupeDismissed,
    nameConflictSlug,
    nameConflictDismissed,
    checkDupes,
    checkNameConflict,
  }
}
