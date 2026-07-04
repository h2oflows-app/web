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

      // ── Step 4: run features (rapids + access points, issue #312) ────────
      if (store.featuresDirty) {
        const { rapids, access } = store.featuresToPayload()
        const rapidsRes = await fetch(`${apiBase}/api/v1/me/runs/${slug}/rapids${asQuery}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ rapids }),
        })
        if (!rapidsRes.ok) throw new Error(`Feature save failed: ${rapidsRes.status}`)

        const accessRes = await fetch(`${apiBase}/api/v1/me/runs/${slug}/access${asQuery}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ access }),
        })
        if (!accessRes.ok) throw new Error(`Feature save failed: ${accessRes.status}`)

        store.featuresDirty = false
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

  async function saveEdit(opts?: { slugAvailability?: string }): Promise<{ slug: string } | null> {
    if (!store.name.trim()) {
      toast.add({ title: 'Run name is required', color: 'error' })
      return null
    }
    if (!store.editSlug) {
      toast.add({ title: 'No run to edit', color: 'error' })
      return null
    }

    // Block save if slug is in a bad state
    const slugChanged = store.slug && store.slug !== store.editSlug
    if (slugChanged) {
      const availability = opts?.slugAvailability
      if (availability === 'taken' || availability === 'invalid') {
        toast.add({ title: 'Fix the URL slug before saving', color: 'error' })
        return null
      }
    }

    saving.value = true
    error.value = null

    try {
      const token = await getToken()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers.Authorization = `Bearer ${token}`

      // ── Step 1: PATCH metadata (+ geometry + slug if changed) ────────────
      const patchBody: Record<string, any> = {
        name:       store.name.trim(),
        river_name: store.riverName.trim() || null,
        note:       store.notes.trim() || null,
        class_min:  store.classMin,
        class_max:  store.classMax,
      }
      if (store.gnisId.trim()) patchBody.gnis_id = store.gnisId.trim()

      // Include slug only when changed and not in error state
      if (slugChanged) {
        patchBody.slug = store.slug
      }

      if (store.geometryDirty && store.upComID && store.downComID) {
        if (store.putIn)   patchBody.put_in    = { lat: store.putIn.lat,   lng: store.putIn.lng   }
        if (store.takeOut) patchBody.take_out  = { lat: store.takeOut.lat, lng: store.takeOut.lng }
        patchBody.up_comid   = store.upComID
        patchBody.down_comid = store.downComID
      }

      const patchRes = await fetch(`${apiBase}/api/v1/me/runs/${store.editSlug}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(patchBody),
      })
      if (!patchRes.ok) {
        if (patchRes.status === 409) {
          toast.add({ title: 'Slug conflict', description: 'URL already in use.', color: 'error' })
          return null
        }
        const errData = await patchRes.json().catch(() => ({}))
        throw new Error(errData.error ?? `PATCH failed: ${patchRes.status}`)
      }
      const patchData = await patchRes.json().catch(() => ({}))
      const returnedSlug: string = patchData.slug ?? store.editSlug

      // Update store.editSlug if slug changed so subsequent requests use correct slug
      if (returnedSlug !== store.editSlug) {
        store.editSlug = returnedSlug
        store.slug = returnedSlug
      }

      // ── Step 2: centerline (only if geometry was re-pinned) ───────────────
      if (store.geometryDirty && store.previewCenterline) {
        await fetch(`${apiBase}/api/v1/me/runs/${returnedSlug}/centerline`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ geojson: store.previewCenterline }),
        }).catch(() => { /* non-fatal */ })
      }

      // ── Step 3: flow ranges (always) ─────────────────────────────────────
      const fbRes = await fetch(`${apiBase}/api/v1/me/runs/${returnedSlug}/flow-ranges`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(store.flowBands ?? { base_label: 'Too Low', base_color: 'neutral-3', thresholds: [] }),
      })
      if (!fbRes.ok) throw new Error(`Flow ranges save failed: ${fbRes.status}`)

      // ── Step 4: gauge (only if changed) ──────────────────────────────────
      if (store.gaugeDirty) {
        if (store.customGaugeId) {
          // Custom gauge path: PUT { custom_gauge_id }
          await fetch(`${apiBase}/api/v1/me/runs/${returnedSlug}/gauge`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ custom_gauge_id: store.customGaugeId }),
          }).catch(() => { /* non-fatal */ })
        } else if (store.gauge) {
          // NLDI gauge upsert path
          const g = store.gauge
          await fetch(`${apiBase}/api/v1/me/runs/${returnedSlug}/gauge`, {
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
        } else {
          // Gauge was cleared
          await fetch(`${apiBase}/api/v1/me/runs/${returnedSlug}/gauge`, {
            method: 'DELETE',
            headers,
          }).catch(() => { /* non-fatal */ })
        }
      }

      // ── Step 5: run features (rapids + access points, issue #312) ────────
      if (store.featuresDirty) {
        const { rapids, access } = store.featuresToPayload()
        const rapidsRes = await fetch(`${apiBase}/api/v1/me/runs/${returnedSlug}/rapids`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ rapids }),
        })
        if (!rapidsRes.ok) throw new Error(`Feature save failed: ${rapidsRes.status}`)

        const accessRes = await fetch(`${apiBase}/api/v1/me/runs/${returnedSlug}/access`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ access }),
        })
        if (!accessRes.ok) throw new Error(`Feature save failed: ${accessRes.status}`)

        store.featuresDirty = false
      }

      store.savedSlug = returnedSlug
      return { slug: returnedSlug }
    } catch (e: any) {
      error.value = e.message ?? 'Failed to save run.'
      toast.add({ title: 'Failed to save run', description: error.value ?? undefined, color: 'error' })
      return null
    } finally {
      saving.value = false
    }
  }

  return { save, saveEdit, saving, error }
}
