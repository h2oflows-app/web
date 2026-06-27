<template>
  <div class="fixed inset-0 z-40 bg-[--ui-bg]">
    <!-- Full-bleed map -->
    <RunWizardMap ref="mapRef" class="absolute inset-0" />

    <!-- App bar overlay -->
    <WizardAppBar />

    <!-- River name chip -->
    <RiverNameChip />

    <!-- Bottom sheet / side panel -->
    <WizardSheet>
      <StepPutIn v-if="store.step === 'putin'" @set-putin="mapRef?.confirmPutIn()" />
      <StepTakeOut
        v-else-if="store.step === 'takeout'"
        @set-takeout="mapRef?.confirmTakeOut()"
        @redo-putin="store.redoPutIn()"
      />
      <StepGauge
        v-else-if="store.step === 'gauge'"
        @continue="store.goDetails()"
        @skip="() => {
          store.gaugeSkipped = true
          // In edit mode, skipping = removing gauge (if one was loaded)
          if (store.mode === 'edit' && store.loadedGauge) {
            store.gauge = null
            store.gaugeDirty = true
          }
          store.goDetails()
        }"
      />
      <StepDetails v-else-if="store.step === 'details'" />
    </WizardSheet>

    <!-- Saved overlay (above sheet) -->
    <SavedOverlay v-if="store.step === 'saved'" @reset="handleReset" />

    <!-- Loading overlay for edit prefill -->
    <div
      v-if="editLoading"
      class="absolute inset-0 z-50 flex items-center justify-center"
      :style="{ background: 'color-mix(in srgb, var(--ui-bg) 90%, transparent)' }"
    >
      <div class="flex flex-col items-center gap-3">
        <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 text-[--ui-text-muted] animate-spin" />
        <span class="text-sm text-[--ui-text-muted]">Loading run…</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRunWizardStore } from '~/stores/runWizard'
import length from '@turf/length'

const props = defineProps<{ mode?: 'create' | 'edit'; slug?: string }>()

const store = useRunWizardStore()
const { getToken } = useAuth()
const { apiBase } = useRuntimeConfig().public
const toast = useToast()

const mapRef = ref<{ confirmPutIn: () => void; confirmTakeOut: () => void } | null>(null)
const editLoading = ref(false)

function handleReset() {
  store.reset()
}

async function loadEditRun(slug: string) {
  editLoading.value = true
  try {
    const token = await getToken()
    const headers: Record<string, string> = {}
    if (token) headers.Authorization = `Bearer ${token}`

    const res = await fetch(`${apiBase}/api/v1/me/runs/${slug}`, { headers })
    if (!res.ok) {
      toast.add({ title: 'Run not found', description: `HTTP ${res.status}`, color: 'error' })
      return
    }
    const data = await res.json()

    store.mode = 'edit'
    store.editSlug = slug
    store.name = data.name ?? ''
    store.riverName = data.river_name ?? ''
    store.gnisId = data.gnis_id ?? ''
    store.classMin = data.class_min ?? null
    store.classMax = data.class_max ?? null
    store.notes = data.note ?? ''
    store.flowBands = data.flow_bands ?? null
    store.upComID = data.up_comid ?? null
    store.downComID = data.down_comid ?? null

    if (data.put_in_lat != null && data.put_in_lng != null) {
      store.putIn = {
        lng: data.put_in_lng,
        lat: data.put_in_lat,
        comid: data.up_comid ?? '',
      }
    }
    if (data.take_out_lat != null && data.take_out_lng != null) {
      store.takeOut = {
        lng: data.take_out_lng,
        lat: data.take_out_lat,
        comid: data.down_comid ?? '',
      }
    }

    if (data.centerline) {
      store.previewCenterline = data.centerline
      // Compute distance from existing centerline geometry
      try {
        const geom = data.centerline as any
        const feature = geom.type === 'Feature' ? geom : { type: 'Feature', geometry: geom, properties: {} }
        store.distanceMi = length(feature, { units: 'miles' })
      } catch { /* non-fatal */ }
    }

    // Gauge prefill
    if (data.gauge_external_id) {
      store.loadedGauge = {
        externalId: data.gauge_external_id,
        source: data.gauge_source ?? '',
        name: data.gauge_name ?? '',
      }
      store.gauge = {
        externalId: data.gauge_external_id,
        source: data.gauge_source ?? '',
        name: data.gauge_name ?? '',
        lat: 0,
        lng: 0,
      }
    }

    store.geometryDirty = false
    store.gaugeDirty = false
    store.step = 'details'
  } catch (e: any) {
    toast.add({ title: 'Failed to load run', description: e?.message ?? 'Unknown error', color: 'error' })
  } finally {
    editLoading.value = false
  }
}

onMounted(async () => {
  store.reset()
  if (props.mode === 'edit' && props.slug) {
    await loadEditRun(props.slug)
  }
})
</script>
