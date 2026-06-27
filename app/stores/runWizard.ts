import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { classColor } from '~/utils/classRating'

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

  // Run details (stubs for now)
  const name = ref('')
  const longName = ref('')
  const classMin = ref<number | null>(null)
  const classMax = ref<number | null>(null)
  const flowBands = ref<any>(null)
  const notes = ref('')

  // Map state
  const basemap = ref<'street' | 'topo' | 'satellite'>('street')

  // Distance computed from turf (updated live during takeout drag)
  const distanceMi = ref(0)

  // Gauge stubs
  const gaugeId = ref<string | null>(null)
  const gaugeName = ref('')
  const gaugeSkipped = ref(false)

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
    name.value = ''
    longName.value = ''
    classMin.value = null
    classMax.value = null
    flowBands.value = null
    notes.value = ''
    basemap.value = 'street'
    distanceMi.value = 0
    gaugeId.value = null
    gaugeName.value = ''
    gaugeSkipped.value = false
  }

  return {
    mode, step,
    putIn, takeOut,
    upComID, downComID,
    riverName, gnisId,
    name, longName, classMin, classMax, flowBands, notes,
    basemap, distanceMi,
    gaugeId, gaugeName, gaugeSkipped,
    centerlineColor,
    goPutIn, goTakeOut, goGauge, goDetails, goSaved, back, redoPutIn, reset,
  }
})
