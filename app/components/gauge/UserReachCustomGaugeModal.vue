<template>
  <UModal v-model:open="open" :ui="{ content: 'sm:max-w-xl max-sm:!inset-0 max-sm:!w-auto max-sm:!max-w-none max-sm:!rounded-none max-sm:!ring-0 max-sm:!translate-x-0 max-sm:!translate-y-0' }">
    <template #header>
      <div class="flex items-start justify-between gap-3 w-full">
        <div class="min-w-0 flex-1">
          <h2 class="text-lg font-bold text-neutral-900 dark:text-white truncate leading-tight">{{ reachName }}</h2>
          <p class="text-xs text-neutral-400 mt-0.5 flex items-center gap-1">
            <svg class="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="10" y2="10"/><line x1="14" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="10" y2="14"/><line x1="14" y1="14" x2="16" y2="14"/>
            </svg>
            Calculated · {{ gaugeName }}
          </p>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <NuxtLink
            v-if="reachSlug"
            :to="`/my/reaches/${reachSlug}`"
            class="p-1.5 rounded-md text-neutral-400 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
            title="Edit reach"
            @click="open = false"
          >
            <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>
          </NuxtLink>
          <NuxtLink
            v-else
            :to="`/my/gauges/${gaugeSlug}`"
            class="p-1.5 rounded-md text-neutral-400 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
            title="Edit gauge"
            @click="open = false"
          >
            <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>
          </NuxtLink>
          <button
            class="p-1 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
            aria-label="Close"
            @click="open = false"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
    </template>

    <template #body>
      <div class="space-y-3">
        <!-- Current value + badge -->
        <div class="flex items-baseline gap-2 flex-wrap">
          <span class="text-3xl font-bold tabular-nums leading-none text-neutral-900 dark:text-white">
            {{ currentCfs != null ? currentCfs.toLocaleString() : '—' }}
          </span>
          <span class="text-sm text-neutral-500">cfs</span>
          <span
            v-if="flowBand"
            :class="['inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium', bandBadgeClass(flowBand, flowStatus)]"
          >{{ flowBandLabel(flowBand, flowStatus) }}</span>
        </div>

        <!-- Time window toggle — drives all charts -->
        <div class="flex justify-end">
          <div class="flex text-xs rounded overflow-hidden border border-neutral-200 dark:border-neutral-700">
            <button
              v-for="h in ([12, 24, 48] as const)"
              :key="h"
              class="px-2 py-1 transition-colors"
              :class="hours === h ? 'bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200' : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'"
              @click="hours = h; load()"
            >{{ h }}h</button>
          </div>
        </div>

        <!-- Diurnal cycle banners — hoisted from input gauges to the top of the modal -->
        <div
          v-for="inp in inputsWithDiurnal"
          :key="`d-${inp.gauge_id}`"
          class="flex items-start gap-2 rounded-lg px-3 py-2 text-xs bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300"
        >
          <span class="text-base shrink-0 leading-tight">🌡</span>
          <span class="min-w-0">
            <strong>{{ inp.gauge_name }}</strong> diurnal cycle —
            {{ diurnalPhaseLabel(inp.diurnal!) }}
            <template v-if="inp.diurnal!.estimatedPeakHour != null">
              · Est. peak {{ formatHour(inp.diurnal!.estimatedPeakHour) }}
              (~{{ inp.diurnal!.peakCfs?.toLocaleString() }} cfs)
            </template>
            <template v-if="inp.diurnal!.swingPct != null">
              · {{ inp.diurnal!.swingPct }}% daily swing
            </template>
          </span>
        </div>

        <!-- Main custom gauge chart -->
        <div class="relative w-full overflow-hidden" style="height:240px">
          <div ref="container" class="w-full h-full" />
          <div
            v-if="loading"
            class="absolute inset-0 flex items-center justify-center text-neutral-400 text-sm bg-white/70 dark:bg-neutral-900/70"
          >Loading…</div>
          <div
            v-else-if="readings.length === 0"
            class="absolute inset-0 flex items-center justify-center text-neutral-400 text-sm"
          >No readings in this window</div>
        </div>

        <!-- Input gauges — shown when custom gauge detail is loaded -->
        <template v-if="inputs.length > 0">
          <div class="border-t border-neutral-100 dark:border-neutral-800 pt-3">
            <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-3">Input Gauges</p>
            <div class="space-y-4">
              <div v-for="inp in inputs" :key="inp.gauge_id">
                <div class="flex items-start gap-1.5 mb-1">
                  <span
                    class="text-xs font-bold px-1.5 rounded mt-0.5 shrink-0"
                    :class="inp.sign >= 0 ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400'"
                  >{{ inp.sign >= 0 ? '+' : '−' }}</span>
                  <div class="min-w-0">
                    <p class="text-xs font-medium text-neutral-600 dark:text-neutral-300 truncate">{{ inp.gauge_name }}</p>
                    <p class="text-xs text-neutral-400">{{ inp.source.toUpperCase() }} {{ inp.external_id }}</p>
                  </div>
                </div>
                <GaugeGraph
                  :gauge-id="inp.gauge_id"
                  no-ranges
                  hide-diurnal
                  :color="inp.sign >= 0 ? '#10b981' : '#f87171'"
                  :height="130"
                  :controlled-hours="hours"
                  @diurnal="(d) => onInputDiurnal(inp.gauge_id, d)"
                />
              </div>
            </div>
          </div>
        </template>
      </div>
    </template>

  </UModal>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onUnmounted, onMounted } from 'vue'
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'
import { flowBandLabel } from '~/utils/flowBand'
import type { DiurnalPattern } from '~/composables/useDiurnalPattern'

const { bandBadgeClass } = useFlowBandPalette()

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

const loading   = ref(false)
const readings  = ref<Array<{ timestamp: string; cfs: number }>>([])
const hours     = ref<12 | 24 | 48>(48)
const container = ref<HTMLElement | null>(null)
let chart: uPlot | null = null

interface InputGauge {
  position: number
  gauge_id: string
  external_id: string
  source: string
  gauge_name: string
  sign: number
}
const inputs = ref<InputGauge[]>([])

// Per-input-gauge diurnal data hoisted from child GaugeGraphs so banners
// can render at the top of the modal instead of below each chart.
const inputDiurnals = ref(new Map<string, DiurnalPattern>())

function onInputDiurnal(gaugeId: string, d: DiurnalPattern) {
  if (d.detected) inputDiurnals.value.set(gaugeId, d)
  else inputDiurnals.value.delete(gaugeId)
}

const inputsWithDiurnal = computed(() =>
  inputs.value
    .map(inp => ({ ...inp, diurnal: inputDiurnals.value.get(inp.gauge_id) ?? null }))
    .filter(inp => inp.diurnal?.detected),
)

function diurnalPhaseLabel(d: DiurnalPattern): string {
  switch (d.phase) {
    case 'rising':      return 'Rising'
    case 'falling':     return 'Falling'
    case 'near_peak':   return 'Near peak'
    case 'near_trough': return 'Near trough'
    default:            return 'Stable'
  }
}

function formatHour(h: number): string {
  const ampm = h >= 12 ? 'pm' : 'am'
  const display = h % 12 === 0 ? 12 : h % 12
  return `${display}${ampm}`
}

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
    await nextTick()
    buildChart()
  }
}

function buildChart() {
  if (!container.value) return
  chart?.destroy()
  chart = null
  if (readings.value.length === 0) return

  const sorted = [...readings.value].reverse()
  const xs = new Float64Array(sorted.map(r => new Date(r.timestamp).getTime() / 1000))
  const ys = new Float64Array(sorted.map(r => r.cfs))

  const chartWidth = container.value.clientWidth || 400
  chart = new uPlot(
    {
      width:   chartWidth,
      height:  240,
      padding: [8, 0, 0, 0],
      cursor:  { show: true },
      legend:  { show: false },
      axes: [
        { stroke: '#9ca3af', ticks: { stroke: '#374151' }, grid: { stroke: '#1f2937', width: 1 } },
        { stroke: '#9ca3af', ticks: { stroke: '#374151' }, grid: { stroke: '#1f2937', width: 1 } },
      ],
      series: [
        {},
        {
          stroke: '#3b82f6',
          width:  2,
          fill:   'rgba(59,130,246,0.08)',
        },
      ],
    },
    [xs, ys],
    container.value,
  )

  requestAnimationFrame(() => {
    if (chart && container.value) {
      chart.setSize({ width: container.value.clientWidth, height: 240 })
    }
  })
}

// immediate: true catches the case where the component mounts with open already
// true (v-if becomes active in the same tick as open = true, so the non-immediate
// watcher never sees the false→true transition on first open).
watch(open, async (v) => {
  if (v) {
    await nextTick()
    load()
    loadDetail()
  } else {
    chart?.destroy()
    chart = null
    readings.value = []
    inputs.value = []
  }
}, { immediate: true })

// If UModal renders body lazily, container ref becomes non-null after load() resolves.
// Rebuild chart whenever the container element mounts.
watch(container, (el) => {
  if (el && !loading.value && readings.value.length > 0) buildChart()
})

onUnmounted(() => { chart?.destroy() })
</script>
