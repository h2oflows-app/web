/**
 * useRunSave — create a run from the wizard store.
 *
 * Mirrors UserRunAuthor.vue's submit() create path exactly:
 *   1. POST /api/v1/me/reaches[?as=h2oflows]
 *   2. POST /api/v1/me/runs/{slug}/centerline[?as=h2oflows]  (skip if no centerline)
 *   3. PUT  /api/v1/me/runs/{slug}/gauge[?as=h2oflows]       (skip if no gauge)
 *
 * Returns { slug, asH2oflows } on success.
 */
import { ref } from 'vue'
import { useRunWizardStore } from '~/stores/runWizard'

export function useRunSave() {
  const store = useRunWizardStore()
  const { getToken, isDataAdmin } = useAuth()
  const { apiBase } = useRuntimeConfig().public
  const toast = useToast()

  const saving = ref(false)
  const error = ref<string | null>(null)

  async function save(authorAsH2oflows: boolean = false): Promise<{ slug: string; asH2oflows: boolean } | null> {
    if (!store.name.trim() || !store.upComID || !store.downComID || !store.putIn || !store.takeOut) {
      toast.add({ title: 'Missing required fields', description: 'Name, put-in, and take-out are required.', color: 'error' })
      return null
    }

    saving.value = true
    error.value = null

    try {
      const token = await getToken()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers.Authorization = `Bearer ${token}`

      // ?as=h2oflows: replicate UserRunAuthor's data-admin gate.
      // Only when user is a data admin AND the toggle is on.
      const authoredAsH2oflows = isDataAdmin.value && authorAsH2oflows
      const asQuery = authoredAsH2oflows ? '?as=h2oflows' : ''

      // ── Step 1: create the reach ─────────────────────────────────────────
      const body: Record<string, any> = {
        name:       store.name.trim(),
        up_comid:   store.upComID,
        down_comid: store.downComID,
        put_in:    { lat: store.putIn.lat,  lng: store.putIn.lng  },
        take_out:  { lat: store.takeOut.lat, lng: store.takeOut.lng },
      }

      // Optional fields — only include when non-empty (match UserRunAuthor exactly)
      if (store.longName.trim())  body.long_name  = store.longName.trim()
      if (store.riverName.trim()) body.river_name = store.riverName.trim()
      if (store.gnisId.trim())    body.gnis_id    = store.gnisId.trim()
      if (store.notes.trim())     body.note       = store.notes.trim()
      if (store.classMin != null) body.class_min  = store.classMin
      if (store.classMax != null) body.class_max  = store.classMax
      // Always send flow_bands (matches UserRunAuthor: body.flow_bands = form.value.flowBands)
      body.flow_bands = store.flowBands ?? { base_label: 'Too Low', base_color: 'neutral-3', thresholds: [] }

      const res = await fetch(`${apiBase}/api/v1/me/reaches${asQuery}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      const slug: string = data.slug

      // ── Step 2: store centerline ─────────────────────────────────────────
      if (store.previewCenterline) {
        await fetch(`${apiBase}/api/v1/me/runs/${slug}/centerline${asQuery}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ geojson: store.previewCenterline }),
        }).catch(() => { /* non-fatal */ })
      }

      // ── Step 3: attach gauge (upsert form) ──────────────────────────────
      // Pass B wires this. For now, gauge is null on every wizard flow,
      // but the wire is ready: external_id+source+name+lat+lng upsert path.
      if (store.gauge) {
        const g = store.gauge
        await fetch(`${apiBase}/api/v1/me/runs/${slug}/gauge${asQuery}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            external_id: g.externalId,
            source:      g.source,
            name:        g.name,
            lat:         g.lat,
            lng:         g.lng,
          }),
        }).catch(() => { /* non-fatal */ })
      }

      // Stash for SavedOverlay
      store.savedSlug = slug
      store.savedAsH2oflows = authoredAsH2oflows

      return { slug, asH2oflows: authoredAsH2oflows }
    } catch (e: any) {
      error.value = e.message ?? 'Failed to create run.'
      toast.add({ title: 'Failed to create run', description: error.value ?? undefined, color: 'error' })
      return null
    } finally {
      saving.value = false
    }
  }

  return { save, saving, error }
}
