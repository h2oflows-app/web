import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { classColor } from '~/utils/classRating'
import type { FlowBands } from '~/utils/flowBand'
import { type RunFeatureType, featureDefaultLabel } from '~/utils/runFeatureTypes'

export interface WizardGauge {
  externalId: string
  source: string
  name: string
  lat: number
  lng: number
  distanceMi?: number
}

// A single run feature (rapid / surf / hazard / camp / parking / boat_ramp /
// access) as edited in the wizard. Unifies the rapids + reach_access records
// behind one shape; runWizard owns the mapping to/from the API (issue #312).
export interface RunFeature {
  id: string                    // real UUID (loaded) or client temp id 'tmp-<n>' (new, unsaved)
  type: RunFeatureType
  name: string
  description: string           // → rapid.description OR access.notes
  lng: number
  lat: number
  classRating: number | null    // rapids only (from class chips)
  hazardType: string | null     // hazards only
}

export const useRunWizardStore = defineStore('runWizard', () => {
  const mode = ref<'create' | 'edit'>('create')
  const step = ref<'putin' | 'takeout' | 'gauge' | 'details' | 'saved'>('putin')

  // Snapped coordinates
  const putIn = ref<{ lng: number; lat: number; comid: string; measure?: number } | null>(null)
  const takeOut = ref<{ lng: number; lat: number; comid: string; measure?: number } | null>(null)

  // COMID pair
  const upComID = ref<string | null>(null)
  const downComID = ref<string | null>(null)

  // River metadata
  const riverName = ref('')
  const gnisId = ref('')

  // Centerline GeoJSON (fetched by map after both COMIDs set)
  const previewCenterline = ref<object | null>(null)

  // Run details
  const name = ref('')
  const longName = ref('')
  const classMin = ref<number | null>(null)
  const classMax = ref<number | null>(null)
  const flowBands = ref<FlowBands | null>(null)
  const notes = ref('')

  // Saved slug (stashed after create for SavedOverlay navigation)
  const savedSlug = ref<string | null>(null)
  const savedAsH2oflows = ref(false)

  // Map state
  const basemap = ref<'street' | 'topo' | 'satellite'>('street')

  // Distance computed from turf (updated live during takeout drag)
  const distanceMi = ref(0)

  // Gauge (Pass B wires the full object; Pass A it stays null)
  const gauge = ref<WizardGauge | null>(null)
  const gaugeSkipped = ref(false)

  // Nearby gauges populated by the map during the gauge step
  const nearbyGauges = ref<WizardGauge[]>([])

  // Edit mode state
  const editSlug = ref<string | null>(null)
  const geometryDirty = ref(false)
  const gaugeDirty = ref(false)
  const loadedGauge = ref<{ externalId: string; source: string; name: string } | null>(null)

  // Advanced edit fields (edit mode only)
  const slug = ref('')
  const customGaugeId = ref<string | null>(null)
  const forkedFromName = ref<string | null>(null)
  const forkedFromSlug = ref<string | null>(null)
  const originalAuthorHandle = ref<string | null>(null)
  const originalForkedAt = ref<string | null>(null)
  const authorHandle = ref<string | null>(null)

  // ── Run features editor (issue #312) ────────────────────────────────────────
  // Feature pins (rapids/access) placed on the run. Loaded from the run payload
  // in edit mode, edited on the map, and persisted on save when featuresDirty.
  const features = ref<RunFeature[]>([])
  const featuresDirty = ref(false)

  // Editor sub-mode within the Details step:
  //   'off'  → normal Details form
  //   'list' → feature mode (palette + list) replaces the sheet
  //   'form' → add/edit one feature
  const featureMode = ref<'off' | 'list' | 'form'>('off')
  // Active placing tool: a type is selected, awaiting a map tap. null = not placing.
  const placingType = ref<RunFeatureType | null>(null)
  // Feature currently open in the form (a feature id), or null.
  const editingFeatureId = ref<string | null>(null)
  // Id of a just-placed, not-yet-confirmed feature (drives Add vs Save + cancel-removes).
  const draftFeatureId = ref<string | null>(null)

  let tmpCounter = 0
  function nextTmpId(): string { return `tmp-${++tmpCounter}` }

  // Derived
  const centerlineColor = computed(() => classColor(classMax.value ?? 0))

  // Step machine
  function goPutIn() { step.value = 'putin' }
  function goTakeOut() { step.value = 'takeout' }
  function goGauge() { step.value = 'gauge' }
  function goDetails() { step.value = 'details' }
  function goSaved() { step.value = 'saved' }

  function back() {
    if (step.value === 'takeout') { step.value = 'putin' }
    else if (step.value === 'gauge') { step.value = 'takeout' }
    else if (step.value === 'details') { step.value = 'gauge' }
  }

  function redoPutIn() {
    putIn.value = null
    takeOut.value = null
    upComID.value = null
    downComID.value = null
    distanceMi.value = 0
    step.value = 'putin'
  }

  // ── Feature editor actions ──────────────────────────────────────────────────
  function enterFeatureMode() { featureMode.value = 'list'; placingType.value = null }
  function exitFeatureMode() {
    featureMode.value = 'off'
    placingType.value = null
    editingFeatureId.value = null
    draftFeatureId.value = null
  }

  function startPlacing(type: RunFeatureType) { placingType.value = type }
  function cancelPlacing() { placingType.value = null }

  // Called by the map after a tap in placing mode: drop a new feature at lng/lat
  // (already snapped for river types) and open its form as a draft.
  function placeFeature(type: RunFeatureType, lng: number, lat: number): RunFeature {
    const f: RunFeature = {
      id: nextTmpId(),
      type,
      name: '',
      description: '',
      lng,
      lat,
      classRating: null,
      hazardType: type === 'hazard' ? 'Low-head dam' : null,
    }
    features.value = [...features.value, f]
    editingFeatureId.value = f.id
    draftFeatureId.value = f.id
    placingType.value = null
    featureMode.value = 'form'
    featuresDirty.value = true
    return f
  }

  function editFeature(id: string) {
    editingFeatureId.value = id
    draftFeatureId.value = null
    featureMode.value = 'form'
  }

  function updateFeature(id: string, patch: Partial<Omit<RunFeature, 'id'>>) {
    const f = features.value.find(x => x.id === id)
    if (!f) return
    Object.assign(f, patch)
    featuresDirty.value = true
  }

  // Drag on the map → move a pin (coords already snapped for river types by the map).
  function moveFeature(id: string, lng: number, lat: number) { updateFeature(id, { lng, lat }) }

  // Type-switcher in the form. Switching to a hazard seeds a default hazard type;
  // leaving rapid clears the class. Re-snap is handled by the map watching type.
  function changeFeatureType(id: string, type: RunFeatureType) {
    const f = features.value.find(x => x.id === id)
    if (!f) return
    f.type = type
    if (type === 'hazard' && !f.hazardType) f.hazardType = 'Low-head dam'
    if (type !== 'hazard') f.hazardType = null
    if (type !== 'rapid') f.classRating = null
    featuresDirty.value = true
  }

  // "Add feature" / "Save feature": empty name defaults to the type label; back to list.
  function confirmFeature() {
    const id = editingFeatureId.value
    if (id) {
      const f = features.value.find(x => x.id === id)
      if (f && !f.name.trim()) f.name = featureDefaultLabel(f.type)
    }
    draftFeatureId.value = null
    editingFeatureId.value = null
    featureMode.value = 'list'
  }

  // Cancel/close the form. An unconfirmed draft (never saved) is discarded.
  function cancelFeatureForm() {
    if (editingFeatureId.value && editingFeatureId.value === draftFeatureId.value) {
      removeFeature(editingFeatureId.value)
    }
    draftFeatureId.value = null
    editingFeatureId.value = null
    featureMode.value = 'list'
  }

  function removeFeature(id: string) {
    features.value = features.value.filter(x => x.id !== id)
    featuresDirty.value = true
    if (editingFeatureId.value === id) {
      editingFeatureId.value = null
      draftFeatureId.value = null
      featureMode.value = 'list'
    }
  }

  // Prefill from a run GET payload (edit mode). rapids[]/access_points[] already
  // come back on the run detail response. put_in/take_out access rows are owned
  // by steps 1-2 (excluded); rows without coords can't be placed (excluded).
  function loadFeaturesFromPayload(rapids: any[] | null | undefined, access: any[] | null | undefined) {
    const fromRapids: RunFeature[] = (rapids ?? [])
      .filter(r => r?.lng != null && r?.lat != null)
      .map(r => ({
        id: String(r.id),
        type: r.is_permanent_hazard ? 'hazard' : r.is_surf_wave ? 'surf' : 'rapid',
        name: r.name ?? '',
        description: r.description ?? '',
        lng: r.lng,
        lat: r.lat,
        classRating: r.class_rating ?? null,
        hazardType: r.hazard_type ?? null,
      }) as RunFeature)
    const fromAccess: RunFeature[] = (access ?? [])
      .filter(a => a?.lng != null && a?.lat != null && a?.access_type !== 'put_in' && a?.access_type !== 'take_out')
      .map(a => ({
        id: String(a.id),
        // DB 'intermediate' ⇄ palette 'access'; other access types pass through.
        type: (a.access_type === 'intermediate' ? 'access' : a.access_type) as RunFeatureType,
        name: a.name ?? '',
        description: a.notes ?? '',
        lng: a.lng,
        lat: a.lat,
        classRating: null,
        hazardType: null,
      }) as RunFeature)
    features.value = [...fromRapids, ...fromAccess]
    featuresDirty.value = false
  }

  // Serialize for the bulk-replace PUTs. Splits by target table; empty names
  // default to the type label; palette 'access' → DB access_type 'intermediate'.
  function featuresToPayload() {
    const rapids = features.value
      .filter(f => f.type === 'rapid' || f.type === 'surf' || f.type === 'hazard')
      .map(f => ({
        name: f.name.trim() || featureDefaultLabel(f.type),
        description: f.description.trim() || null,
        class_rating: f.type === 'rapid' ? f.classRating : null,
        is_surf_wave: f.type === 'surf',
        is_permanent_hazard: f.type === 'hazard',
        hazard_type: f.type === 'hazard' ? (f.hazardType || null) : null,
        lng: f.lng,
        lat: f.lat,
      }))
    const access = features.value
      .filter(f => f.type === 'camp' || f.type === 'parking' || f.type === 'boat_ramp' || f.type === 'access' || f.type === 'shuttle_drop')
      .map(f => ({
        access_type: f.type === 'access' ? 'intermediate' : f.type,
        name: f.name.trim() || featureDefaultLabel(f.type),
        notes: f.description.trim() || null,
        lng: f.lng,
        lat: f.lat,
      }))
    return { rapids, access }
  }

  function reset() {
    mode.value = 'create'
    step.value = 'putin'
    putIn.value = null
    takeOut.value = null
    upComID.value = null
    downComID.value = null
    riverName.value = ''
    gnisId.value = ''
    previewCenterline.value = null
    name.value = ''
    longName.value = ''
    classMin.value = null
    classMax.value = null
    flowBands.value = null
    notes.value = ''
    savedSlug.value = null
    savedAsH2oflows.value = false
    basemap.value = 'street'
    distanceMi.value = 0
    gauge.value = null
    gaugeSkipped.value = false
    nearbyGauges.value = []
    editSlug.value = null
    geometryDirty.value = false
    gaugeDirty.value = false
    loadedGauge.value = null
    slug.value = ''
    customGaugeId.value = null
    forkedFromName.value = null
    forkedFromSlug.value = null
    originalAuthorHandle.value = null
    originalForkedAt.value = null
    authorHandle.value = null
    features.value = []
    featuresDirty.value = false
    featureMode.value = 'off'
    placingType.value = null
    editingFeatureId.value = null
    draftFeatureId.value = null
  }

  return {
    mode, step,
    putIn, takeOut,
    upComID, downComID,
    riverName, gnisId,
    previewCenterline,
    name, longName, classMin, classMax, flowBands, notes,
    savedSlug, savedAsH2oflows,
    basemap, distanceMi,
    gauge, gaugeSkipped, nearbyGauges,
    centerlineColor,
    editSlug, geometryDirty, gaugeDirty, loadedGauge,
    slug, customGaugeId,
    forkedFromName, forkedFromSlug, originalAuthorHandle, originalForkedAt, authorHandle,
    // Run features editor (#312)
    features, featuresDirty, featureMode, placingType, editingFeatureId, draftFeatureId,
    enterFeatureMode, exitFeatureMode, startPlacing, cancelPlacing, placeFeature,
    editFeature, updateFeature, moveFeature, changeFeatureType,
    confirmFeature, cancelFeatureForm, removeFeature,
    loadFeaturesFromPayload, featuresToPayload,
    goPutIn, goTakeOut, goGauge, goDetails, goSaved, back, redoPutIn, reset,
  }
})
