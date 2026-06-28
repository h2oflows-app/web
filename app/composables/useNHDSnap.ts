import { ref, computed, watch } from 'vue'

interface NHDFC { type: string; features: any[] }
interface AnchorSnap { comid: string; name: string }
interface PendingGauge { externalId: string; source: string; name: string; lat: number; lng: number }

export function useNHDSnap(opts: {
  nldiBase: string
  getToken: () => Promise<string | null>
}) {
  const { nldiBase, getToken } = opts

  const pickMode            = ref(false)
  const anchorSnapping      = ref(false)
  const anchorSnap          = ref<AnchorSnap | null>(null)
  const tributaries         = ref<NHDFC | null>(null)
  const downstreamFlowlines = ref<NHDFC | null>(null)
  const downstreamLoading   = ref(false)
  const comidSlot           = ref<'up' | 'down'>('up')
  const upComID             = ref<string | null>(null)
  const downComID           = ref<string | null>(null)
  const startLat            = ref<number | null>(null)
  const startLng            = ref<number | null>(null)
  const endLat              = ref<number | null>(null)
  const endLng              = ref<number | null>(null)
  const comidPairLocked     = ref(false)
  const gaugeSelectMode     = ref(false)
  const gauges              = ref<NHDFC | null>(null)
  const pendingGauge        = ref<PendingGauge | null>(null)
  const gaugeError          = ref('')
  const previewCenterline   = ref<object | null>(null)
  const previewLoading      = ref(false)
  const riverNameSuggestion = ref('')
  const gnisId              = ref('')
  const riverNameFetching   = ref(false)
  const snapError           = ref('')

  const putInPin = computed(() =>
    startLat.value != null && startLng.value != null
      ? { lat: startLat.value, lng: startLng.value, label: 'Start' }
      : null
  )
  const takeOutPin = computed(() =>
    endLat.value != null && endLng.value != null
      ? { lat: endLat.value, lng: endLng.value, label: 'End' }
      : null
  )
  const disableAutoFit = computed(() =>
    !!anchorSnap.value && !(upComID.value && downComID.value)
  )

  async function authHeaders(): Promise<Record<string, string>> {
    const token = await getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  // Auto-load downstream flowlines when upComID changes.
  watch(upComID, async (comid) => {
    downstreamFlowlines.value = null
    if (!comid) return
    downstreamLoading.value = true
    try {
      const res = await fetch(`${nldiBase}/downstream?comid=${comid}&distance=800`, {
        headers: await authHeaders(),
      })
      if (res.ok) downstreamFlowlines.value = (await res.json()).downstream_flowlines
    } catch { /* non-fatal */ }
    finally { downstreamLoading.value = false }
  })

  // Auto-preview + river-name when both ComIDs set.
  watch([upComID, downComID], async ([up, down]) => {
    if (!up || !down) return
    fetchPreviewCenterline()
    fetchRiverName()
  })

  async function fetchNearbyGauges(lat: number, lng: number, comid?: string | null) {
    try {
      const comidParam = comid ? `&comid=${comid}` : ''
      const res = await fetch(
        `${nldiBase}/nearby-gauges?lat=${lat}&lng=${lng}&distance=100${comidParam}`,
        { headers: await authHeaders() },
      )
      if (res.ok) gauges.value = await res.json()
    } catch { /* non-fatal */ }
  }

  async function fetchRiverName() {
    const comid = upComID.value ?? anchorSnap.value?.comid
    if (!comid) return
    riverNameFetching.value = true
    try {
      const coordParams = startLat.value != null && startLng.value != null
        ? `&lat=${startLat.value}&lng=${startLng.value}`
        : ''
      const res = await fetch(`${nldiBase}/river-name?comid=${comid}${coordParams}`, {
        headers: await authHeaders(),
      })
      if (!res.ok) return
      const data = await res.json()
      if (data.river_name) riverNameSuggestion.value = data.river_name
      if (data.gnis_id) gnisId.value = data.gnis_id
    } catch { /* non-fatal */ }
    finally { riverNameFetching.value = false }
  }

  async function fetchPreviewCenterline() {
    if (!upComID.value || !downComID.value) return
    previewLoading.value = true
    previewCenterline.value = null
    try {
      let url = `${nldiBase}/preview-centerline?up_comid=${upComID.value}&down_comid=${downComID.value}`
      if (startLat.value != null && startLng.value != null && endLat.value != null && endLng.value != null)
        url += `&start_lat=${startLat.value}&start_lng=${startLng.value}&end_lat=${endLat.value}&end_lng=${endLng.value}`
      const res = await fetch(url, { headers: await authHeaders() })
      if (res.ok) previewCenterline.value = (await res.json()).geojson
    } catch { /* non-fatal */ }
    finally { previewLoading.value = false }
  }

  async function onAnchorPick(lat: number, lng: number) {
    pickMode.value = false
    anchorSnapping.value = true
    anchorSnap.value = null
    tributaries.value = null
    snapError.value = ''
    try {
      const token = await getToken()
      if (!token) return
      const res = await fetch(
        `${nldiBase}/upstream-tributaries?lat=${lat}&lng=${lng}&distance=50`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      if (!res.ok) { snapError.value = `Snap failed: HTTP ${res.status}`; return }
      const data = await res.json()
      anchorSnap.value = { comid: data.snap.comid, name: data.snap.name ?? '' }
      tributaries.value = data.tributaries
      if (data.snap.name) riverNameSuggestion.value = data.snap.name
      upComID.value   = data.snap.comid
      startLat.value  = lat
      startLng.value  = lng
      comidSlot.value = 'down'
      // Don't block the put-in snap/reveal on gauges — they're only needed at
      // the gauge step. Fire-and-forget so the marker + flowlines appear instantly.
      void fetchNearbyGauges(lat, lng, data.snap.comid)
    } catch (e: any) {
      snapError.value = e.message ?? 'Snap failed'
    } finally {
      anchorSnapping.value = false
    }
  }

  function onComIDSelect(comid: string, lat: number, lng: number) {
    if (comidSlot.value === 'up') {
      upComID.value = comid
      startLat.value = lat; startLng.value = lng
      comidSlot.value = 'down'
    } else {
      downComID.value = comid
      endLat.value = lat; endLng.value = lng
      comidPairLocked.value = true
    }
  }

  function onGaugeSelect(externalId: string, source: string, name: string, lat: number, lng: number) {
    gaugeSelectMode.value = false
    pendingGauge.value = { externalId, source, name, lat, lng }
  }

  function resetToPickMode() {
    pickMode.value        = true
    anchorSnap.value      = null
    tributaries.value     = null
    downstreamFlowlines.value = null
    upComID.value         = null; downComID.value = null
    startLat.value        = null; startLng.value = null
    endLat.value          = null; endLng.value = null
    previewCenterline.value = null
    comidSlot.value       = 'up'
    comidPairLocked.value = false
  }

  function reset() {
    pickMode.value          = true
    anchorSnapping.value    = false
    anchorSnap.value        = null
    tributaries.value       = null
    downstreamFlowlines.value = null
    downstreamLoading.value = false
    comidSlot.value         = 'up'
    upComID.value           = null; downComID.value = null
    startLat.value          = null; startLng.value = null
    endLat.value            = null; endLng.value   = null
    comidPairLocked.value   = false
    gaugeSelectMode.value   = false
    gauges.value            = null
    pendingGauge.value      = null
    gaugeError.value        = ''
    previewCenterline.value = null
    riverNameSuggestion.value = ''
    gnisId.value            = ''
    riverNameFetching.value = false
    snapError.value         = ''
  }

  return {
    pickMode, anchorSnapping, anchorSnap,
    tributaries, downstreamFlowlines, downstreamLoading,
    comidSlot, upComID, downComID,
    startLat, startLng, endLat, endLng,
    comidPairLocked, gaugeSelectMode, gauges, pendingGauge, gaugeError,
    previewCenterline, previewLoading,
    riverNameSuggestion, gnisId, riverNameFetching, snapError,
    putInPin, takeOutPin, disableAutoFit,
    onAnchorPick, onComIDSelect, onGaugeSelect,
    fetchNearbyGauges, fetchRiverName, fetchPreviewCenterline,
    reset, resetToPickMode,
  }
}
