<template>
  <!-- LIST density — compact aligned row. `bordered=false` renders a divider row
       for use inside a shared box (river group); `bordered=true` (default) is
       self-contained, used for the standalone-gauges bucket. -->
  <div v-if="viewMode === 'list'" :class="rowClass" @click="$emit('open')">
    <div class="flex flex-col min-w-0 flex-1">
      <div class="flex items-center gap-1.5 min-w-0">
        <span class="text-sm font-semibold text-neutral-800 dark:text-neutral-100 truncate">{{ entry.name }}</span>
        <span v-if="entry.isCustom" class="shrink-0 inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">CUSTOM</span>
      </div>
      <span v-if="subline" class="hidden sm:block text-xs text-neutral-400 dark:text-neutral-500 font-mono truncate leading-tight">{{ subline }}</span>
    </div>
    <div class="w-32 shrink-0 hidden sm:block h-6 opacity-60 pointer-events-none">
      <GaugeSparkline v-if="!entry.isCustom" :gauge-id="entry.gaugeId" :flow-status="(entry.flowStatus as any)" :color="sparklineColor" compact @latest-cfs="onLatestCfs" />
      <CustomGaugeSparkline v-else :gauge-slug="entry.customGauge!.slug" compact :color="sparklineColor" />
    </div>
    <span class="shrink-0 inline-flex items-center rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-[10px] sm:text-xs font-medium text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
      {{ feedsLabel }}
    </span>
    <TrendArrow v-if="!entry.isCustom" :gauge-id="entry.gaugeId" />
    <div class="w-20 shrink-0 text-right">
      <span class="font-bold tabular-nums leading-none text-sm sm:text-base whitespace-nowrap" :style="{ color: cfsColor }">
        {{ displayCfs != null ? Math.round(displayCfs).toLocaleString() : '—' }}<span class="text-[10px] sm:text-xs font-normal text-neutral-400 dark:text-neutral-500"> cfs</span>
      </span>
    </div>
    <TrashButton v-if="entry.isCustom" label="Remove from dashboard" @click="$emit('remove')" />
  </div>

  <!-- CARD densities (comfortable / full) -->
  <div
    v-else
    class="relative rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3 transition-all duration-200 overflow-hidden cursor-pointer"
    @click="$emit('open')"
  >
    <div class="flex items-start gap-3 mb-2">
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-1.5 min-w-0">
          <span class="text-base font-semibold text-neutral-800 dark:text-neutral-100 truncate">{{ entry.name }}</span>
          <span v-if="entry.isCustom" class="shrink-0 inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">CUSTOM</span>
        </div>
        <span v-if="subline" class="text-xs text-neutral-400 dark:text-neutral-500 font-mono truncate block mt-0.5">{{ subline }}</span>
        <div class="flex items-center gap-1.5 mt-1 flex-wrap">
          <span class="inline-flex items-center rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 shrink-0">{{ feedsLabel }}</span>
          <span v-if="entry.feedsRuns.length > 0" class="text-xs text-neutral-400 dark:text-neutral-500 truncate">{{ runNamesJoined }}</span>
        </div>
      </div>
      <div class="shrink-0 flex items-center gap-1.5">
        <TrendArrow v-if="!entry.isCustom" :gauge-id="entry.gaugeId" class="text-base" />
        <div class="text-right">
          <div class="font-bold tabular-nums leading-none text-3xl" :style="{ color: cfsColor }">
            {{ displayCfs != null ? Math.round(displayCfs).toLocaleString() : '—' }}
          </div>
          <div class="text-xs text-neutral-400">cfs</div>
        </div>
        <TrashButton v-if="entry.isCustom" label="Remove from dashboard" @click="$emit('remove')" />
      </div>
    </div>
    <div class="relative mb-1 opacity-70 pointer-events-none">
      <GaugeSparkline v-if="!entry.isCustom" :gauge-id="entry.gaugeId" :flow-status="(entry.flowStatus as any)" :color="sparklineColor" :compact="viewMode !== 'full'" @latest-cfs="onLatestCfs" />
      <CustomGaugeSparkline v-else :gauge-slug="entry.customGauge!.slug" :compact="viewMode !== 'full'" :color="sparklineColor" />
    </div>
    <p v-if="viewMode === 'full' && lastUpdatedLabel" class="text-xs text-neutral-400 mt-0.5">{{ lastUpdatedLabel }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { WatchedGauge } from '~/stores/watchlist'
import { colorKeyToHex } from '~/utils/flowBand'

// Minimal custom-gauge shape this row needs. The full CustomGaugeSummary from
// dashboard.vue (which carries more fields) satisfies this structurally.
interface GaugeEntryCustomGauge { id: string; slug: string; description: string | null }

interface GaugeEntry {
  gaugeId: string
  gauge: WatchedGauge | null
  customGauge: GaugeEntryCustomGauge | null
  isCustom: boolean
  name: string
  source: string | null
  externalId: string | null
  currentCfs: number | null
  flowStatus: string
  flowBandLabel: string | null
  feedsRuns: string[]
  feedsRunSlugs: string[]
  lastReadingAt: string | null
}

const props = withDefaults(defineProps<{
  entry: GaugeEntry
  viewMode: 'list' | 'comfortable' | 'full'
  // When false, renders as a divider row meant to sit inside a parent's shared
  // bordered box (river group, list density). Ignored for card densities,
  // which are always self-bordered.
  bordered?: boolean
}>(), { bordered: true })

defineEmits<{ open: []; remove: [] }>()

const { bandForCfs } = useRunFlowBand()
const liveCfs = ref<number | null>(null)
function onLatestCfs(v: number) { liveCfs.value = v }

const displayCfs = computed(() => liveCfs.value ?? props.entry.currentCfs)

// Flow-band color only when the gauge feeds exactly one run — a shared gauge
// (or custom gauge) has no single band, so it renders neutral.
const band = computed(() => {
  if (props.entry.isCustom || props.entry.feedsRuns.length !== 1) return null
  return bandForCfs(props.entry.feedsRunSlugs[0], displayCfs.value)
})

const cfsColor = computed(() => (band.value ? colorKeyToHex(band.value.color) : '#9ca3af'))
const sparklineColor = computed(() => cfsColor.value)

const subline = computed(() => {
  if (props.entry.isCustom) return props.entry.customGauge?.description ?? null
  if (!props.entry.source || !props.entry.externalId) return null
  return `${props.entry.source.toUpperCase()} ${props.entry.externalId}`
})

const feedsLabel = computed(() => {
  const n = props.entry.feedsRuns.length
  if (n === 0) return 'No linked runs'
  return `feeds ${n} run${n === 1 ? '' : 's'}`
})

const runNamesJoined = computed(() => props.entry.feedsRuns.join(' · '))

function formatLastUpdated(iso: string | null): string | null {
  if (!iso) return null
  const ms = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return 'Updated just now'
  if (minutes < 60) return `Updated ${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Updated ${hours}h ago`
  return `Updated ${Math.floor(hours / 24)}d ago`
}
const lastUpdatedLabel = computed(() => (props.entry.isCustom ? null : formatLastUpdated(props.entry.lastReadingAt)))

const rowClass = computed(() => [
  'flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors cursor-pointer',
  props.bordered
    ? 'rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900'
    : 'border-b border-neutral-100/50 dark:border-neutral-800/50 last:border-b-0',
])
</script>
