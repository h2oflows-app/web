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
      <!-- Sparkline + badge slot + CFS — columns match individual run rows so sparklines align down the page -->
      <div class="w-44 shrink-0 hidden sm:block h-6 opacity-60 pointer-events-none">
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
      <!-- Empty badge slot — gauge has no flow band; keeps CFS column aligned with run rows -->
      <div class="w-20 shrink-0" />
      <div class="w-20 shrink-0 text-right">
        <span class="whitespace-nowrap text-sm sm:text-base font-bold tabular-nums text-neutral-700 dark:text-neutral-300">
          {{ currentCfs != null ? Math.round(currentCfs).toLocaleString() : '—' }}<span class="text-[10px] sm:text-xs font-normal text-neutral-400 dark:text-neutral-500"> cfs</span>
        </span>
      </div>
      <TrashButton label="Remove gauge group" @click="$emit('remove-group')" />
    </div>

    <!-- Reach sub-rows -->
    <div v-if="reachItems.length > 0" :class="hideGaugeHeader ? '' : 'border-t border-neutral-100 dark:border-neutral-800'">
      <RunRow
        v-for="item in reachItems"
        :key="item.contextReachSlug!"
        :vm="watchedGaugeToRunRowVM(item)"
        view-mode="list"
        variant="gauge-subrow"
        :show-river="false"
        :live-cfs-override="liveCfs"
        @open="$emit('open', item, 'reach')"
        @remove="$emit('remove-item', item)"
      />
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
      <RunRow
        v-for="item in reachItems"
        :key="item.contextReachSlug!"
        :vm="watchedGaugeToRunRowVM(item)"
        view-mode="list"
        variant="gauge-subrow"
        :show-river="false"
        show-view
        :show-edit="!item.contextIsReference"
        show-owner-right
        :live-cfs-override="liveCfs"
        @open="$emit('open', item, 'reach')"
        @remove="$emit('remove-item', item)"
      />
      <div v-if="reachItems.length === 0" class="px-3 py-1.5 text-xs text-neutral-400 italic">
        No related reaches
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import type { WatchedGauge } from '~/stores/watchlist'
import { watchedGaugeToRunRowVM } from '~/utils/runRow'

const props = defineProps<{
  leadGauge: WatchedGauge
  reachItems: WatchedGauge[]
  density?: 'comfortable' | 'full' | 'list'
  hideRiverName?: boolean
  hideGaugeHeader?: boolean
}>()

defineEmits<{
  (e: 'open', gauge: WatchedGauge, mode: 'gauge' | 'reach'): void
  (e: 'remove-group'): void
  (e: 'remove-item', item: WatchedGauge): void
}>()

// Fed by the gauge header sparkline; the reach sub-rows read it as their live
// cfs (they have no sparkline of their own) via <RunRow live-cfs-override>.
const liveCfs = ref<number | null>(null)

// Prefetch each reach's flow-ranges into the shared cache for the child RunRows.
const { prefetch } = useRunFlowBand()

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
