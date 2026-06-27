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
        {{ mode === 'suggest' ? 'Add a gauge' : 'Choose a gauge' }}
      </h2>
      <p class="text-sm text-[--ui-text-muted]">
        <template v-if="mode === 'suggest'">
          We found the nearest gauge on
          <strong>{{ store.riverName || 'this reach' }}</strong>.
          Adaptive polling keeps it live.
        </template>
        <template v-else>
          Pick the gauge that best tracks this reach.
        </template>
      </p>
    </div>

    <!-- ── Empty state ─────────────────────────────────────── -->
    <template v-if="store.nearbyGauges.length === 0">
      <div
        class="flex flex-col items-center gap-2 px-4 py-6 rounded-xl text-center"
        :style="{ background: 'var(--ui-bg-muted)', border: '1px solid var(--ui-border)' }"
      >
        <span class="text-sm text-[--ui-text-muted]">No gauges found near this reach.</span>
      </div>
      <UButton
        label="Skip — add a gauge later"
        variant="ghost"
        color="neutral"
        block
        @click="emit('skip')"
      />
    </template>

    <!-- ── Suggest mode ───────────────────────────────────── -->
    <template v-else-if="mode === 'suggest'">
      <!-- Nearest gauge card -->
      <div
        class="rounded-xl overflow-hidden"
        :style="{ border: '1.5px solid #0891b2', background: 'var(--ui-bg-elevated)' }"
      >
        <!-- Card header chip -->
        <div class="flex items-center gap-1.5 px-3 pt-3 pb-0">
          <span class="w-2 h-2 rounded-full shrink-0" style="background: #0891b2" />
          <span class="text-[10px] font-bold tracking-widest uppercase" style="color: #0891b2">NEAREST GAUGE ON THIS REACH</span>
        </div>

        <div class="px-3 pt-2 pb-3 flex flex-col gap-2">
          <!-- Station name + CFS -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex flex-col gap-0.5 min-w-0">
              <span class="font-semibold text-[--ui-text-highlighted] leading-tight truncate">
                {{ nearest?.name || '—' }}
              </span>
              <span class="text-xs font-mono text-[--ui-text-muted]">
                {{ nearest?.externalId }}
                <template v-if="nearest?.distanceMi != null"> · {{ nearest.distanceMi }} mi</template>
              </span>
            </div>
            <!-- Live CFS readout -->
            <div v-if="nearestResolved" class="flex flex-col items-end shrink-0">
              <span
                class="text-2xl font-mono font-bold tabular-nums leading-none"
                :style="{ color: nearestCfsColor }"
              >{{ nearestResolved.cfs }}<span class="text-sm font-normal ml-0.5">cfs</span></span>
              <span
                v-if="nearestResolved.bandLabel"
                class="text-[11px] font-medium mt-0.5"
                :style="{ color: nearestCfsColor }"
              >
                <span class="inline-block w-1.5 h-1.5 rounded-full mr-0.5 align-middle" :style="{ background: nearestCfsColor }" />
                {{ nearestResolved.bandLabel }}
              </span>
            </div>
            <div v-else-if="nearestLoading" class="h-8 w-16 rounded animate-pulse shrink-0" :style="{ background: 'var(--ui-bg-muted)' }" />
          </div>

          <!-- Sparkline (only when UUID known) -->
          <GaugeSparkline
            v-if="nearestResolved?.uuid"
            :gauge-id="nearestResolved.uuid"
            :flow-status="nearestResolved.flowStatus ?? 'unknown'"
            :flow-band-label="nearestResolved.bandLabel ?? null"
            :color="nearestCfsColor"
            compact
            class="pointer-events-none"
          />
        </div>
      </div>

      <!-- Actions -->
      <div class="flex flex-col gap-2">
        <div class="flex gap-2">
          <UButton
            label="Change"
            variant="outline"
            color="neutral"
            class="flex-1"
            @click="switchToChoose"
          />
          <UButton
            label="Use this gauge"
            color="primary"
            class="flex-2"
            :style="{ '--ui-primary': '#0891b2' }"
            @click="useNearestAndContinue"
          />
        </div>
        <UButton
          label="Skip — add a gauge later"
          variant="ghost"
          color="neutral"
          block
          size="sm"
          @click="emit('skip')"
        />
      </div>
    </template>

    <!-- ── Choose mode ────────────────────────────────────── -->
    <template v-else>
      <div class="flex flex-col gap-2">
        <div
          v-for="(g, i) in store.nearbyGauges"
          :key="g.externalId"
          class="flex items-start gap-3 rounded-xl px-3 py-3 cursor-pointer transition-colors"
          :style="{
            border: isSelected(g) ? '1.5px solid #0891b2' : '1px solid var(--ui-border)',
            background: isSelected(g) ? 'color-mix(in srgb, #0891b2 8%, var(--ui-bg-elevated))' : 'var(--ui-bg-elevated)',
          }"
          @click="selectGauge(g)"
        >
          <!-- Radio indicator -->
          <div
            class="mt-0.5 w-4 h-4 rounded-full shrink-0 border-2 flex items-center justify-center"
            :style="{
              borderColor: isSelected(g) ? '#0891b2' : 'var(--ui-border-muted)',
              background: 'var(--ui-bg)',
            }"
          >
            <div
              v-if="isSelected(g)"
              class="w-2 h-2 rounded-full"
              style="background: #0891b2"
            />
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="font-medium text-sm text-[--ui-text-highlighted] leading-tight">{{ g.name }}</span>
              <UBadge v-if="i === 0" label="Nearest" size="xs" variant="subtle" color="primary" />
            </div>
            <div class="text-xs font-mono text-[--ui-text-muted] mt-0.5">
              {{ g.source.toUpperCase() }} {{ g.externalId }}
              <template v-if="g.distanceMi != null"> · {{ g.distanceMi }} mi</template>
            </div>
          </div>

          <!-- CFS if resolved -->
          <div class="shrink-0 text-right">
            <template v-if="resolvedMap[g.externalId]">
              <span
                class="text-base font-mono font-bold tabular-nums leading-none"
                :style="{ color: resolvedColor(g.externalId) }"
              >{{ resolvedMap[g.externalId]!.cfs }}</span>
              <span class="text-[11px] text-[--ui-text-muted] ml-0.5">cfs</span>
            </template>
            <div v-else-if="loadingSet.has(g.externalId)" class="h-5 w-10 rounded animate-pulse" :style="{ background: 'var(--ui-bg-muted)' }" />
          </div>
        </div>
      </div>

      <!-- Footer actions -->
      <div class="flex flex-col gap-2">
        <UButton
          label="Use selected gauge"
          color="primary"
          block
          :style="{ '--ui-primary': '#0891b2' }"
          :disabled="!store.gauge"
          @click="useSelectedAndContinue"
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
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRunWizardStore } from '~/stores/runWizard'
import type { WizardGauge } from '~/stores/runWizard'
import { bandForCfs, flowBandSolidColor, flowStatusForColorKey } from '~/utils/flowBand'

const emit = defineEmits<{ continue: []; skip: [] }>()

const store = useRunWizardStore()
const { apiBase } = useRuntimeConfig().public

// ── Mode ─────────────────────────────────────────────────────────────────────

const mode = ref<'suggest' | 'choose'>('suggest')

function switchToChoose() {
  mode.value = 'choose'
  resolveAll()
}

// ── Nearest gauge (suggest mode) ──────────────────────────────────────────────

const nearest = computed<WizardGauge | undefined>(() => store.nearbyGauges[0])

interface Resolved {
  uuid: string
  cfs: number
  bandLabel: string | null
  flowStatus: string
}

const nearestResolved = ref<Resolved | null>(null)
const nearestLoading = ref(false)

const nearestCfsColor = computed(() => {
  if (!nearestResolved.value) return '#9ca3af'
  return flowBandSolidColor(nearestResolved.value.bandLabel, nearestResolved.value.flowStatus)
})

async function resolveNearest() {
  const g = nearest.value
  if (!g) return
  nearestLoading.value = true
  nearestResolved.value = null
  try {
    const r = await resolveGauge(g.externalId, g.source)
    nearestResolved.value = r
  } catch { /* graceful degradation */ } finally {
    nearestLoading.value = false
  }
}

// ── Resolution cache (choose mode) ───────────────────────────────────────────

const resolvedMap = ref<Record<string, Resolved>>({})
const loadingSet = ref(new Set<string>())

function resolvedColor(externalId: string): string {
  const r = resolvedMap.value[externalId]
  if (!r) return '#9ca3af'
  return flowBandSolidColor(r.bandLabel, r.flowStatus)
}

async function resolveAll() {
  for (const g of store.nearbyGauges) {
    if (resolvedMap.value[g.externalId] || loadingSet.value.has(g.externalId)) continue
    loadingSet.value.add(g.externalId)
    // Replace set to trigger reactivity
    loadingSet.value = new Set(loadingSet.value)
    resolveGauge(g.externalId, g.source)
      .then(r => {
        if (r) resolvedMap.value[g.externalId] = r
      })
      .catch(() => { /* graceful */ })
      .finally(() => {
        loadingSet.value.delete(g.externalId)
        loadingSet.value = new Set(loadingSet.value)
      })
  }
}

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

// ── Selection helpers ─────────────────────────────────────────────────────────

function isSelected(g: WizardGauge): boolean {
  return store.gauge?.externalId === g.externalId
}

function selectGauge(g: WizardGauge) {
  store.gauge = g
}

function useNearestAndContinue() {
  if (nearest.value) store.gauge = nearest.value
  emit('continue')
}

function useSelectedAndContinue() {
  // store.gauge already set by selectGauge; just advance
  emit('continue')
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(() => {
  if (!store.gauge && nearest.value) {
    store.gauge = nearest.value
  }
  resolveNearest()
})

// Re-resolve nearest if nearbyGauges populate after mount
watch(() => store.nearbyGauges, (gs) => {
  if (gs.length > 0 && !nearestResolved.value && !nearestLoading.value) {
    if (!store.gauge) store.gauge = gs[0]!
    resolveNearest()
  }
  if (mode.value === 'choose') resolveAll()
}, { deep: true })
</script>
