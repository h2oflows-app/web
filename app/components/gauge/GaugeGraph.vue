<template>
  <div class="space-y-3">
    <!-- Time window toggle — hidden when parent controls hours externally -->
    <div v-if="!props.controlledHours" class="flex justify-end">
      <div class="flex text-xs rounded overflow-hidden border border-neutral-200 dark:border-neutral-700">
        <button
          v-for="[h, label] in ([[12,'12h'],[24,'1d'],[168,'1w'],[720,'1m']] as const)"
          :key="h"
          class="px-2 py-1 transition-colors"
          :class="hours === h ? 'bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200' : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'"
          @click="hours = h"
        >{{ label }}</button>
      </div>
    </div>

    <!-- Chart container — always mounted so the ref is never torn down mid-update.
         Overlay states sit on top without removing the canvas from the DOM. -->
    <div class="relative w-full overflow-hidden" :style="{ height: `${props.height ?? 200}px` }">
      <div ref="container" class="w-full h-full" />
      <!-- Hover tooltip -->
      <div
        ref="tooltipEl"
        class="absolute pointer-events-none text-xs bg-neutral-900/90 text-white rounded px-1.5 py-0.5 whitespace-nowrap translate-x-2 -translate-y-full"
        style="display:none; z-index:10"
      />
      <div
        v-if="loading"
        class="absolute inset-0 flex items-center justify-center text-neutral-400 text-sm bg-white/70 dark:bg-neutral-900/70"
      >Loading…</div>
      <div
        v-else-if="readings.length === 0"
        class="absolute inset-0 flex items-center justify-center text-neutral-400 text-sm"
      >No readings in this window</div>
    </div>

    <!-- Flow range legend -->
    <div v-if="bandRegions.length > 0" class="space-y-1">
      <div class="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-neutral-700 dark:text-neutral-300">
        <span
          v-for="region in bandRegions"
          :key="region.label"
          class="flex items-center gap-1.5"
        >
          <span class="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0" :style="{ background: colorKeyToHex(region.color) }" />
          <span class="font-medium">{{ region.label }}</span>
          <span class="text-neutral-500 dark:text-neutral-400">
            {{ region.from != null ? region.from.toLocaleString() : '—' }}–{{ region.to != null ? region.to.toLocaleString() : '∞' }} cfs
          </span>
        </span>
      </div>
    </div>

    <!-- Seasonal context + diurnal cycle — below the chart (suppressed when parent hoists) -->
    <GaugeSeasonalBanner :gauge-id="gaugeId" :current-cfs="currentCfs" />
    <div
      v-if="diurnal.detected && !props.hideDiurnal"
      class="flex items-center gap-2 rounded-lg px-3 py-2 text-xs bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300"
    >
      <span class="text-base">🌡</span>
      <span>
        <strong>Diurnal cycle</strong> —
        {{ diurnalPhaseLabel }}
        <template v-if="diurnal.estimatedPeakHour != null">
          · Est. peak {{ formatHour(diurnal.estimatedPeakHour) }}
          (~{{ diurnal.peakCfs?.toLocaleString() }} cfs)
        </template>
        <template v-if="diurnal.swingPct != null">
          · {{ diurnal.swingPct }}% daily swing
        </template>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted, nextTick } from 'vue'
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'
import { useDiurnalPattern, type DiurnalPattern } from '~/composables/useDiurnalPattern'
import type { FlowBands } from '~/utils/flowBand'

// ---- Types ------------------------------------------------------------------

interface Reading {
  cfs:       number
  timestamp: string
}

// ---- Props ------------------------------------------------------------------

const props = defineProps<{
  gaugeId: string
  reachSlug?: string | null
  currentCfs?: number | null
  noRanges?: boolean
  color?: string          // override line color
  height?: number         // chart height in px (default 200)
  controlledHours?: 12 | 24 | 168 | 720  // parent-controlled time window; hides toggle
  hideDiurnal?: boolean   // suppress inline diurnal banner (parent renders it above graph)
}>()

const emit = defineEmits<{
  (e: 'latestCfs', cfs: number): void
  (e: 'liveFlowBand', band: { flowBandLabel: string | null; flowStatus: string }): void
  (e: 'diurnal', data: DiurnalPattern): void
}>()

// ---- State ------------------------------------------------------------------

const container  = ref<HTMLElement | null>(null)
const tooltipEl  = ref<HTMLElement | null>(null)
const loading    = ref(true)
const readings   = ref<Reading[]>([])
const flowBands = ref<FlowBands | null>(null)
let chart: uPlot | null = null

const { apiBase } = useRuntimeConfig().public

// ---- Data fetching ----------------------------------------------------------

const hours = ref<12 | 24 | 168 | 720>(props.controlledHours ?? 24)
watch(() => props.controlledHours, h => { if (h && h !== hours.value) { hours.value = h } })

async function load() {
  loading.value = true
  try {
    const since = new Date(Date.now() - hours.value * 3_600_000).toISOString()
    if (props.noRanges) {
      const rdRes = await fetch(`${apiBase}/api/v1/gauges/${props.gaugeId}/readings?since=${since}&limit=500`)
      if (rdRes.ok) readings.value = await rdRes.json()
      flowBands.value = null
    } else {
      const flowRangesUrl = props.reachSlug
        ? `${apiBase}/api/v1/reaches/${props.reachSlug}/flow-ranges`
        : `${apiBase}/api/v1/gauges/${props.gaugeId}/flow-ranges`
      const [rdRes, frRes] = await Promise.all([
        fetch(`${apiBase}/api/v1/gauges/${props.gaugeId}/readings?since=${since}&limit=500`),
        fetch(flowRangesUrl),
      ])
      if (rdRes.ok) readings.value = await rdRes.json()
      if (frRes.ok) flowBands.value = await frRes.json()
    }
  } finally {
    loading.value = false
    // Emit the freshest reading so consumers (e.g. modal) can sync their displayed CFS
    if (readings.value.length > 0) {
      const latestCfs = readings.value[0].cfs
      emit('latestCfs', latestCfs)
      if (flowBands.value) {
        const band = bandForCfs(latestCfs, flowBands.value)
        emit('liveFlowBand', { flowBandLabel: band.label, flowStatus: flowStatusForColorKey(band.color) })
      } else {
        emit('liveFlowBand', { flowBandLabel: null, flowStatus: 'unknown' })
      }
    }
    emit('diurnal', useDiurnalPattern(readings.value))
    await nextTick()
    buildChart()
  }
}

// ---- Chart ------------------------------------------------------------------

function buildChart() {
  if (!container.value || readings.value.length === 0) return
  chart?.destroy()
  chart = null

  // API returns newest-first; uPlot needs ascending timestamps.
  const sorted = [...readings.value].reverse()
  const xs = new Float64Array(sorted.map(r => new Date(r.timestamp).getTime() / 1000))
  const ys = new Float64Array(sorted.map(r => r.cfs))

  const bands = flowBands.value
  // Use freshest reading from the fetched data — not the potentially stale prop.
  const currentCfs = readings.value.length > 0 ? readings.value[0].cfs : (props.currentCfs ?? null)

  const opts: uPlot.Options = {
    width:  container.value!.clientWidth,
    height: props.height ?? 200,
    padding: [8, 0, 0, 0],
    cursor: { show: true },
    legend: { show: false },   // we render our own legend below
    axes: [
      {
        stroke:  '#9ca3af',
        ticks:   { stroke: '#374151' },
        grid:    { stroke: '#1f2937', width: 1 },
      },
      {
        stroke:  '#9ca3af',
        ticks:   { stroke: '#374151' },
        grid:    { stroke: '#1f2937', width: 1 },
      },
    ],
    series: [
      {},
      {
        stroke: lineColor(bands, currentCfs),
        width:  2,
        fill:   lineColor(bands, currentCfs) + '18',
        spanGaps: false,
      },
    ],
    hooks: {
      // Draw flow range bands behind the series line.
      drawClear: [u => drawBands(u, bands)],
      // Draw a horizontal marker for the current reading.
      draw: [u => drawCurrentMarker(u, currentCfs)],
      // Hover tooltip
      setCursor: [u => {
        const el = tooltipEl.value
        if (!el) return
        const idx = u.cursor.idx
        if (idx == null) { el.style.display = 'none'; return }
        const val = u.data[1][idx]
        if (val == null) { el.style.display = 'none'; return }
        const x = u.valToPos(u.data[0][idx], 'x')
        const y = u.valToPos(val, 'y')
        const ts = new Date(u.data[0][idx] * 1000)
        const timeStr = ts.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
        const dateStr = ts.toLocaleDateString([], { month: 'short', day: 'numeric' })
        el.textContent = `${Math.round(val).toLocaleString()} cfs · ${dateStr} ${timeStr}`
        el.style.display = 'block'
        el.style.left = `${x}px`
        el.style.top = `${y}px`
      }],
    },
  }

  chart = new uPlot(opts, [xs, ys], container.value!)

  // Re-measure once the browser has finished painting — catches mobile modals
  // where clientWidth is stale at the time buildChart first runs.
  requestAnimationFrame(() => {
    if (chart && container.value) {
      chart.setSize({ width: container.value.clientWidth, height: props.height ?? 200 })
    }
  })
}

// ---- Canvas drawing helpers -------------------------------------------------

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

function drawBands(u: uPlot, bands: FlowBands | null) {
  if (!bands) return
  const { ctx, bbox } = u
  const dpr = devicePixelRatio

  // Build N+1 fill regions: base (below first threshold) + one per threshold.
  const sorted = [...bands.thresholds].sort((a, b) => a.value - b.value)
  type Region = { colorKey: string; yMin: number | null; yMax: number | null }
  const regions: Region[] = [
    { colorKey: bands.base_color, yMin: null, yMax: sorted[0]?.value ?? null },
    ...sorted.map((t, i) => ({
      colorKey: t.color,
      yMin: t.value,
      yMax: sorted[i + 1]?.value ?? null,
    })),
  ]

  ctx.save()
  ctx.beginPath()
  ctx.rect(bbox.left, bbox.top, bbox.width, bbox.height)
  ctx.clip()

  for (const region of regions) {
    const hex = colorKeyToHex(region.colorKey)
    // top of chart = highest CFS = smallest Y in canvas coords
    const yTop = region.yMax != null
      ? u.valToPos(region.yMax, 'y', true) * dpr
      : bbox.top
    const yBot = region.yMin != null
      ? u.valToPos(region.yMin, 'y', true) * dpr
      : bbox.top + bbox.height
    const h = Math.abs(yBot - yTop)
    if (h <= 0) continue
    ctx.fillStyle = hexToRgba(hex, 0.22)
    ctx.fillRect(bbox.left, Math.min(yTop, yBot), bbox.width, h)
  }

  ctx.restore()
}

function drawCurrentMarker(u: uPlot, cfs: number | null) {
  if (cfs == null) return
  const { ctx, bbox } = u
  const dpr = devicePixelRatio

  const y = u.valToPos(cfs, 'y', true) * dpr
  if (y < bbox.top || y > bbox.top + bbox.height) return

  ctx.save()
  ctx.beginPath()
  ctx.setLineDash([4 * dpr, 3 * dpr])
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'
  ctx.lineWidth = 1 * dpr
  ctx.moveTo(bbox.left, y)
  ctx.lineTo(bbox.left + bbox.width, y)
  ctx.stroke()
  ctx.restore()
}

// Determine the line color from current CFS and flow bands.
// When props.color is set (e.g. gauge-only mode), always use that override.
function lineColor(bands: FlowBands | null, cfs: number | null): string {
  if (props.color) return props.color
  if (cfs == null || !bands) return '#6b7280'
  return colorKeyToHex(bandForCfs(cfs, bands).color)
}

// ---- Diurnal cycle ----------------------------------------------------------

const diurnal = computed(() => useDiurnalPattern(readings.value))

const diurnalPhaseLabel = computed(() => {
  switch (diurnal.value.phase) {
    case 'rising':     return 'Rising'
    case 'falling':    return 'Falling'
    case 'near_peak':  return 'Near peak'
    case 'near_trough': return 'Near trough'
    default:           return 'Stable'
  }
})

function formatHour(h: number): string {
  const ampm = h >= 12 ? 'pm' : 'am'
  const display = h % 12 === 0 ? 12 : h % 12
  return `${display}${ampm}`
}

// ---- Flow range legend helpers ----------------------------------------------

// sortedBandRegions returns base + thresholds ASC for legend display.
const bandRegions = computed(() => {
  if (!flowBands.value) return []
  const sorted = [...flowBands.value.thresholds].sort((a, b) => a.value - b.value)
  type Region = { label: string; color: string; from: number | null; to: number | null }
  const out: Region[] = [{
    label: flowBands.value.base_label,
    color: flowBands.value.base_color,
    from:  null,
    to:    sorted[0]?.value ?? null,
  }]
  for (let i = 0; i < sorted.length; i++) {
    out.push({ label: sorted[i].label, color: sorted[i].color, from: sorted[i].value, to: sorted[i + 1]?.value ?? null })
  }
  return out
})

// ---- Lifecycle --------------------------------------------------------------

// Declared after load + buildChart so references are unambiguous at setup time.
watch(hours, load)
watch(() => props.gaugeId, load)
watch(() => props.reachSlug, load)
watch(() => props.currentCfs, async () => { await nextTick(); buildChart() })

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  load()
  resizeObserver = new ResizeObserver(() => {
    if (chart && container.value) {
      chart.setSize({ width: container.value.clientWidth, height: props.height ?? 200 })
    }
  })
  if (container.value) resizeObserver.observe(container.value)
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  chart?.destroy()
})
</script>
