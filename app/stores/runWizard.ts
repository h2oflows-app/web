import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { classColor } from '~/utils/classRating'
import type { FlowBands } from '~/utils/flowBand'

export interface WizardGauge {
  externalId: string
  source: string
  name: string
  lat: number
  lng: number
  distanceMi?: number
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
    goPutIn, goTakeOut, goGauge, goDetails, goSaved, back, redoPutIn, reset,
  }
})
