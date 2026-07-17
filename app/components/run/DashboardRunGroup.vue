<template>
  <!-- ─── LIST density ────────────────────────────────────────────────────── -->
  <div
    v-if="density === 'list'"
    class="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden"
  >
    <div
      v-for="reach in reaches"
      :key="`${reach.id}::${reach.contextReachSlug}`"
      class="flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors border-b border-neutral-100/50 dark:border-neutral-800/50 last:border-b-0 cursor-pointer"
      @click="$emit('open', reach, 'reach')"
    >
      <!-- Name + river (sub-line on mobile, inline on sm+) + view icon -->
      <div class="flex flex-col min-w-0 flex-1">
        <div class="flex items-center gap-1 min-w-0">
          <span class="min-w-0 text-sm text-neutral-700 dark:text-neutral-300 truncate">{{ reachLabel(reach) }}</span>
          <span v-if="showRiverName && reach.contextReachRiverName" class="text-xs text-neutral-400 dark:text-neutral-500 truncate hidden sm:inline shrink-0">· {{ reach.contextReachRiverName }}</span>
          <NuxtLink :to="`/runs/${reach.contextReachAuthorHandle ?? 'h2oflows'}/${reach.contextReachSlug}`" class="shrink-0 p-0.5 rounded text-neutral-300 dark:text-neutral-600 hover:text-primary-500 dark:hover:text-primary-400 transition-colors" aria-label="View" title="View" @click.stop>
            <svg class="w-3 h-3" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 3H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-5M13 3h4m0 0v4m0-4L9 11"/></svg>
          </NuxtLink>
          <OwnerIcon :author-handle="reach.contextReachAuthorHandle" :slug="reach.contextReachSlug" :run-id="reach.id" />
        </div>
        <span v-if="showRiverName && reach.contextReachRiverName" class="sm:hidden text-xs text-neutral-400 dark:text-neutral-500 truncate leading-tight">{{ reach.contextReachRiverName }}</span>
      </div>
      <!-- Sparkline next to badge, hidden on mobile -->
      <div class="w-44 shrink-0 hidden sm:block h-6 opacity-60 pointer-events-none">
        <GaugeSparkline :gauge-id="reach.id" flow-status="unknown" :color="sparklineColor(reach)" compact :poll-health="reach.pollHealth" :last-reading-at="reach.lastReadingAt" @latest-cfs="(v) => setLiveCfs(reach, v)" />
      </div>
      <!-- Badge always rendered (– when no thresholds) so CFS column aligns -->
      <div class="w-20 shrink-0 text-center">
        <span :class="['inline-flex items-center justify-center min-w-14 rounded-full px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-bold', hasBadge(reach) ? colorKeyToBadgeClass(displayBandColor(reach)) : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500']">{{ hasBadge(reach) ? displayFlowBandLabel(reach) : '–' }}</span>
      </div>
      <div class="w-20 shrink-0 text-right">
        <span class="whitespace-nowrap text-sm sm:text-base font-bold tabular-nums" :style="{ color: colorKeyToHex(displayBandColor(reach)) }">
          {{ displayCfs(reach) != null ? Math.round(displayCfs(reach)!).toLocaleString() : '—' }}
          <span class="text-[10px] sm:text-xs font-normal text-neutral-400">cfs</span>
        </span>
      </div>
      <TrashButton label="Remove" @click="$emit('remove', reach)" />
    </div>
  </div>

  <!-- ─── CARD densities (compact / comfortable / full) ──────────────────── -->
  <div
    v-else
    class="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden"
  >
    <div
      v-for="reach in reaches"
      :key="`${reach.id}::${reach.contextReachSlug}`"
      class="border-b border-neutral-100/50 dark:border-neutral-800/50 last:border-b-0 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors"
      :class="density === 'compact' ? 'px-2.5 py-2' : density === 'comfortable' ? 'px-3 py-2.5' : 'px-4 py-3'"
      @click="$emit('open', reach, 'reach')"
    >
      <!-- Compact: sparkline next to badge, always-on badge for alignment -->
      <template v-if="density === 'compact'">
        <div class="flex items-center gap-2">
          <!-- Name + river (sub-line on mobile, inline on sm+) + view icon -->
          <div class="flex flex-col min-w-0 flex-1">
            <div class="flex items-center gap-1 min-w-0">
              <span class="min-w-0 text-sm font-semibold text-neutral-800 dark:text-neutral-100 truncate">{{ reachLabel(reach) }}</span>
              <span v-if="showRiverName && reach.contextReachRiverName" class="text-xs text-neutral-400 dark:text-neutral-500 truncate shrink-0 hidden sm:inline">· {{ reach.contextReachRiverName }}</span>
              <NuxtLink :to="`/runs/${reach.contextReachAuthorHandle ?? 'h2oflows'}/${reach.contextReachSlug}`" class="shrink-0 p-0.5 rounded text-neutral-300 dark:text-neutral-600 hover:text-primary-500 dark:hover:text-primary-400 transition-colors" aria-label="View" title="View" @click.stop>
                <svg class="w-3 h-3" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 3H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-5M13 3h4m0 0v4m0-4L9 11"/></svg>
              </NuxtLink>
              <OwnerIcon :author-handle="reach.contextReachAuthorHandle" :slug="reach.contextReachSlug" :run-id="reach.id" />
            </div>
            <span v-if="showRiverName && reach.contextReachRiverName" class="sm:hidden text-xs text-neutral-400 dark:text-neutral-500 truncate leading-tight">{{ reach.contextReachRiverName }}</span>
          </div>
          <!-- Sparkline next to badge, hidden on mobile -->
          <div class="w-20 shrink-0 hidden sm:block h-6 opacity-50 pointer-events-none">
            <GaugeSparkline :gauge-id="reach.id" flow-status="unknown" :color="sparklineColor(reach)" compact :poll-health="reach.pollHealth" :last-reading-at="reach.lastReadingAt" @latest-cfs="(v) => setLiveCfs(reach, v)" />
          </div>
          <!-- Badge always rendered (– when no thresholds) so CFS column aligns -->
          <div class="w-20 shrink-0 text-center">
            <span :class="['inline-flex items-center justify-center min-w-14 rounded-full px-2 py-0.5 text-xs font-bold', hasBadge(reach) ? colorKeyToBadgeClass(displayBandColor(reach)) : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500']">{{ hasBadge(reach) ? displayFlowBandLabel(reach) : '–' }}</span>
          </div>
          <span class="text-lg font-bold tabular-nums shrink-0 leading-none" :style="{ color: colorKeyToHex(displayBandColor(reach)) }">
            {{ displayCfs(reach) != null ? Math.round(displayCfs(reach)!).toLocaleString() : '—' }}
          </span>
          <span class="text-xs text-neutral-400 shrink-0">cfs</span>
          <TrashButton label="Remove" @click="$emit('remove', reach)" />
        </div>
      </template>

      <!-- Full: header row + full-width sparkline below -->
      <template v-else-if="density === 'full'">
        <div class="flex items-center gap-2 mb-2">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1 min-w-0">
              <span class="min-w-0 text-base font-semibold text-neutral-800 dark:text-neutral-100 truncate">{{ reachLabel(reach) }}</span>
              <OwnerIcon :author-handle="reach.contextReachAuthorHandle" :slug="reach.contextReachSlug" :run-id="reach.id" />
            </div>
            <span v-if="showRiverName && reach.contextReachRiverName" class="text-xs text-neutral-400 dark:text-neutral-500 truncate block">{{ reach.contextReachRiverName }}</span>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <span v-if="displayFlowStatus(reach) !== 'unknown' || displayFlowBandLabel(reach)" :class="['inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold', colorKeyToBadgeClass(displayBandColor(reach))]">{{ displayFlowBandLabel(reach) }}</span>
            <div class="text-right">
              <div class="font-bold tabular-nums leading-none text-2xl" :style="{ color: colorKeyToHex(displayBandColor(reach)) }">
                {{ displayCfs(reach) != null ? Math.round(displayCfs(reach)!).toLocaleString() : '—' }}
              </div>
              <div class="text-xs text-neutral-400">cfs</div>
            </div>
          </div>
          <TrashButton label="Remove" @click="$emit('remove', reach)" />
        </div>
        <div class="opacity-70 pointer-events-none">
          <GaugeSparkline :gauge-id="reach.id" flow-status="unknown" :color="sparklineColor(reach)" :compact="false" :poll-health="reach.pollHealth" :last-reading-at="reach.lastReadingAt" @latest-cfs="(v) => setLiveCfs(reach, v)" />
        </div>
      </template>

      <!-- Comfortable: name+CFS header row, full-width sparkline below -->
      <template v-else>
        <div class="flex items-center gap-2 mb-2">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1 min-w-0">
              <span class="min-w-0 text-base font-semibold text-neutral-800 dark:text-neutral-100 truncate">{{ reachLabel(reach) }}</span>
              <OwnerIcon :author-handle="reach.contextReachAuthorHandle" :slug="reach.contextReachSlug" :run-id="reach.id" />
            </div>
            <span v-if="showRiverName && reach.contextReachRiverName" class="text-xs text-neutral-400 dark:text-neutral-500 truncate block">{{ reach.contextReachRiverName }}</span>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <span v-if="displayFlowStatus(reach) !== 'unknown' || displayFlowBandLabel(reach)" :class="['inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold', colorKeyToBadgeClass(displayBandColor(reach))]">{{ displayFlowBandLabel(reach) }}</span>
            <div class="text-right">
              <div class="font-bold tabular-nums leading-none text-3xl" :style="{ color: colorKeyToHex(displayBandColor(reach)) }">
                {{ displayCfs(reach) != null ? Math.round(displayCfs(reach)!).toLocaleString() : '—' }}
              </div>
              <div class="text-xs text-neutral-400">cfs</div>
            </div>
          </div>
          <TrashButton label="Remove" @click="$emit('remove', reach)" />
        </div>
        <div class="opacity-70 pointer-events-none">
          <GaugeSparkline :gauge-id="reach.id" flow-status="unknown" :color="sparklineColor(reach)" :compact="false" :poll-health="reach.pollHealth" :last-reading-at="reach.lastReadingAt" @latest-cfs="(v) => setLiveCfs(reach, v)" />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted, watch } from 'vue'
import type { WatchedGauge } from '~/stores/watchlist'
import { colorKeyToHex, colorKeyToBadgeClass } from '~/utils/flowBand'

const props = defineProps<{
  reaches: WatchedGauge[]
  density?: 'compact' | 'comfortable' | 'full' | 'list'
  showRiverName?: boolean
}>()

const emit = defineEmits<{
  (e: 'open', gauge: WatchedGauge, mode: 'gauge' | 'reach'): void
  (e: 'remove', gauge: WatchedGauge): void
}>()

useFlowBandPalette()
const liveCfsMap = reactive<Record<string, number>>({})
const { prefetch, bandForCfs, statusForColor } = useRunFlowBand()

function reachKey(reach: WatchedGauge): string {
  return `${reach.id}::${reach.contextReachSlug}`
}

function setLiveCfs(reach: WatchedGauge, v: number) {
  liveCfsMap[reachKey(reach)] = v
}

function displayCfs(reach: WatchedGauge): number | null {
  return liveCfsMap[reachKey(reach)] ?? reach.currentCfs
}

function displayBand(reach: WatchedGauge): { label: string; color: string } | null {
  return bandForCfs(reach.contextReachSlug, displayCfs(reach))
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

// True when the reach has a resolvable flow band/status. When false, dense
// views still render a neutral "–" pill so the CFS column stays aligned.
function hasBadge(reach: WatchedGauge): boolean {
  return displayFlowStatus(reach) !== 'unknown' || !!displayFlowBandLabel(reach)
}

function prefetchAll() {
  for (const r of props.reaches) {
    if (r.contextReachSlug) prefetch(r.contextReachSlug, r.contextReachAuthorHandle)
  }
}

onMounted(prefetchAll)
watch(() => props.reaches, prefetchAll)

function reachLabel(reach: WatchedGauge): string {
  return reach.contextReachCommonName ?? reach.contextReachFullName ?? reach.reachName ?? reach.name ?? reach.externalId
}

function sparklineColor(reach: WatchedGauge): string {
  const color = displayBandColor(reach)
  return color ? colorKeyToHex(color) : '#9ca3af'
}

</script>
