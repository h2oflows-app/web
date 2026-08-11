<!--
  UserRunCustomGaugeModal — instance C of the #361 gauge sheet.

  Composes <GaugeSheetModal> (filename tag; nuxt.config sets pathPrefix:false)
  so a calculated gauge renders through the same shell and the same GaugeGraph
  code path as the two GaugeDetailModal instances.

    #chart  GaugeGraph variant="sheet" fed the series this component fetches
            (`readings` prop = no readings request inside the graph)
    #foot   one full-bleed strip per input gauge, sharing the sheet's x axis

  Two sub-cases, both driven by `reachSlug`:
    reachSlug set   → run-backed custom gauge, header edits the run
    reachSlug empty → standalone custom gauge, header edits the gauge

  No reference lines and no flow-ranges request: a calculated series has no
  thresholds of its own, so the fill/stroke color comes from the flowBand /
  flowStatus props the caller already holds. No seasonal record either, hence
  no Season & cycle drawer — instead each input strip carries its own expand
  with that input gauge's seasonal + diurnal detail, which is where those two
  banners used to render (one per input, inline, under a full GaugeGraph).
-->
<template>
  <GaugeSheetModal
    v-model:open="open"
    v-model:hours="hours"
    :value-cfs="displayCfs"
    :band-label="bandLabel"
    :band-class="bandClass"
    :meta-text="metaText"
    :drawer-label="null"
  >
    <template #title>{{ reachName }}</template>

    <template #subtitle>
      <span class="flex items-center gap-1">
        <svg class="size-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="4" y="2" width="16" height="20" rx="2" /><line x1="8" y1="6" x2="16" y2="6" /><line x1="8" y1="10" x2="10" y2="10" /><line x1="14" y1="10" x2="16" y2="10" /><line x1="8" y1="14" x2="10" y2="14" /><line x1="14" y1="14" x2="16" y2="14" />
        </svg>
        <span class="min-w-0 truncate">Calculated · {{ gaugeName }}</span>
      </span>
    </template>

    <!-- Both edit paths survive: the run editor when this gauge backs a run,
         the gauge editor when it stands alone. -->
    <template #actions>
      <NuxtLink
        :to="editPath"
        class="inline-flex h-6.5 shrink-0 items-center rounded-lg bg-primary-50 px-2.5 text-[11px] font-semibold text-primary-600 transition-colors hover:bg-primary-100 dark:bg-primary-500/20 dark:text-primary-300 dark:hover:bg-primary-500/30"
        @click="open = false"
      >{{ editLabel }}</NuxtLink>
    </template>

    <template #chart>
      <div class="relative">
        <GaugeGraph
          variant="sheet"
          :gauge-id="gaugeSlug"
          no-ranges
          :readings="readings"
          :reference-lines="null"
          :color="chartColor"
          :controlled-hours="hours"
          :foot-inset="0"
        />
        <!-- The graph's own empty state would flash "No readings in this window"
             while our fetch is still in flight, because an empty injected series
             is still an injected series. -->
        <div
          v-if="loading"
          class="absolute inset-0 flex items-center justify-center bg-white/70 text-sm text-neutral-400 dark:bg-neutral-950/70"
        >Loading…</div>
      </div>
    </template>

    <!-- Input gauges — full-bleed strips, no cards, no dividers. The shell caps
         and scrolls this slot (only it knows the sheet height), so a gauge with
         many inputs can't crush the chart above it or push its own strips —
         and their expandable seasonal/diurnal detail — out of reach. -->
    <template v-if="inputs.length > 0" #foot>
      <div>
        <p class="px-4 pb-1 text-[10px] font-bold tracking-[0.11em] text-neutral-400 uppercase dark:text-neutral-500">Input gauges</p>

        <div v-for="inp in inputs" :key="inp.gauge_id">
          <div class="relative">
            <GaugeGraph
              variant="strip"
              :gauge-id="inp.gauge_id"
              no-ranges
              :color="signColor(inp.sign)"
              :height="STRIP_HEIGHT"
              :controlled-hours="hours"
              @latest-cfs="cfs => (latestByGauge[inp.gauge_id] = cfs)"
              @diurnal="pattern => (diurnalByGauge[inp.gauge_id] = pattern)"
            />

            <!-- Label row floats over its own strip; only the disclosure takes
                 pointers so the strip keeps its hover tooltip. -->
            <div class="pointer-events-none absolute inset-x-0 top-0 flex items-center gap-1.5 px-4 pt-2">
              <span
                class="inline-flex size-4 shrink-0 items-center justify-center rounded text-[11px] font-bold"
                :class="inp.sign >= 0
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400'"
                aria-hidden="true"
              >{{ inp.sign >= 0 ? '+' : '−' }}</span>
              <span class="truncate text-[11.5px] font-semibold text-neutral-700 dark:text-white/80">{{ inp.gauge_name }}</span>
              <span class="shrink-0 text-[10px] text-neutral-400 dark:text-neutral-500">{{ inp.source.toUpperCase() }} {{ inp.external_id }}</span>
              <span class="ml-auto shrink-0 text-xs font-semibold tabular-nums text-neutral-600 dark:text-white/75">
                {{ latestByGauge[inp.gauge_id] != null ? latestByGauge[inp.gauge_id]!.toLocaleString() : '—' }}
                <span class="text-[9.5px] font-medium text-neutral-400 dark:text-neutral-500">cfs</span>
              </span>
              <button
                type="button"
                class="pointer-events-auto -mr-1 inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded text-neutral-400 transition-colors hover:text-neutral-700 focus:outline-none focus-visible:outline-none dark:text-neutral-500 dark:hover:text-white"
                :aria-expanded="expanded[inp.gauge_id] === true"
                :aria-label="`Season & cycle for ${inp.gauge_name}`"
                @click="toggleExpanded(inp.gauge_id)"
              >
                <svg
                  class="size-3.5 transition-transform"
                  :class="expanded[inp.gauge_id] ? 'rotate-180' : ''"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Everything the strip variant drops relative to the old inline
               GaugeGraph: seasonal record + diurnal cycle for this input. -->
          <div
            v-if="expanded[inp.gauge_id]"
            class="flex flex-col gap-4 bg-neutral-50 px-4 py-3 dark:bg-white/5"
          >
            <span class="text-[10px] font-bold tracking-[0.11em] text-neutral-400 uppercase dark:text-neutral-500">Season &amp; cycle</span>
            <GaugeSeasonalBanner
              :gauge-id="inp.gauge_id"
              :current-cfs="latestByGauge[inp.gauge_id] ?? null"
              variant="drawer"
            />
            <GaugeDiurnalBanner :pattern="diurnalByGauge[inp.gauge_id] ?? null" variant="drawer" />
          </div>
        </div>
      </div>
    </template>
  </GaugeSheetModal>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { flowBandLabel } from '~/utils/flowBand'
import type { DiurnalPattern } from '~/composables/useDiurnalPattern'

const { bandBadgeClass, bandSolid } = useFlowBandPalette()

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  reachName: string
  reachSlug: string
  gaugeName: string
  gaugeSlug: string
  currentCfs: number | null
  flowBand: string | null
  flowStatus: string
}>()

const { apiBase } = useRuntimeConfig().public
const { getToken } = useAuth()

interface Reading {
  timestamp: string
  cfs:       number
}

interface InputGauge {
  position:    number
  gauge_id:    string
  external_id: string
  source:      string
  gauge_name:  string
  sign:        number
}

const loading  = ref(false)
const readings = ref<Reading[]>([])
const hours    = ref<12 | 24 | 168 | 720>(24)
const inputs   = ref<InputGauge[]>([])

// Per-input state, keyed by gauge id: disclosure, latest value and diurnal
// pattern (both emitted by that strip's own graph — no extra requests).
const expanded       = ref<Record<string, boolean>>({})
const latestByGauge  = ref<Record<string, number>>({})
const diurnalByGauge = ref<Record<string, DiurnalPattern>>({})

// Mini-chart geometry + the emerald/red stroke pair the input strips have
// always used. These go straight to a uPlot canvas, which can't read classes.
const STRIP_HEIGHT = 96
const PLUS_LINE    = '#10b981'
const MINUS_LINE   = '#f87171'

function signColor(sign: number): string {
  return sign >= 0 ? PLUS_LINE : MINUS_LINE
}

function toggleExpanded(gaugeId: string) {
  expanded.value[gaugeId] = !expanded.value[gaugeId]
}

// ---- Header ----------------------------------------------------------------

const editPath  = computed(() => props.reachSlug ? `/my/runs/${props.reachSlug}` : `/my/gauges/${props.gaugeSlug}`)
const editLabel = computed(() => props.reachSlug ? 'Edit run' : 'Edit gauge')

// The band chip stays hidden for a standalone custom gauge, which has no band.
const bandLabel = computed(() => props.flowBand ? flowBandLabel(props.flowBand, props.flowStatus) : null)
const bandClass = computed(() => props.flowBand ? bandBadgeClass(props.flowBand, props.flowStatus) : null)

// Fill + stroke color for the calculated series. Undefined hands the choice
// back to GaugeGraph, which falls through to the theme's neutral line var.
const chartColor = computed<string | undefined>(() =>
  props.flowBand ? bandSolid(props.flowBand, props.flowStatus) : undefined,
)

// Readings arrive newest-first; don't assume it, the endpoint is the only
// source and a reversal would silently show the oldest value as current.
const latestReading = computed<Reading | null>(() => {
  const list = readings.value
  if (list.length === 0) return null
  const first = list[0]!
  const last  = list[list.length - 1]!
  return new Date(last.timestamp).getTime() >= new Date(first.timestamp).getTime() ? last : first
})

const displayCfs = computed(() => latestReading.value?.cfs ?? props.currentCfs)

function relativeAge(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ${m % 60}m ago`
  return `${Math.floor(h / 24)}d ago`
}

// "Recomputed 4m ago · Little Kern + Fairview diversion"
const metaText = computed<string | null>(() => {
  const parts: string[] = []
  const latest = latestReading.value
  if (latest) parts.push(`Recomputed ${relativeAge(latest.timestamp)}`)
  if (inputs.value.length > 0) {
    parts.push(inputs.value
      .map((inp, i) => i === 0
        ? (inp.sign >= 0 ? inp.gauge_name : `− ${inp.gauge_name}`)
        : `${inp.sign >= 0 ? '+' : '−'} ${inp.gauge_name}`)
      .join(' '))
  }
  return parts.length > 0 ? parts.join(' · ') : null
})

// ---- Data ------------------------------------------------------------------

async function loadDetail() {
  const token = await getToken()
  const res = await fetch(
    `${apiBase}/api/v1/me/custom-gauges/${props.gaugeSlug}`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  ).catch(() => null)
  if (res?.ok) {
    const data = await res.json()
    inputs.value = data.inputs ?? []
  }
}

async function load() {
  loading.value = true
  try {
    const token  = await getToken()
    const since  = new Date(Date.now() - hours.value * 3_600_000).toISOString()
    const res    = await fetch(
      `${apiBase}/api/v1/me/custom-gauges/${props.gaugeSlug}/readings?since=${since}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    )
    if (res.ok) readings.value = await res.json()
    else readings.value = []
  } catch {
    readings.value = []
  } finally {
    loading.value = false
  }
}

// The range switch lives in the shell now; refetching on change is still ours.
watch(hours, () => { load() })

// immediate: true catches the case where the component mounts with open already
// true (v-if becomes active in the same tick as open = true, so the non-immediate
// watcher never sees the false→true transition on first open).
watch(open, async (v) => {
  if (v) {
    await nextTick()
    load()
    loadDetail()
  } else {
    readings.value       = []
    inputs.value         = []
    expanded.value       = {}
    latestByGauge.value  = {}
    diurnalByGauge.value = {}
  }
}, { immediate: true })
</script>
