<template>
  <!-- Chart container — always mounted so the ref is never torn down mid-update.
       Overlay states sit on top without removing the canvas from the DOM.
       Sheet variant takes its height from the container (parent flex-grows it);
       strip keeps an explicit pixel height. -->
  <div
    class="relative w-full overflow-hidden"
    :class="chartVariant === 'sheet' ? 'h-full' : ''"
    :style="chartBoxStyle"
  >
    <div ref="container" class="w-full h-full" />

    <!-- Sheet overlays. DOM rather than canvas text so they inherit the app
         font stack and theme tokens, positioned from the live y-scale and
         re-synced by the uPlot draw hook on every redraw / resize. -->
    <template v-if="chartVariant === 'sheet'">
      <div
        v-for="t in yTicks"
        :key="`y-${t.value}`"
        class="absolute left-3.5 -translate-y-1/2 text-[10px] font-medium tabular-nums pointer-events-none"
        :style="{ top: `${t.top}px`, color: 'var(--chart-axis)' }"
      >{{ t.label }}</div>

      <div
        v-for="l in lineOverlays"
        :key="`ref-${l.label}-${l.value}`"
        class="absolute -translate-y-full px-1 text-[10px] font-bold uppercase tracking-[0.09em] pointer-events-none"
        :class="l.align === 'left' ? 'left-4 text-left' : 'right-4 text-right'"
        :style="{ top: `${l.top}px`, color: l.color }"
      >{{ l.label }} · <span class="tabular-nums">{{ l.valueText }}</span></div>

      <div
        v-if="baseOverlay"
        class="absolute -translate-y-full px-1 text-[10px] font-bold uppercase tracking-[0.09em] pointer-events-none"
        :class="baseOverlay.align === 'left' ? 'left-4 text-left' : 'right-4 text-right'"
        :style="{ top: `${baseOverlay.top}px`, color: baseOverlay.color }"
      >{{ baseOverlay.label }}</div>
    </template>

    <!-- Hover tooltip — present in both variants. Sits above the sheet shell's
         header scrim (z-20) and x-axis strip (z-10), which would otherwise
         swallow it over the peaks; still below the drawer (z-30). -->
    <div
      ref="tooltipEl"
      class="absolute pointer-events-none text-xs bg-neutral-900/90 text-white rounded px-1.5 py-0.5 whitespace-nowrap translate-x-2 -translate-y-full"
      style="display:none; z-index:25"
    />
    <div
      v-if="loading"
      class="absolute inset-0 flex items-center justify-center text-neutral-400 text-sm bg-white/70 dark:bg-neutral-900/70"
    >Loading…</div>
    <div
      v-else-if="windowedReadings.length === 0"
      class="absolute inset-0 flex items-center justify-center text-neutral-400 text-sm"
    >No readings in this window</div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted, nextTick, type CSSProperties } from 'vue'
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'
import { useDiurnalPattern, type DiurnalPattern } from '~/composables/useDiurnalPattern'
import type { FlowBands } from '~/utils/flowBand'

// ---- Types ------------------------------------------------------------------

interface Reading {
  cfs:       number
  timestamp: string
}

/** sheet = full-bleed modal chart: axes + captions as overlays, one gradient.
 *  strip = bare mini area chart (custom-gauge input rows).
 *
 *  A third `panel` variant (inline chart with its own range toggle, band fills,
 *  legend and banners) was retired in #428 once both modals moved to the sheet.
 *  A future inline consumer should be built on the sheet primitives, not on a
 *  revived panel. */
type ChartVariant = 'sheet' | 'strip'

interface ReferenceLine {
  value: number
  label: string
  color: string        // the dotted line
  labelColor?: string  // its caption; defaults to `color` when the pair is one hex
}

interface BandRegion {
  label: string
  color: string
  from:  number | null
  to:    number | null
}

type CaptionAlign = 'left' | 'right'

/** A reference-line caption placed in CSS px relative to the chart container. */
interface CaptionLayout {
  value:     number
  label:     string
  valueText: string
  color:     string
  top:       number
  align:     CaptionAlign
}

// ---- Props ------------------------------------------------------------------

const props = defineProps<{
  gaugeId: string
  reachSlug?: string | null
  flowRangesUrl?: string | null  // override the reach-mode flow-ranges endpoint (e.g. user runs)
  currentCfs?: number | null
  noRanges?: boolean
  color?: string          // override line color
  height?: number         // chart height in px (strip default 96; the sheet sizes from its container)
  controlledHours?: 12 | 24 | 168 | 720  // parent-controlled time window
  variant: ChartVariant   // presentation mode — required; there is no default rendering
  // Sheet variant: when non-null these replace the band-derived threshold lines
  // (e.g. seasonal p25/p50/p75 for a standalone gauge with no flow ranges).
  referenceLines?: ReferenceLine[] | null
  // When non-null the component does NOT fetch readings and renders this series
  // instead. Same shape as /gauges/{id}/readings; either sort order is accepted.
  readings?: Reading[] | null
  baseBandLabel?: string | null  // sheet variant: caption for the base band (it has no line)
  // Sheet variant: px of bottom chrome this chart has to stay clear of. Only
  // the shell knows whether its x-axis strip actually abuts this plot — in the
  // custom-gauge sheet the input strips sit between them, so that caller passes 0.
  footInset?: number
}>()

const emit = defineEmits<{
  (e: 'latestCfs', cfs: number): void
  (e: 'liveFlowBand', band: { flowBandLabel: string | null; flowStatus: string }): void
  (e: 'diurnal', data: DiurnalPattern): void
  (e: 'bandRegions', regions: BandRegion[]): void
}>()

// ---- State ------------------------------------------------------------------

const container  = ref<HTMLElement | null>(null)
const tooltipEl  = ref<HTMLElement | null>(null)
const loading    = ref(true)
const fetched    = ref<Reading[]>([])
const flowBands  = ref<FlowBands | null>(null)
let chart: uPlot | null = null

// Sheet overlay geometry, recomputed from the live scales on every draw.
const yTicks      = ref<{ value: number; label: string; top: number }[]>([])
const lineOverlays = ref<CaptionLayout[]>([])
const baseOverlay  = ref<{ label: string; color: string; top: number; align: CaptionAlign } | null>(null)

function clearSheetOverlays() {
  yTicks.value       = []
  lineOverlays.value = []
  baseOverlay.value  = null
}

const { apiBase } = useRuntimeConfig().public
const { getToken } = useAuth()
// Band line/caption hexes are a per-color-mode pair: one stored hex can't be
// readable on both a white and a near-black sheet.
const { bandLineHex, bandLabelHex } = useFlowBandPalette()

// ---- Variant plumbing -------------------------------------------------------

const chartVariant = computed<ChartVariant>(() => props.variant)

const chartBoxStyle = computed<CSSProperties>(() => {
  if (chartVariant.value === 'sheet') return {}
  return { height: `${fallbackHeight()}px` }
})

// 200 is the sheet's last resort only — what it draws at before the container it
// sizes from has been laid out (or in the mobile modal, where clientHeight is
// still 0 on the first pass).
function fallbackHeight(): number {
  return props.height ?? (chartVariant.value === 'strip' ? 96 : 200)
}

// Sheet height comes from the container the parent flex-grows; the strip keeps
// its declared pixel height.
function measuredHeight(): number {
  if (chartVariant.value !== 'sheet') return fallbackHeight()
  const h = container.value?.clientHeight ?? 0
  return h > 0 ? h : fallbackHeight()
}

// The shell paints a header scrim across the top of the plot and an x-axis label
// strip along the bottom. Gridlines, y values and threshold captions stay clear
// of both. Clamped so a short sheet (mobile landscape) still shows them.
const SHEET_HEADER_PX = 150
const SHEET_FOOT_PX   = 46

function sheetInsets(heightCss: number): { top: number; bottom: number } {
  const foot = props.footInset ?? SHEET_FOOT_PX
  return {
    top:    Math.min(SHEET_HEADER_PX, heightCss * 0.3),
    bottom: Math.min(foot,            heightCss * 0.12),
  }
}

// ---- Data fetching ----------------------------------------------------------

const hours = ref<12 | 24 | 168 | 720>(props.controlledHours ?? 24)
watch(() => props.controlledHours, h => { if (h && h !== hours.value) { hours.value = h } })

// Injected series wins over anything fetched here.
const activeReadings = computed<Reading[]>(() => props.readings ?? fetched.value)

// Readings arrive newest-first from the api; uPlot needs ascending timestamps.
// Detect rather than assume, so an injected series in either order renders.
function ascending(list: Reading[]): Reading[] {
  const copy = [...list]
  if (copy.length < 2) return copy
  const first = new Date(copy[0]!.timestamp).getTime()
  const last  = new Date(copy[copy.length - 1]!.timestamp).getTime()
  return last >= first ? copy : copy.reverse()
}

// The slice actually plotted: we fetch at least 48h for diurnal detection, but
// only draw hours.value. Computed rather than a side effect of buildChart so the
// "No readings in this window" state can read it without flashing in the tick
// between load() resolving and the chart being rebuilt.
const windowedReadings = computed<Reading[]>(() => {
  const cutoffMs = Date.now() - hours.value * 3_600_000
  return ascending(activeReadings.value).filter(r => new Date(r.timestamp).getTime() >= cutoffMs)
})

async function flowRangesRequest(): Promise<{ url: string; headers: Record<string, string> }> {
  const url = props.flowRangesUrl
    ? props.flowRangesUrl
    : props.reachSlug
      ? `${apiBase}/api/v1/reaches/${props.reachSlug}/flow-ranges`
      : `${apiBase}/api/v1/gauges/${props.gaugeId}/flow-ranges`
  // /me/ flow-ranges (own runs, any visibility) need the bearer token.
  const headers: Record<string, string> = {}
  if (url.includes('/api/v1/me/')) {
    const token = await getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }
  return { url, headers }
}

async function load() {
  loading.value = true
  try {
    // Parent-supplied series: no readings request at all. Flow ranges still
    // load when the caller wants band coloring.
    if (props.readings) {
      if (props.noRanges) {
        flowBands.value = null
      } else {
        const { url, headers } = await flowRangesRequest()
        const frRes = await fetch(url, { headers })
        if (frRes.ok) flowBands.value = await frRes.json()
      }
      return
    }

    // Fetch at least 48h so useDiurnalPattern has yesterday+today windows.
    // buildChart filters to hours.value for the displayed range.
    const fetchHours = Math.max(hours.value, 48)
    const since = new Date(Date.now() - fetchHours * 3_600_000).toISOString()
    // Scale the row cap to the window (#345). The api serves readings
    // `ORDER BY timestamp DESC LIMIT $n`, so a flat limit truncates from the
    // NEWEST end and silently overrides `since`: at a 15-minute cadence,
    // limit=500 is only ~5 days of data no matter how far back `since` asks,
    // which is why 1m rendered as about a week. Tiers mirror
    // GaugeSparkline.vue's existing fix (>= rather than === so the
    // Math.max(_, 48) floor and any future range values still land in the
    // right tier); 3000 covers the busiest observed gauge (~2990 readings /
    // 33 days) with margin and stays under the api's own 5000 cap.
    const limit = fetchHours >= 720 ? 3000 : fetchHours >= 168 ? 1500 : 500
    if (props.noRanges) {
      const rdRes = await fetch(`${apiBase}/api/v1/gauges/${props.gaugeId}/readings?since=${since}&limit=${limit}`)
      if (rdRes.ok) fetched.value = await rdRes.json()
      flowBands.value = null
    } else {
      const { url, headers: frHeaders } = await flowRangesRequest()
      const [rdRes, frRes] = await Promise.all([
        fetch(`${apiBase}/api/v1/gauges/${props.gaugeId}/readings?since=${since}&limit=${limit}`),
        fetch(url, { headers: frHeaders }),
      ])
      if (rdRes.ok) fetched.value = await rdRes.json()
      if (frRes.ok) flowBands.value = await frRes.json()
    }
  } finally {
    loading.value = false
    emitDerived()
    await nextTick()
    buildChart()
  }
}

// Emit the freshest reading so consumers (e.g. modal) can sync their displayed CFS
function emitDerived() {
  const asc = ascending(activeReadings.value)
  const latest = asc[asc.length - 1]
  if (latest) {
    const latestCfs = latest.cfs
    emit('latestCfs', latestCfs)
    if (flowBands.value) {
      const band = bandForCfs(latestCfs, flowBands.value)
      emit('liveFlowBand', { flowBandLabel: band?.label ?? null, flowStatus: flowStatusForColorKey(band?.color) })
    } else {
      emit('liveFlowBand', { flowBandLabel: null, flowStatus: 'unknown' })
    }
  }
  emit('diurnal', useDiurnalPattern(activeReadings.value))
}

// ---- Chart ------------------------------------------------------------------

function buildChart() {
  if (!container.value) return
  // Tear down before the empty guards, not after: a stale canvas plus the
  // overlays from the previous draw is how a gauge with nothing in the selected
  // window used to render as orphaned y values and captions floating over blank.
  chart?.destroy()
  chart = null
  clearSheetOverlays()

  const asc = ascending(activeReadings.value)
  const sorted = windowedReadings.value
  if (sorted.length === 0) return
  const xs = new Float64Array(sorted.map(r => new Date(r.timestamp).getTime() / 1000))
  const ys = new Float64Array(sorted.map(r => r.cfs))

  const bands = flowBands.value
  // Use freshest reading from the data we hold — not the potentially stale prop.
  const latest = asc[asc.length - 1]
  const currentCfs = latest ? latest.cfs : (props.currentCfs ?? null)

  const isSheet = chartVariant.value === 'sheet'
  const stroke  = lineColor(bands, currentCfs)

  const series: uPlot.Series = isSheet
    ? {
        stroke,
        width:  2.5,
        cap:    'round',   // uPlot's lineJoin already defaults to round
        fill:   u => verticalGradient(u, stroke, sheetFillStops()),
        points: { show: false },
        spanGaps: false,
      }
    : {
        stroke,
        width:  1.75,
        cap:    'round',
        fill:   u => verticalGradient(u, stroke, [[0, 0.03], [1, 0.34]]),
        points: { show: false },
        spanGaps: false,
      }

  const opts: uPlot.Options = {
    width:  container.value!.clientWidth,
    height: measuredHeight(),
    padding: [0, 0, 0, 0],
    cursor: { show: true },
    legend: { show: false },
    // No gutters in either variant: the sheet paints its own axis labels over
    // the plot, and the strip shows none at all.
    axes: [],
    series: [{}, series],
    hooks: {
      // Behind the series line.
      drawClear: [u => {
        if (isSheet) {
          drawSheetGrid(u)
          drawReferenceLines(u)
        }
      }],
      // On top of the series line.
      draw: [u => {
        if (isSheet) {
          drawEndDot(u, stroke)
          syncSheetOverlays(u, bands)
        }
      }],
      // Hover tooltip
      setCursor: [u => {
        const el = tooltipEl.value
        if (!el) return
        const idx = u.cursor.idx
        if (idx == null) { el.style.display = 'none'; return }
        // uPlot types data[1] and every element as possibly absent: series gaps
        // are real nulls, and idx is only guaranteed in range while the chart
        // holds the data we built it with. Hide rather than render NaN.
        const val = u.data[1]?.[idx]
        const tsSec = u.data[0][idx]
        if (val == null || tsSec == null) { el.style.display = 'none'; return }
        const x = u.valToPos(tsSec, 'x')
        const y = u.valToPos(val, 'y')
        const ts = new Date(tsSec * 1000)
        const timeStr = ts.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
        const dateStr = ts.toLocaleDateString([], { month: 'short', day: 'numeric' })
        el.textContent = `${Math.round(val).toLocaleString()} cfs · ${dateStr} ${timeStr}`
        el.style.display = 'block'
        el.style.left = `${x}px`
        el.style.top = `${y}px`
      }],
    },
  }

  // Pin the time base for the sheet and its input strips. uPlot otherwise
  // auto-ranges x to each series' own extent, which (a) makes the shell's
  // hours-derived x labels lie whenever the data doesn't fill the window and
  // (b) stretches each custom-gauge input strip independently of the calculated
  // series above it, so a `+`/`−` input can visually lead or lag its own result.
  // origin/main pinned this per chart before both went through GaugeGraph.
  const nowSec = Date.now() / 1000
  opts.scales = { x: { time: true, range: [nowSec - hours.value * 3600, nowSec] } }

  chart = new uPlot(opts, [xs, ys], container.value!)

  // Re-measure once the browser has finished painting — catches mobile modals
  // where clientWidth (and, for the sheet, clientHeight) is stale at the time
  // buildChart first runs.
  requestAnimationFrame(() => {
    if (chart && container.value) {
      chart.setSize({ width: container.value.clientWidth, height: measuredHeight() })
    }
  })
}

// ---- Canvas drawing helpers -------------------------------------------------

// Canvas can't read Tailwind classes, so the sheet's chrome colors live as CSS
// custom properties in main.css and get resolved off the chart container at
// draw time — that keeps them following the app color mode.
function cssVar(name: string, fallback: string): string {
  const el = container.value
  if (!el || typeof window === 'undefined') return fallback
  const v = getComputedStyle(el).getPropertyValue(name).trim()
  return v || fallback
}

function cssVarNum(name: string, fallback: number): number {
  const n = Number.parseFloat(cssVar(name, ''))
  return Number.isFinite(n) ? n : fallback
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// Band colors are hex; anything else (a caller-supplied rgb()/oklch()) is passed
// through opaque rather than mangled.
function withAlpha(color: string, alpha: number): string {
  const hex = color.trim()
  if (/^#[0-9a-f]{6}$/i.test(hex)) return hexToRgba(hex, alpha)
  if (/^#[0-9a-f]{3}$/i.test(hex)) {
    return hexToRgba(`#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`, alpha)
  }
  return hex
}

function sheetFillStops(): [number, number][] {
  return [
    [0,    cssVarNum('--chart-fill-top',    0.02)],
    [0.46, cssVarNum('--chart-fill-mid',    0.16)],
    [1,    cssVarNum('--chart-fill-bottom', 0.55)],
  ]
}

// One vertical gradient spanning the plot area, in the live band color.
function verticalGradient(u: uPlot, color: string, stops: [number, number][]): CanvasGradient | string {
  const { ctx, bbox } = u
  const grad = ctx.createLinearGradient(0, bbox.top, 0, bbox.top + bbox.height)
  for (const [offset, alpha] of stops) grad.addColorStop(offset, withAlpha(color, alpha))
  return grad
}

// Three vertical gridlines at quarter widths, stopping short of the header
// scrim and the x-axis strip.
function drawSheetGrid(u: uPlot) {
  const { ctx, bbox } = u
  const dpr = devicePixelRatio
  const { top, bottom } = sheetInsets(bbox.height / dpr)
  const y0 = bbox.top + top * dpr
  const y1 = bbox.top + bbox.height - bottom * dpr
  if (y1 <= y0) return

  ctx.save()
  ctx.setLineDash([])
  ctx.strokeStyle = cssVar('--chart-grid', 'rgba(148,163,184,0.08)')
  ctx.lineWidth = 1 * dpr
  for (const f of [0.25, 0.5, 0.75]) {
    const x = Math.round(bbox.left + bbox.width * f) + 0.5
    ctx.beginPath()
    ctx.moveTo(x, y0)
    ctx.lineTo(x, y1)
    ctx.stroke()
  }
  ctx.restore()
}

// Dotted edge-to-edge threshold (or seasonal percentile) lines.
// Only lines that still carry a caption are stroked: an unlabelled dotted line
// is unidentifiable, and in gauge mode nothing else on screen names it.
function drawReferenceLines(u: uPlot) {
  const lines = referenceLines.value
  if (lines.length === 0) return
  const captioned = new Set(captionLayout(u).map(c => c.value))
  if (captioned.size === 0) return
  const { ctx, bbox } = u
  const dpr = devicePixelRatio

  ctx.save()
  ctx.beginPath()
  ctx.rect(bbox.left, bbox.top, bbox.width, bbox.height)
  ctx.clip()
  ctx.setLineDash([2 * dpr, 6 * dpr])
  ctx.lineWidth = 1.25 * dpr
  ctx.globalAlpha = 0.8
  for (const line of lines) {
    if (!captioned.has(line.value)) continue
    const y = u.valToPos(line.value, 'y', true)
    if (!Number.isFinite(y) || y < bbox.top || y > bbox.top + bbox.height) continue
    ctx.strokeStyle = line.color || cssVar('--seasonal-line', '#6366f1')
    ctx.beginPath()
    ctx.moveTo(bbox.left, y)
    ctx.lineTo(bbox.left + bbox.width, y)
    ctx.stroke()
  }
  ctx.restore()
}

// Solid dot + halo on the freshest reading — marks "now" on the sheet.
function drawEndDot(u: uPlot, color: string) {
  const xVals = u.data[0]
  const yVals = u.data[1]
  if (!xVals || !yVals || yVals.length === 0) return

  let i = yVals.length - 1
  while (i >= 0 && yVals[i] == null) i--
  const xv = i >= 0 ? xVals[i] : null
  const yv = i >= 0 ? yVals[i] : null
  if (xv == null || yv == null) return

  const { ctx, bbox } = u
  const dpr = devicePixelRatio
  const y = u.valToPos(yv, 'y', true)
  let x = u.valToPos(xv, 'x', true)
  if (!Number.isFinite(x) || !Number.isFinite(y)) return
  // Keep the dot body inside the canvas at the right edge.
  x = Math.min(x, bbox.left + bbox.width - 4 * dpr)

  ctx.save()
  ctx.fillStyle = color
  ctx.globalAlpha = 0.22
  ctx.beginPath()
  ctx.arc(x, y, 10 * dpr, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.beginPath()
  ctx.arc(x, y, 4 * dpr, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

// Determine the line color from current CFS and flow bands.
// When props.color is set (e.g. gauge-only mode), always use that override.
function lineColor(bands: FlowBands | null, cfs: number | null): string {
  if (props.color) return props.color
  if (cfs == null || !bands) return cssVar('--chart-neutral-line', '#6b7280')
  return colorKeyToHex(bandForCfs(cfs, bands)?.color ?? '')
}

// ---- Sheet overlays ---------------------------------------------------------

// Round-ish tick values across the live y-scale (1 / 2 / 2.5 / 5 / 10 × 10ⁿ).
function niceTicks(min: number, max: number, count: number): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min || count < 1) return []
  const raw  = (max - min) / count
  const mag  = Math.pow(10, Math.floor(Math.log10(raw)))
  const norm = raw / mag
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag
  const out: number[] = []
  for (let v = Math.ceil(min / step) * step; v <= max; v += step) out.push(Number(v.toFixed(6)))
  return out
}

function pickEvenly<T>(list: T[], max: number): T[] {
  if (list.length <= max || max < 1) return list
  const out: T[] = []
  const stride = (list.length - 1) / (max - 1)
  for (let i = 0; i < max; i++) {
    const item = list[Math.round(i * stride)]
    if (item !== undefined) out.push(item)
  }
  return out
}

function formatValue(v: number): string {
  const abs = Math.abs(v)
  if (abs >= 10) return Math.round(v).toLocaleString()
  return Number(v.toFixed(abs >= 1 ? 1 : 2)).toLocaleString()
}

// A right-aligned caption collides with the end-of-series dot when its line sits
// close to the latest reading — flip that one to the left edge.
function alignFor(u: uPlot, heightCss: number): (top: number) => CaptionAlign {
  const yVals = u.data[1]
  let latestTop: number | null = null
  if (yVals && yVals.length > 0) {
    const v = yVals[yVals.length - 1]
    if (v != null) {
      const p = u.valToPos(v, 'y')
      if (Number.isFinite(p)) latestTop = p
    }
  }
  return (top: number): CaptionAlign =>
    latestTop != null && Math.abs(top - latestTop) < heightCss * 0.15 ? 'left' : 'right'
}

// One 10px caption line plus breathing room.
const CAPTION_ROW_PX = 13

// Place the reference-line captions between the header scrim and the bottom
// chrome. Captions are CLAMPED into that band and stacked downward rather than
// dropped — dropping one left its dotted line on the plot with nothing naming
// it. Pure, so the drawClear hook can ask which lines still have a caption
// before it strokes them and the draw hook can place the DOM overlays.
function captionLayout(u: uPlot): CaptionLayout[] {
  const lines = referenceLines.value
  if (lines.length === 0) return []

  const dpr = devicePixelRatio
  const heightCss = u.bbox.height / dpr
  const { top: insetTop, bottom: insetBottom } = sheetInsets(heightCss)
  const ceilPx  = insetTop + CAPTION_ROW_PX + 1
  // The base-band caption owns the last row when there is one.
  const floorPx = heightCss - insetBottom - (props.baseBandLabel ? CAPTION_ROW_PX : 0)
  if (floorPx < ceilPx) return []

  const align = alignFor(u, heightCss)
  const fallback = cssVar('--seasonal-line', '#6366f1')

  const rows = lines
    .map(l => ({ line: l, raw: u.valToPos(l.value, 'y') }))
    .filter(r => Number.isFinite(r.raw) && r.raw >= 0 && r.raw <= heightCss)
    .sort((a, b) => a.raw - b.raw)   // highest value first = smallest top

  const out: CaptionLayout[] = []
  let cursor = ceilPx
  for (const { line, raw } of rows) {
    const top = Math.max(cursor, raw)
    if (top > floorPx) break         // tops are monotonic, so nothing after fits
    out.push({
      value:     line.value,
      label:     line.label,
      valueText: formatValue(line.value),
      color:     line.labelColor || line.color || fallback,
      top,
      align:     align(top),
    })
    cursor = top + CAPTION_ROW_PX
  }
  return out
}

// Position the DOM overlays from the live y-scale. Runs inside the draw hook so
// it re-syncs on redraw, rescale and resize. All values are CSS px relative to
// the chart container — the sheet has zero padding and no axes, so the plot
// origin and the container origin coincide.
function syncSheetOverlays(u: uPlot, bands: FlowBands | null) {
  const dpr = devicePixelRatio
  const heightCss = u.bbox.height / dpr
  const { top: insetTop, bottom: insetBottom } = sheetInsets(heightCss)
  const floorPx = heightCss - insetBottom
  const align = alignFor(u, heightCss)

  const yMin = u.scales.y?.min
  const yMax = u.scales.y?.max
  if (yMin != null && yMax != null) {
    // Ask for more divisions than we render: the header/axis insets cut ~20% of
    // the plot, so a straight 4 would often leave only 2 or 3 inside the window.
    const candidates = niceTicks(yMin, yMax, 6)
      .map(v => ({ value: v, label: formatValue(v), top: u.valToPos(v, 'y') }))
      .filter(t => Number.isFinite(t.top) && t.top >= insetTop && t.top <= floorPx)
    yTicks.value = pickEvenly(candidates, 4)
  } else {
    yTicks.value = []
  }

  lineOverlays.value = captionLayout(u)

  baseOverlay.value = props.baseBandLabel
    ? {
        label: props.baseBandLabel,
        color: bands ? bandLabelHex(bands.base_color) : cssVar('--chart-axis', '#9ca3af'),
        top:   floorPx,
        align: align(floorPx),
      }
    : null
}

// ---- Flow range helpers -----------------------------------------------------

// bandRegions returns base + thresholds ASC — the payload of the `bandRegions`
// emit, so a sheet parent can list the full cfs ranges the threshold captions
// don't show.
const bandRegions = computed<BandRegion[]>(() => {
  if (!flowBands.value) return []
  const sorted = [...flowBands.value.thresholds].sort((a, b) => a.value - b.value)
  const out: BandRegion[] = [{
    label: flowBands.value.base_label,
    color: flowBands.value.base_color,
    from:  null,
    to:    sorted[0]?.value ?? null,
  }]
  for (const [i, t] of sorted.entries()) {
    out.push({ label: t.label, color: t.color, from: t.value, to: sorted[i + 1]?.value ?? null })
  }
  return out
})

watch(bandRegions, regions => emit('bandRegions', regions), { immediate: true })

// Explicit reference lines win; otherwise the sheet derives one per threshold.
// The base band gets no line — that's what baseBandLabel is for.
const referenceLines = computed<ReferenceLine[]>(() => {
  if (props.referenceLines) return props.referenceLines
  if (chartVariant.value !== 'sheet' || !flowBands.value) return []
  return [...flowBands.value.thresholds]
    .sort((a, b) => a.value - b.value)
    .map(t => ({
      value:      t.value,
      label:      t.label,
      color:      bandLineHex(t.color),
      labelColor: bandLabelHex(t.color),
    }))
})

// ---- Lifecycle --------------------------------------------------------------

// Declared after load + buildChart so references are unambiguous at setup time.
watch(hours, load)
watch(() => props.gaugeId, load)
watch(() => props.reachSlug, load)
watch(() => props.flowRangesUrl, load)
watch(() => props.currentCfs, async () => { await nextTick(); buildChart() })
watch(() => props.variant, async () => { await nextTick(); buildChart() })

// Injected series: redraw in place, no refetch. Dropping back to null hands the
// fetching back to this component.
watch(() => props.readings, async (val, prev) => {
  if (val == null && prev != null) { await load(); return }
  loading.value = false
  emitDerived()
  await nextTick()
  buildChart()
})

// These only feed the draw hooks / overlays, so a redraw is enough. Watching the
// computed rather than the prop also catches a color-mode flip, which re-derives
// the band line/caption hexes while the sheet is open.
watch(referenceLines, () => chart?.redraw())
watch(() => props.baseBandLabel, () => chart?.redraw())

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  load()
  // Tracks height as well as width: the sheet variant sizes from its container.
  resizeObserver = new ResizeObserver(() => {
    if (chart && container.value) {
      chart.setSize({ width: container.value.clientWidth, height: measuredHeight() })
    }
  })
  if (container.value) resizeObserver.observe(container.value)
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  chart?.destroy()
})
</script>
