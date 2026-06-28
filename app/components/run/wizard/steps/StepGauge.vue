<template>
  <div class="flex flex-col gap-5">
    <WizardProgress />

    <!-- Kicker + heading -->
    <div class="flex flex-col gap-1">
      <p class="text-[10px] font-bold tracking-widest text-[--ui-text-muted] uppercase">FLOW GAUGE · Step 3 of 4</p>
      <h2
        class="text-xl font-bold text-[--ui-text-highlighted]"
        style="font-family: var(--font-heading, inherit); letter-spacing: -0.01em"
      >
        Add a gauge
      </h2>
      <p class="text-sm text-[--ui-text-muted]">
        Tap a gauge (amber dot) on the map to attach it. Pan downstream to find more.
      </p>
    </div>

    <!-- ── Selected gauge card ──────────────────────────────────────── -->
    <template v-if="store.gauge">
      <div
        class="rounded-xl overflow-hidden"
        :style="{ border: '1.5px solid #f59e0b', background: 'var(--ui-bg-elevated)' }"
      >
        <!-- Card header chip -->
        <div class="flex items-center gap-1.5 px-3 pt-3 pb-0">
          <span class="w-2 h-2 rounded-full shrink-0" style="background: #f59e0b" />
          <span class="text-[10px] font-bold tracking-widest uppercase" style="color: #f59e0b">SELECTED GAUGE</span>
        </div>

        <div class="px-3 pt-2 pb-3 flex flex-col gap-2">
          <!-- Station name + CFS -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex flex-col gap-0.5 min-w-0">
              <span class="font-semibold text-[--ui-text-highlighted] leading-tight truncate">
                {{ store.gauge.name || '—' }}
              </span>
              <span class="text-xs font-mono text-[--ui-text-muted]">
                {{ store.gauge.source.toUpperCase() }} {{ store.gauge.externalId }}
                <template v-if="store.gauge.distanceMi != null"> · {{ store.gauge.distanceMi }} mi</template>
              </span>
            </div>
            <!-- Live CFS readout -->
            <div v-if="selectedResolved" class="flex flex-col items-end shrink-0">
              <span
                class="text-2xl font-mono font-bold tabular-nums leading-none"
                :style="{ color: selectedCfsColor }"
              >{{ selectedResolved.cfs }}<span class="text-sm font-normal ml-0.5">cfs</span></span>
              <span
                v-if="selectedResolved.bandLabel"
                class="text-[11px] font-medium mt-0.5"
                :style="{ color: selectedCfsColor }"
              >
                <span class="inline-block w-1.5 h-1.5 rounded-full mr-0.5 align-middle" :style="{ background: selectedCfsColor }" />
                {{ selectedResolved.bandLabel }}
              </span>
            </div>
            <div v-else-if="selectedLoading" class="h-8 w-16 rounded animate-pulse shrink-0" :style="{ background: 'var(--ui-bg-muted)' }" />
          </div>

          <!-- Sparkline (only when UUID known) -->
          <GaugeSparkline
            v-if="selectedResolved?.uuid"
            :gauge-id="selectedResolved.uuid"
            :flow-status="selectedResolved.flowStatus ?? 'unknown'"
            :flow-band-label="selectedResolved.bandLabel ?? null"
            :color="selectedCfsColor"
            compact
            class="pointer-events-none"
          />
        </div>
      </div>

      <p class="text-xs text-center text-[--ui-text-dimmed]">Tap another amber dot to change</p>
    </template>

    <!-- ── No gauge selected ────────────────────────────────────────── -->
    <template v-else>
      <div
        class="flex flex-col items-center gap-2 px-4 py-6 rounded-xl text-center"
        :style="{ background: 'var(--ui-bg-muted)', border: '1px solid var(--ui-border)' }"
      >
        <span class="text-sm text-[--ui-text-muted]">No gauge selected — tap an amber dot on the map.</span>
      </div>
    </template>

    <!-- ── Actions ──────────────────────────────────────────────────── -->
    <div class="flex flex-col gap-2">
      <UButton
        label="Set gauge"
        color="primary"
        block
        size="lg"
        :disabled="!store.gauge"
        @click="emit('continue')"
      />
      <UButton
        label="Skip — add a gauge later"
        variant="ghost"
        color="neutral"
        block
        size="sm"
        @click="emit('skip')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRunWizardStore } from '~/stores/runWizard'
import { bandForCfs, flowBandSolidColor, flowStatusForColorKey } from '~/utils/flowBand'

const emit = defineEmits<{ continue: []; skip: [] }>()

const store = useRunWizardStore()
const { apiBase } = useRuntimeConfig().public

// ── Resolution state ──────────────────────────────────────────────────────────

interface Resolved {
  uuid: string
  cfs: number
  bandLabel: string | null
  flowStatus: string
}

const selectedResolved = ref<Resolved | null>(null)
const selectedLoading = ref(false)

const selectedCfsColor = computed(() => {
  if (!selectedResolved.value) return '#9ca3af'
  return flowBandSolidColor(selectedResolved.value.bandLabel, selectedResolved.value.flowStatus)
})

// ── Core resolution: external_id → UUID + live CFS ───────────────────────────

async function resolveGauge(externalId: string, source: string): Promise<Resolved | null> {
  try {
    const res = await fetch(`${apiBase}/api/v1/gauges/search?q=${encodeURIComponent(externalId)}&limit=10`)
    if (!res.ok) return null
    const data = await res.json()
    const feature = (data.features ?? []).find(
      (f: any) => f.properties?.external_id === externalId && f.properties?.source === source
    )
    if (!feature) return null

    const uuid: string = feature.properties.id
    const currentCfs: number | null = feature.properties.current_cfs ?? null
    if (currentCfs == null) return null

    let bandLabel: string | null = null
    let flowStatus = 'unknown'

    if (store.flowBands) {
      const band = bandForCfs(currentCfs, store.flowBands)
      if (band) {
        bandLabel = band.label
        flowStatus = flowStatusForColorKey(band.color)
      }
    }

    return { uuid, cfs: Math.round(currentCfs), bandLabel, flowStatus }
  } catch {
    return null
  }
}

async function resolveSelected() {
  const g = store.gauge
  if (!g) { selectedResolved.value = null; return }
  selectedLoading.value = true
  selectedResolved.value = null
  try {
    selectedResolved.value = await resolveGauge(g.externalId, g.source)
  } catch { /* graceful degradation */ } finally {
    selectedLoading.value = false
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(() => {
  resolveSelected()
})

// Re-resolve when gauge changes (map click picks a new one). Pure tap-to-select —
// no auto pre-selection; the user must tap an amber dot on the map.
watch(() => store.gauge, () => {
  resolveSelected()
})
</script>
