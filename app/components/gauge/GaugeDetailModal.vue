<!--
  GaugeDetailModal — the gauge sheet for instances A and B of #361.

    A. mode="reach" — a run's gauge. Readings + the run's flow ranges, so the
       threshold lines, the gradient hue and the band chip all come from the
       bands GaugeGraph fetches. Header carries the run title, its author, and
       the View / Edit affordances.
    B. mode="gauge" — a standalone gauge (or a gauge-group head). No flow ranges
       exist at all, so there are no thresholds and no chip; the dotted lines
       become this month's seasonal p25 / median / p75 from the /seasonal record
       GaugeSeasonalBanner already reads, and the line/gradient go neutral.

  Presentation only: every endpoint, every limit and every mode→prop mapping in
  the data layer below is the same as before the sheet rework.
-->
<template>
  <GaugeSheetModal
    v-model:open="open"
    v-model:hours="hours"
    :value-cfs="displayCfs"
    :band-label="bandChipLabel"
    :band-class="bandChipClass"
    :meta-text="metaText"
    :drawer-label="drawerLabel"
  >
    <!-- ── Title ────────────────────────────────────────────────────────────
         Reach mode: the run name, linking to the run page (the header's View
         button does the same trip). Gauge mode: the gauge's own name. -->
    <template #title>
      <template v-if="mode === 'reach' && reachTitle">
        <NuxtLink
          v-if="reachNavPath"
          :to="reachNavPath"
          class="transition-colors hover:text-primary-600 dark:hover:text-primary-400"
          @click="open = false"
        >{{ reachTitle }}</NuxtLink>
        <span v-else>{{ reachTitle }}</span>
      </template>
      <span v-else>{{ gaugeName }}</span>
    </template>

    <!-- ── Subtitle — author / gauge name / source deep link / watershed ──── -->
    <template #subtitle>
      <template v-if="mode === 'reach' && reachTitle">
        <span v-if="gauge.contextReachAuthorHandle" class="text-neutral-500 dark:text-neutral-400">@{{ gauge.contextReachAuthorHandle }}</span>
        <span v-if="gauge.contextReachAuthorHandle" class="opacity-50" aria-hidden="true">·</span>
        <span>{{ gaugeName }}</span>
        <span class="opacity-50" aria-hidden="true">·</span>
        <a
          :href="sourceUrl"
          target="_blank"
          rel="noopener"
          class="underline underline-offset-2 transition-colors hover:text-primary-600 dark:hover:text-primary-400"
        >{{ gauge.source.toUpperCase() }} {{ gauge.externalId }}</a>
      </template>
      <template v-else>
        <a
          :href="sourceUrl"
          target="_blank"
          rel="noopener"
          class="underline underline-offset-2 transition-colors hover:text-primary-600 dark:hover:text-primary-400"
        >{{ gauge.source.toUpperCase() }} · {{ gauge.externalId }}</a>
        <span v-if="gauge.watershedName" class="opacity-50" aria-hidden="true">·</span>
        <span v-if="gauge.watershedName">{{ gauge.watershedName }}</span>
      </template>
    </template>

    <!-- ── Actions — the shell owns the close button ───────────────────────── -->
    <template #actions>
      <!-- Reach mode: navigate to the run page -->
      <UButton
        v-if="mode === 'reach' && reachNavPath"
        :to="reachNavPath"
        size="xs"
        variant="outline"
        color="neutral"
        label="View"
        @click="open = false"
      />
      <!-- Gauge mode: open the gauge on its source (USGS / DWR / …) -->
      <UButton
        v-else-if="mode !== 'reach' && sourceUrl && sourceUrl !== '#'"
        :href="sourceUrl"
        target="_blank"
        external
        size="xs"
        variant="outline"
        color="neutral"
        label="View gauge"
        @click="open = false"
      />
      <!-- Edit run — owned, non-reference runs only -->
      <UButton
        v-if="mode === 'reach' && editNavPath && isMine(gauge.contextReachAuthorHandle) && !gauge.contextIsReference"
        :to="editNavPath"
        size="xs"
        variant="soft"
        color="primary"
        label="Edit"
        @click="open = false"
      />
    </template>

    <template v-if="displayCfs != null" #trend>
      <TrendArrow :gauge-id="gauge.id" />
    </template>

    <!-- ── Chart ────────────────────────────────────────────────────────────
         Same data props as before the rework — only `variant` and the sheet's
         presentation extras (reference lines, base-band caption, the hours the
         header now owns) are new. -->
    <template #chart>
      <GaugeGraph
        :gauge-id="gauge.id"
        variant="sheet"
        :current-cfs="displayCfs"
        :reach-slug="graphReachSlug"
        :flow-ranges-url="graphFlowRangesUrl"
        :no-ranges="mode !== 'reach'"
        :color="graphColor"
        :controlled-hours="hours"
        :reference-lines="referenceLines"
        :base-band-label="baseBandLabel"
        @latest-cfs="liveCfs = $event"
        @live-flow-band="liveBand = $event"
        @diurnal="diurnalData = $event"
        @band-regions="bandRegions = $event"
      />
    </template>

    <!-- ── Season & cycle drawer ────────────────────────────────────────────
         Home of everything the sheet lifted out of the vertical flow: the
         seasonal record, the diurnal cycle that used to sit above the graph,
         and the full cfs range per band that the deleted legend carried. -->
    <template #drawer>
      <div class="flex flex-col gap-4">
        <div v-if="currentMonth" class="flex flex-col gap-3">
          <GaugeSeasonalBanner
            :gauge-id="gauge.id"
            :current-cfs="displayCfs"
            variant="drawer"
          />

          <!-- The dotted lines gauge mode draws on the plot. Their on-chart
               captions can be crowded out near the header, and the seasonal
               sentence never prints the raw numbers — this is their only
               numeric home. -->
          <div v-if="referenceLines?.length" class="flex flex-col gap-1.5">
            <div v-for="line in referenceLines" :key="line.label" class="flex items-center gap-2 text-xs">
              <span class="h-0.5 w-4 shrink-0 rounded-full" :style="{ background: line.color }" />
              <span class="font-medium text-neutral-700 dark:text-neutral-200">{{ line.label }}</span>
              <span class="ml-auto shrink-0 tabular-nums text-neutral-500 dark:text-neutral-400">{{ line.value.toLocaleString() }} cfs</span>
            </div>
          </div>
        </div>

        <div
          v-if="diurnalData?.detected"
          class="border-t border-neutral-200 pt-4 dark:border-white/10"
        >
          <GaugeDiurnalBanner :pattern="diurnalData" variant="drawer" />
        </div>

        <!-- Flow ranges — the band list the sheet's threshold captions can't
             show: every band, including the base one (no line under it) and the
             open-ended top band, exactly as the old legend read. -->
        <!-- Section label + rule only when something precedes it: with no
             seasonal record and no diurnal cycle this is the whole drawer, and
             the shell already titles it "Flow ranges". -->
        <div
          v-if="bandRegions.length > 0"
          class="flex flex-col gap-2.5"
          :class="drawerHasSeasonOrCycle ? 'border-t border-neutral-200 pt-4 dark:border-white/10' : ''"
        >
          <span
            v-if="drawerHasSeasonOrCycle"
            class="text-[9.5px] font-bold tracking-[0.11em] text-neutral-500 uppercase dark:text-neutral-400"
          >Flow ranges</span>
          <div class="flex flex-col gap-1.5">
            <div v-for="region in bandRegions" :key="region.label" class="flex items-center gap-2 text-xs">
              <span class="size-2.5 shrink-0 rounded-sm" :style="{ background: colorKeyToHex(region.color) }" />
              <span class="truncate font-medium text-neutral-700 dark:text-neutral-200">{{ region.label }}</span>
              <span class="ml-auto shrink-0 tabular-nums text-neutral-500 dark:text-neutral-400">
                {{ region.from != null ? region.from.toLocaleString() : '—' }}–{{ region.to != null ? region.to.toLocaleString() : '∞' }} cfs
              </span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </GaugeSheetModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { WatchedGauge } from '~/stores/watchlist'
import { flowBandLabel, isGaugeStale, STALE_BADGE_CLASS } from '~/utils/flowBand'
import { type DiurnalPattern } from '~/composables/useDiurnalPattern'
import { useGaugeSeasonal } from '~/composables/useGaugeSeasonal'

// Structural mirrors of GaugeGraph's prop/emit payloads (it doesn't export them).
interface ReferenceLine {
  value: number
  label: string
  color: string
}

interface BandRegion {
  label: string
  color: string
  from:  number | null
  to:    number | null
}

const { bandBadgeClass } = useFlowBandPalette()

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{
  gauge: WatchedGauge
  mode?: 'gauge' | 'reach'  // 'gauge' = neutral, no bands; 'reach' = band-colored + reach name + chip
}>()

// The header owns the time window now (the sheet's segmented control), and
// drives the graph through GaugeGraph's existing `controlledHours` prop —
// the same pattern UserRunCustomGaugeModal already used.
const hours = ref<12 | 24 | 168 | 720>(24)

const liveCfs      = ref<number | null>(null)
const liveBand     = ref<{ flowBandLabel: string | null; flowStatus: string } | null>(null)
const diurnalData  = ref<DiurnalPattern | null>(null)
const bandRegions  = ref<BandRegion[]>([])
watch(open, (v) => {
  if (!v) {
    liveCfs.value     = null
    liveBand.value    = null
    diurnalData.value = null
    bandRegions.value = []
  }
})

const displayCfs = computed(() => liveCfs.value ?? props.gauge.currentCfs)

const gaugeName = computed(() =>
  props.gauge.name ?? `${props.gauge.source.toUpperCase()} ${props.gauge.externalId}`
)

// Reach title (reach mode header) — prefer common name, fall back to put-in→take-out
const reachTitle = computed(() =>
  props.gauge.contextReachCommonName
    ?? props.gauge.contextReachFullName
    ?? null
)

// Slug used for "View this reach" link and the header NuxtLink
const reachSlugForLink = computed(() =>
  props.gauge.contextReachSlug
    ?? props.gauge.reachSlug
    ?? props.gauge.reachSlugs?.[0]
    ?? null
)

// Full nav path for reach link: /runs/{handle}/{slug}
const reachNavPath = computed(() => {
  const slug = reachSlugForLink.value
  if (!slug) return null
  const handle = props.gauge.contextReachAuthorHandle ?? 'h2oflows'
  return `/runs/${handle}/${slug}`
})

// Edit path: /my/runs/{slug} — only rendered for owned, non-reference runs
const editNavPath = computed(() => {
  const slug = props.gauge.contextReachSlug ?? props.gauge.reachSlug ?? null
  if (!slug) return null
  return `/my/runs/${slug}`
})

// Reach slug passed to GaugeGraph only in reach mode — drives flow band coloring
// and, on the sheet, the dotted thresholds.
// null in gauge mode forces a neutral graph with no bands.
const graphReachSlug = computed(() =>
  props.mode === 'reach'
    ? (props.gauge.contextReachSlug ?? props.gauge.reachSlug ?? null)
    : null
)

// User runs store flow ranges under the run, not the curated /reaches/{slug}
// endpoint. When the reach has an author handle it's a user run:
//  - my own run  → /me/runs/{slug}/flow-ranges (authed, works at any visibility)
//  - another's   → /users/{handle}/runs/{slug}/flow-ranges (public-only)
// Null falls back to GaugeGraph's curated default.
const { apiBase } = useRuntimeConfig().public
const { load: loadMyProfile, isMine } = useMyProfile()
loadMyProfile()
const graphFlowRangesUrl = computed(() => {
  if (props.mode !== 'reach') return null
  const slug = props.gauge.contextReachSlug ?? props.gauge.reachSlug
  const handle = props.gauge.contextReachAuthorHandle
  if (!slug || !handle) return null
  return isMine(handle)
    ? `${apiBase}/api/v1/me/runs/${slug}/flow-ranges`
    : `${apiBase}/api/v1/users/${handle}/runs/${slug}/flow-ranges`
})

const sourceUrl = computed(() => gaugeSourceUrl(props.gauge.source, props.gauge.externalId) ?? '#')

// ── Readout chrome ────────────────────────────────────────────────────────

// Unchanged visibility rule: the chip is a reach-mode affordance, and prefers
// the live band the graph derives from the freshest reading.
const showBandChip = computed(() =>
  props.mode === 'reach' && Boolean(
    liveBand.value?.flowStatus !== 'unknown'
    || liveBand.value?.flowBandLabel
    || props.gauge.flowStatus !== 'unknown'
    || props.gauge.flowBandLabel,
  )
)

const chipBand   = computed(() => liveBand.value?.flowBandLabel ?? props.gauge.flowBandLabel)
const chipStatus = computed(() => liveBand.value?.flowStatus ?? props.gauge.flowStatus)

const bandChipLabel = computed(() =>
  showBandChip.value ? flowBandLabel(chipBand.value, chipStatus.value) : null
)

// Stale gauges lose the band hue but keep the label (#430) — same rule RunRow
// applies, so a run reads the same in the sheet as it does in the row that
// opened it. The sheet's own header meta line carries the reading's age.
const isStale = computed(() => isGaugeStale(props.gauge.pollHealth))

const bandChipClass = computed(() =>
  showBandChip.value
    ? (isStale.value ? STALE_BADGE_CLASS : bandBadgeClass(chipBand.value, chipStatus.value))
    : null
)

const lastReadingRelative = computed(() => {
  if (!props.gauge.lastReadingAt) return ''
  const ms = Date.now() - new Date(props.gauge.lastReadingAt).getTime()
  const m = Math.floor(ms / 60_000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m ago`
})

const metaText = computed(() =>
  props.gauge.lastReadingAt ? `Last reading ${lastReadingRelative.value}` : null
)

// ── Chart colors ──────────────────────────────────────────────────────────
//
// Canvas can't read Tailwind classes, so the sheet's non-band hues live as CSS
// custom properties in main.css and are read back at runtime — that keeps them
// following the app color mode instead of being pasted in as literals here.
// Re-read on open and on a color-mode flip; the values only matter while the
// sheet is on screen.
const colorMode = useColorMode()
const seasonalLineColor = ref('')
const neutralLineColor  = ref('')

function readCssVar(name: string): string {
  if (!import.meta.client) return ''
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

watch([open, () => colorMode.value], () => {
  if (!open.value) return
  seasonalLineColor.value = readCssVar('--seasonal-line')
  neutralLineColor.value  = readCssVar('--chart-neutral-line')
}, { immediate: true })

// p25/p75 are context, p50 is the reference — same hue, less presence.
const SEASONAL_DIM_ALPHA = 0.5

function dimmed(color: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(color)
  if (!m?.[1]) return color   // not a plain hex — leave it at full strength
  const n = Number.parseInt(m[1], 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${SEASONAL_DIM_ALPHA})`
}

// Gauge mode has no flow bands, so the line has no band color to take: fall back
// to the neutral chart token. Empty (SSR, or the var missing) hands the same
// lookup back to GaugeGraph, which resolves it against its own container.
const graphColor = computed(() =>
  props.mode !== 'reach' ? (neutralLineColor.value || undefined) : undefined
)

// ── Reference lines ───────────────────────────────────────────────────────
//
// Reach mode passes null so GaugeGraph derives one dotted line per flow-range
// threshold. Gauge mode has no thresholds at all, so it substitutes the current
// month's percentile spread from the seasonal record — the same data the
// Season & cycle drawer shows, and the same request (module-cached per gauge).
const { currentMonth } = useGaugeSeasonal(() => props.gauge.id)

const referenceLines = computed<ReferenceLine[] | null>(() => {
  if (props.mode === 'reach') return null
  const m = currentMonth.value
  if (!m) return null
  const strong = seasonalLineColor.value
  const faint  = strong ? dimmed(strong) : ''
  const lines: ReferenceLine[] = []
  if (m.p25 != null) lines.push({ value: m.p25, label: 'P25',    color: faint })
  if (m.p50 != null) lines.push({ value: m.p50, label: 'MEDIAN', color: strong })
  if (m.p75 != null) lines.push({ value: m.p75, label: 'P75',    color: faint })
  return lines.length > 0 ? lines : null
})

// The base band sits under the lowest threshold and gets no line of its own —
// this is its only caption on the plot.
const baseBandLabel = computed(() =>
  props.mode === 'reach' ? (bandRegions.value[0]?.label ?? null) : null
)

// One link, so it only earns its place when the drawer has something in it —
// and it has to name what's actually in there. A reach whose gauge has flow
// ranges but no seasonal record and no detected diurnal cycle (young or
// low-cadence gauges) opens on nothing but the band table.
const drawerHasSeasonOrCycle = computed(() =>
  currentMonth.value != null || diurnalData.value?.detected === true
)

const drawerLabel = computed(() => {
  if (drawerHasSeasonOrCycle.value) return 'Season & cycle'
  return bandRegions.value.length > 0 ? 'Flow ranges' : null
})
</script>
