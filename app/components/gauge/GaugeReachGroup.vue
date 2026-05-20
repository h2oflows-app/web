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
        <div class="w-28 shrink-0 hidden sm:block opacity-60">
          <GaugeSparkline
            :gauge-id="leadGauge.id"
            flow-status="unknown"
            color="#3b82f6"
            compact
            @latest-cfs="liveCfs = $event"
          />
        </div>
        <span class="shrink-0 whitespace-nowrap text-right text-base font-bold tabular-nums text-neutral-900 dark:text-white">
          {{ currentCfs != null ? currentCfs.toLocaleString() : '—' }} <span class="text-xs font-normal text-neutral-400 dark:text-neutral-500">cfs</span>
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
        <!-- Name + link button side-by-side -->
        <div class="flex items-center gap-1 min-w-0 flex-1">
          <span class="min-w-0 text-sm text-neutral-700 dark:text-neutral-300 truncate">
            {{ item.contextReachCommonName ?? item.contextReachFullName ?? item.name }}
          </span>
          <NuxtLink
            :to="`/reaches/${item.contextReachSlug}`"
            class="shrink-0 p-0.5 rounded text-neutral-300 dark:text-neutral-600 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
            aria-label="View reach page"
            title="View reach page"
            @click.stop
          >
            <svg class="w-3 h-3" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 3H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-5M13 3h4m0 0v4m0-4L9 11" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </NuxtLink>
        </div>
        <span
          v-if="displayFlowStatus(item) !== 'unknown' || displayFlowBandLabel(item)"
          :class="['inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold shrink-0', bandBadgeClass(displayFlowBandLabel(item), displayFlowStatus(item))]"
        >{{ flowBandLabel(displayFlowBandLabel(item), displayFlowStatus(item)) }}</span>
        <TrashButton label="Remove" @click="removeAndSync(item.id, item.contextReachSlug)" />
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
            {{ currentCfs != null ? currentCfs.toLocaleString() : '—' }}
          </span>
          <span class="text-xs text-neutral-500">cfs</span>
        </div>
      </template>

      <!-- Comfortable: two-column — name+sparkline left, CFS right -->
      <template v-else>
        <div class="flex items-start gap-3">
          <!-- Left -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5 mb-1">
              <svg class="w-4 h-4 text-neutral-400 dark:text-neutral-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-label="Gauge">
                <path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/><path d="M12 12 16 8"/><path d="M3 12a9 9 0 0 1 18 0"/>
              </svg>
              <div class="min-w-0">
                <span class="text-sm font-medium text-neutral-700 dark:text-neutral-300 truncate block leading-tight">{{ gaugeName }}</span>
                <span class="text-xs text-neutral-400 dark:text-neutral-500 font-mono truncate block leading-tight">{{ gaugeShortLabel }}</span>
                <span v-if="riverDisplayName && !hideRiverName" class="text-xs text-neutral-400 dark:text-neutral-500 truncate block leading-tight">{{ riverDisplayName }}</span>
              </div>
            </div>
            <div class="opacity-70 h-14">
              <GaugeSparkline
                :gauge-id="leadGauge.id"
                flow-status="unknown"
                color="#3b82f6"
                :compact="false"
                @latest-cfs="liveCfs = $event"
              />
            </div>
          </div>
          <!-- Right: CFS -->
          <div class="text-right shrink-0">
            <div class="font-bold tabular-nums leading-none text-neutral-900 dark:text-white text-3xl">
              {{ currentCfs != null ? currentCfs.toLocaleString() : '—' }}
            </div>
            <div class="text-xs text-neutral-400 mt-0.5">cfs</div>
            <TrendArrow v-if="currentCfs != null" :gauge-id="leadGauge.id" class="text-base justify-end mt-0.5" />
          </div>
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
        <!-- Name + link button side-by-side -->
        <div class="flex items-center gap-1 min-w-0 flex-1">
          <span class="min-w-0 text-sm text-neutral-700 dark:text-neutral-300 truncate">
            {{ item.contextReachCommonName ?? item.contextReachFullName ?? item.name }}
          </span>
          <NuxtLink
            :to="`/reaches/${item.contextReachSlug}`"
            class="shrink-0 p-0.5 rounded text-neutral-300 dark:text-neutral-600 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
            aria-label="View reach page"
            title="View reach page"
            @click.stop
          >
            <svg class="w-3 h-3" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 3H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-5M13 3h4m0 0v4m0-4L9 11" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </NuxtLink>
        </div>
        <span
          v-if="displayFlowStatus(item) !== 'unknown' || displayFlowBandLabel(item)"
          :class="['inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold shrink-0', bandBadgeClass(displayFlowBandLabel(item), displayFlowStatus(item))]"
        >{{ flowBandLabel(displayFlowBandLabel(item), displayFlowStatus(item)) }}</span>
        <TrashButton label="Remove" @click="removeAndSync(item.id, item.contextReachSlug)" />
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
import { flowBandLabel } from '~/utils/flowBand'

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
}>()

const { bandBadgeClass } = useFlowBandPalette()
const { removeAndSync } = useWatchlistSync()

const liveCfs = ref<number | null>(null)

const { prefetch, bandForCfs, statusForBand } = useReachFlowBand()

function displayFlowBandLabel(reach: WatchedGauge): string | null {
  // All reaches in a group share one gauge — use live CFS from the gauge sparkline.
  // Falls back to stored currentCfs before the sparkline fires, then to server flowBandLabel.
  const cfs = liveCfs.value ?? reach.currentCfs
  return bandForCfs(reach.contextReachSlug, cfs) ?? reach.flowBandLabel ?? null
}

function displayFlowStatus(reach: WatchedGauge): string {
  return statusForBand(displayFlowBandLabel(reach)) ?? reach.flowStatus ?? 'unknown'
}

function prefetchAll() {
  for (const r of props.reachItems) {
    if (r.contextReachSlug) prefetch(r.contextReachSlug)
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
