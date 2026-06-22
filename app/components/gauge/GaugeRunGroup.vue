<template>
  <!-- ─── LIST density ────────────────────────────────────────────────────── -->
  <div
    v-if="density === 'list'"
    class="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden"
  >
    <!-- Gauge station header row -->
    <div
      v-if="!hideGaugeHeader"
      class="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
      @click="$emit('open', leadGauge, 'gauge')"
    >
      <div class="min-w-0 flex-1 flex items-center gap-1.5">
        <svg class="w-4 h-4 text-neutral-400 dark:text-neutral-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-label="Gauge">
          <path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>
          <path d="M12 12 16 8"/>
          <path d="M3 12a9 9 0 0 1 18 0"/>
        </svg>
        <div class="min-w-0">
          <span class="text-sm font-medium text-neutral-600 dark:text-neutral-400 truncate block">{{ gaugeName }}</span>
          <span v-if="riverDisplayName && !hideRiverName" class="text-xs text-neutral-400 dark:text-neutral-500 truncate block leading-tight">{{ riverDisplayName }}</span>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <div class="w-28 shrink-0 hidden sm:block opacity-60 pointer-events-none">
          <GaugeSparkline
            :gauge-id="leadGauge.id"
            flow-status="unknown"
            color="#3b82f6"
            compact
            :poll-health="leadGauge.pollHealth"
            :last-reading-at="leadGauge.lastReadingAt"
            @latest-cfs="liveCfs = $event"
          />
        </div>
        <span class="shrink-0 whitespace-nowrap text-right text-base font-bold tabular-nums text-neutral-700 dark:text-neutral-300">
          {{ currentCfs != null ? Math.round(currentCfs).toLocaleString() : '—' }} <span class="text-xs font-normal text-neutral-400 dark:text-neutral-500">cfs</span>
        </span>
        <TrashButton label="Remove gauge group" @click="$emit('remove-group')" />
      </div>
    </div>

    <!-- Reach sub-rows -->
    <div v-if="reachItems.length > 0" :class="hideGaugeHeader ? '' : 'border-t border-neutral-100 dark:border-neutral-800'">
      <div
        v-for="item in reachItems"
        :key="item.contextReachSlug!"
        class="flex items-center gap-2 pl-5 pr-3 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors border-b border-neutral-100/50 dark:border-neutral-800/50 last:border-b-0 cursor-pointer"
        @click.stop="$emit('open', item, 'reach')"
      >
        <!-- Name only — compact view omits edit/view/@user icons (row click opens) -->
        <div class="flex items-center gap-1 min-w-0 flex-1">
          <span class="min-w-0 text-sm text-neutral-700 dark:text-neutral-300 truncate">
            {{ reachLabel(item) }}
          </span>
          <!-- Reference run: group icon -->
          <UTooltip v-if="item.contextIsReference" :text="item.contextReachAuthorHandle ? '@' + item.contextReachAuthorHandle : 'Shared run'" class="shrink-0 inline-flex"><svg class="w-3.5 h-3.5 shrink-0 text-primary-500 dark:text-primary-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></UTooltip>
        </div>
        <!-- Badge always rendered (– when no thresholds) so trash column aligns -->
        <div class="w-20 shrink-0 text-center">
          <span :class="['inline-flex items-center justify-center min-w-14 rounded-full px-2 py-0.5 text-xs font-bold', (displayFlowStatus(item) !== 'unknown' || displayFlowBandLabel(item)) ? colorKeyToBadgeClass(displayBandColor(item)) : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500']">{{ (displayFlowStatus(item) !== 'unknown' || displayFlowBandLabel(item)) ? displayFlowBandLabel(item) : '–' }}</span>
        </div>
        <TrashButton label="Remove" @click="$emit('remove-item', item)" />
      </div>
    </div>
    <div v-else class="border-t border-neutral-100 dark:border-neutral-800 pl-8 pr-3 py-1.5 text-xs text-neutral-400 italic">
      No related reaches
    </div>
  </div>

  <!-- ─── CARD densities (compact / comfortable / full) ──────────────────── -->
  <div
    v-else
    class="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden cursor-pointer transition-all duration-200 hover:border-neutral-300 dark:hover:border-neutral-600"
    @click="$emit('open', leadGauge, 'gauge')"
  >
    <!-- Gauge header section -->
    <div v-if="!hideGaugeHeader" :class="density === 'compact' ? 'p-2.5' : density === 'comfortable' ? 'p-3' : 'p-4'">

      <!-- Compact: simple horizontal row -->
      <template v-if="density === 'compact'">
        <div class="flex items-center gap-1.5 mb-2">
          <svg class="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-label="Gauge">
            <path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/><path d="M12 12 16 8"/><path d="M3 12a9 9 0 0 1 18 0"/>
          </svg>
          <span class="min-w-0 text-xs font-medium text-neutral-600 dark:text-neutral-400 truncate">{{ gaugeName }}</span>
        </div>
        <div class="flex items-baseline gap-2 mb-2">
          <span class="text-xl font-bold tabular-nums leading-none text-neutral-900 dark:text-white">
            {{ currentCfs != null ? Math.round(currentCfs).toLocaleString() : '—' }}
          </span>
          <span class="text-xs text-neutral-500">cfs</span>
        </div>
      </template>

      <!-- Full: header row + full-width sparkline below -->
      <template v-else-if="density === 'full'">
        <div class="flex items-center gap-2 mb-2">
          <svg class="w-4 h-4 text-neutral-400 dark:text-neutral-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-label="Gauge">
            <path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/><path d="M12 12 16 8"/><path d="M3 12a9 9 0 0 1 18 0"/>
          </svg>
          <div class="flex-1 min-w-0">
            <span class="text-sm font-medium text-neutral-700 dark:text-neutral-300 truncate block leading-tight">{{ gaugeName }}</span>
            <span v-if="riverDisplayName && !hideRiverName" class="text-xs text-neutral-400 dark:text-neutral-500 truncate block leading-tight">{{ riverDisplayName }}</span>
          </div>
          <div class="text-right shrink-0">
            <div class="font-bold tabular-nums leading-none text-2xl text-neutral-700 dark:text-neutral-300">
              {{ currentCfs != null ? Math.round(currentCfs).toLocaleString() : '—' }}
            </div>
            <div class="text-xs text-neutral-400">cfs</div>
          </div>
          <TrendArrow v-if="currentCfs != null" :gauge-id="leadGauge.id" class="text-base shrink-0" />
          <TrashButton label="Remove gauge group" @click="$emit('remove-group')" />
        </div>
        <div class="opacity-70 pointer-events-none">
          <GaugeSparkline
            :gauge-id="leadGauge.id"
            flow-status="unknown"
            color="#3b82f6"
            :compact="false"
            :poll-health="leadGauge.pollHealth"
            :last-reading-at="leadGauge.lastReadingAt"
            @latest-cfs="liveCfs = $event"
          />
        </div>
      </template>

      <!-- Comfortable: two-column — name left, sparkline below header, CFS right -->
      <template v-else>
        <div class="flex items-start gap-3 mb-2">
          <div class="flex items-center gap-1.5 flex-1 min-w-0">
            <svg class="w-4 h-4 text-neutral-400 dark:text-neutral-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-label="Gauge">
              <path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/><path d="M12 12 16 8"/><path d="M3 12a9 9 0 0 1 18 0"/>
            </svg>
            <div class="min-w-0">
              <span class="text-sm font-medium text-neutral-700 dark:text-neutral-300 truncate block leading-tight">{{ gaugeName }}</span>
              <span class="text-xs text-neutral-400 dark:text-neutral-500 font-mono truncate block leading-tight">{{ gaugeShortLabel }}</span>
              <span v-if="riverDisplayName && !hideRiverName" class="text-xs text-neutral-400 dark:text-neutral-500 truncate block leading-tight">{{ riverDisplayName }}</span>
            </div>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <div class="text-right">
              <div class="font-bold tabular-nums leading-none text-3xl text-neutral-700 dark:text-neutral-300">
                {{ currentCfs != null ? Math.round(currentCfs).toLocaleString() : '—' }}
              </div>
              <div class="text-xs text-neutral-400 mt-0.5">cfs</div>
              <TrendArrow v-if="currentCfs != null" :gauge-id="leadGauge.id" class="text-base justify-end mt-0.5" />
            </div>
            <TrashButton label="Remove gauge group" @click="$emit('remove-group')" />
          </div>
        </div>
        <div class="opacity-70 pointer-events-none">
          <GaugeSparkline
            :gauge-id="leadGauge.id"
            flow-status="unknown"
            color="#3b82f6"
            :compact="false"
            :poll-health="leadGauge.pollHealth"
            :last-reading-at="leadGauge.lastReadingAt"
            @latest-cfs="liveCfs = $event"
          />
        </div>
      </template>
    </div>

    <!-- Reach sub-list -->
    <div :class="hideGaugeHeader ? '' : 'border-t border-neutral-100 dark:border-neutral-800'">
      <div
        v-for="item in reachItems"
        :key="item.contextReachSlug!"
        class="flex items-center gap-1.5 px-3 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors border-b border-neutral-100/50 dark:border-neutral-800/50 last:border-b-0 cursor-pointer"
        @click.stop="$emit('open', item, 'reach')"
      >
        <!-- Name + link buttons -->
        <div class="flex items-center gap-1 min-w-0 flex-1">
          <span class="min-w-0 text-sm text-neutral-700 dark:text-neutral-300 truncate">
            {{ reachLabel(item) }}
          </span>
          <NuxtLink v-if="!item.contextIsReference" :to="`/my/runs/${item.contextReachSlug}`" class="shrink-0 p-0.5 rounded text-neutral-300 dark:text-neutral-600 hover:text-primary-500 dark:hover:text-primary-400 transition-colors" aria-label="Edit" title="Edit" @click.stop>
            <svg class="w-3 h-3" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 4l3 3-9 9-4 1 1-4 9-9z"/></svg>
          </NuxtLink>
          <NuxtLink :to="`/runs/${item.contextReachAuthorHandle ?? 'h2oflows'}/${item.contextReachSlug}`" class="shrink-0 p-0.5 rounded text-neutral-300 dark:text-neutral-600 hover:text-primary-500 dark:hover:text-primary-400 transition-colors" aria-label="View" title="View" @click.stop>
            <svg class="w-3 h-3" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 3H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-5M13 3h4m0 0v4m0-4L9 11"/></svg>
          </NuxtLink>
          <span v-if="item.contextIsReference && item.contextReachAuthorHandle" class="text-xs text-neutral-400 dark:text-neutral-500 shrink-0">@{{ item.contextReachAuthorHandle }}</span>
        </div>
        <!-- Fixed-width badge slot so trash column always aligns -->
        <div class="w-20 shrink-0 text-right">
          <span
            v-if="displayFlowStatus(item) !== 'unknown' || displayFlowBandLabel(item)"
            :class="['inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold', colorKeyToBadgeClass(displayBandColor(item))]"
          >{{ displayFlowBandLabel(item) }}</span>
        </div>
        <TrashButton label="Remove" @click="$emit('remove-item', item)" />
      </div>
      <div v-if="reachItems.length === 0" class="px-3 py-1.5 text-xs text-neutral-400 italic">
        No related reaches
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import type { WatchedGauge } from '~/stores/watchlist'
import { colorKeyToBadgeClass } from '~/utils/flowBand'

const props = defineProps<{
  leadGauge: WatchedGauge
  reachItems: WatchedGauge[]
  density?: 'compact' | 'comfortable' | 'full' | 'list'
  hideRiverName?: boolean
  hideGaugeHeader?: boolean
}>()

const emit = defineEmits<{
  (e: 'open', gauge: WatchedGauge, mode: 'gauge' | 'reach'): void
  (e: 'remove-group'): void
  (e: 'remove-item', item: WatchedGauge): void
}>()

useFlowBandPalette()

const liveCfs = ref<number | null>(null)

const { prefetch, bandForCfs, statusForColor } = useRunFlowBand()

function displayBand(reach: WatchedGauge): { label: string; color: string } | null {
  const cfs = liveCfs.value ?? reach.currentCfs
  return bandForCfs(reach.contextReachSlug, cfs)
}

function displayFlowBandLabel(reach: WatchedGauge): string | null {
  return displayBand(reach)?.label ?? reach.flowBandLabel ?? null
}

function displayBandColor(reach: WatchedGauge): string | null {
  return displayBand(reach)?.color ?? null
}

function displayFlowStatus(reach: WatchedGauge): string {
  return statusForColor(displayBandColor(reach)) ?? reach.flowStatus ?? 'unknown'
}

function reachLabel(item: WatchedGauge): string {
  return item.contextReachCommonName ?? item.contextReachFullName ?? item.reachName ?? item.name ?? item.externalId
}

function prefetchAll() {
  for (const r of props.reachItems) {
    if (r.contextReachSlug) prefetch(r.contextReachSlug, r.contextReachAuthorHandle)
  }
}

onMounted(prefetchAll)
watch(() => props.reachItems, prefetchAll)

const currentCfs = computed(() => liveCfs.value ?? props.leadGauge.currentCfs)

const gaugeShortLabel = computed(() =>
  `${props.leadGauge.source.toUpperCase()}-${props.leadGauge.externalId}`
)

const gaugeName = computed(() => props.leadGauge.name ?? gaugeShortLabel.value)

const riverDisplayName = computed(() =>
  props.leadGauge.contextReachRiverName ?? props.leadGauge.riverName ?? null
)
</script>
