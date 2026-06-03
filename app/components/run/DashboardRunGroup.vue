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
      <div class="flex items-center gap-1 min-w-0 flex-1">
        <span class="min-w-0 text-sm text-neutral-700 dark:text-neutral-300 truncate">
          {{ reachLabel(reach) }}
        </span>
        <NuxtLink :to="`/my/runs/${reach.contextReachSlug}`" class="shrink-0 p-0.5 rounded text-neutral-300 dark:text-neutral-600 hover:text-primary-500 dark:hover:text-primary-400 transition-colors" aria-label="Edit" title="Edit" @click.stop>
          <svg class="w-3 h-3" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 4l3 3-9 9-4 1 1-4 9-9z"/></svg>
        </NuxtLink>
        <NuxtLink :to="`/runs/${reach.contextReachAuthorHandle ?? 'h2oflows'}/${reach.contextReachSlug}`" class="shrink-0 p-0.5 rounded text-neutral-300 dark:text-neutral-600 hover:text-primary-500 dark:hover:text-primary-400 transition-colors" aria-label="View" title="View" @click.stop>
          <svg class="w-3 h-3" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 3H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-5M13 3h4m0 0v4m0-4L9 11"/></svg>
        </NuxtLink>
      </div>
      <div class="w-44 shrink-0 hidden sm:block h-6 opacity-60 pointer-events-none">
        <GaugeSparkline :gauge-id="reach.id" flow-status="unknown" :color="sparklineColor(reach)" compact :poll-health="reach.pollHealth" :last-reading-at="reach.lastReadingAt" @latest-cfs="(v) => setLiveCfs(reach, v)" />
      </div>
      <span
        v-if="displayFlowStatus(reach) !== 'unknown' || displayFlowBandLabel(reach)"
        :class="['inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold shrink-0', colorKeyToBadgeClass(displayBandColor(reach))]"
      >{{ displayFlowBandLabel(reach) }}</span>
      <div class="w-20 shrink-0 text-right">
        <span class="whitespace-nowrap text-base font-bold tabular-nums" :style="{ color: colorKeyToHex(displayBandColor(reach)) }">
          {{ displayCfs(reach) != null ? Math.round(displayCfs(reach)!).toLocaleString() : '—' }}
          <span class="text-xs font-normal text-neutral-400">cfs</span>
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
      <!-- Compact: single horizontal row (unchanged) -->
      <template v-if="density === 'compact'">
        <div class="flex items-center gap-2">
          <div class="flex items-center gap-1 min-w-0 flex-1">
            <span class="min-w-0 text-sm font-semibold text-neutral-800 dark:text-neutral-100 truncate">{{ reachLabel(reach) }}</span>
            <NuxtLink :to="`/my/runs/${reach.contextReachSlug}`" class="shrink-0 p-0.5 rounded text-neutral-300 dark:text-neutral-600 hover:text-primary-500 dark:hover:text-primary-400 transition-colors" aria-label="Edit" title="Edit" @click.stop>
              <svg class="w-3 h-3" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 4l3 3-9 9-4 1 1-4 9-9z"/></svg>
            </NuxtLink>
            <NuxtLink :to="`/runs/${reach.contextReachAuthorHandle ?? 'h2oflows'}/${reach.contextReachSlug}`" class="shrink-0 p-0.5 rounded text-neutral-300 dark:text-neutral-600 hover:text-primary-500 dark:hover:text-primary-400 transition-colors" aria-label="View" title="View" @click.stop>
              <svg class="w-3 h-3" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 3H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-5M13 3h4m0 0v4m0-4L9 11"/></svg>
            </NuxtLink>
          </div>
          <span
            v-if="displayFlowStatus(reach) !== 'unknown' || displayFlowBandLabel(reach)"
            :class="['inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold shrink-0', colorKeyToBadgeClass(displayBandColor(reach))]"
          >{{ displayFlowBandLabel(reach) }}</span>
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
          <div class="flex-1 min-w-0 flex items-center gap-1">
            <span class="min-w-0 text-base font-semibold text-neutral-800 dark:text-neutral-100 truncate">{{ reachLabel(reach) }}</span>
            <NuxtLink :to="`/my/runs/${reach.contextReachSlug}`" class="shrink-0 p-0.5 rounded text-neutral-300 dark:text-neutral-600 hover:text-primary-500 dark:hover:text-primary-400 transition-colors" aria-label="Edit" title="Edit" @click.stop>
              <svg class="w-3 h-3" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 4l3 3-9 9-4 1 1-4 9-9z"/></svg>
            </NuxtLink>
            <NuxtLink :to="`/runs/${reach.contextReachAuthorHandle ?? 'h2oflows'}/${reach.contextReachSlug}`" class="shrink-0 p-0.5 rounded text-neutral-300 dark:text-neutral-600 hover:text-primary-500 dark:hover:text-primary-400 transition-colors" aria-label="View" title="View" @click.stop>
              <svg class="w-3 h-3" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 3H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-5M13 3h4m0 0v4m0-4L9 11"/></svg>
            </NuxtLink>
            <span v-if="displayFlowStatus(reach) !== 'unknown' || displayFlowBandLabel(reach)" :class="['inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold shrink-0', colorKeyToBadgeClass(displayBandColor(reach))]">{{ displayFlowBandLabel(reach) }}</span>
          </div>
          <div class="text-right shrink-0">
            <div class="font-bold tabular-nums leading-none text-2xl" :style="{ color: colorKeyToHex(displayBandColor(reach)) }">
              {{ displayCfs(reach) != null ? Math.round(displayCfs(reach)!).toLocaleString() : '—' }}
            </div>
            <div class="text-xs text-neutral-400">cfs</div>
          </div>
          <TrashButton label="Remove" @click="$emit('remove', reach)" />
        </div>
        <div class="opacity-70">
          <GaugeSparkline :gauge-id="reach.id" flow-status="unknown" :color="sparklineColor(reach)" :compact="false" :poll-health="reach.pollHealth" :last-reading-at="reach.lastReadingAt" @latest-cfs="(v) => setLiveCfs(reach, v)" />
        </div>
      </template>

      <!-- Comfortable: name+CFS header row, full-width sparkline below -->
      <template v-else>
        <div class="flex items-center gap-2 mb-2">
          <div class="flex-1 min-w-0 flex items-center gap-1">
            <span class="min-w-0 text-base font-semibold text-neutral-800 dark:text-neutral-100 truncate">{{ reachLabel(reach) }}</span>
            <NuxtLink :to="`/my/runs/${reach.contextReachSlug}`" class="shrink-0 p-0.5 rounded text-neutral-300 dark:text-neutral-600 hover:text-primary-500 dark:hover:text-primary-400 transition-colors" aria-label="Edit" title="Edit" @click.stop>
              <svg class="w-3 h-3" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 4l3 3-9 9-4 1 1-4 9-9z"/></svg>
            </NuxtLink>
            <NuxtLink :to="`/runs/${reach.contextReachAuthorHandle ?? 'h2oflows'}/${reach.contextReachSlug}`" class="shrink-0 p-0.5 rounded text-neutral-300 dark:text-neutral-600 hover:text-primary-500 dark:hover:text-primary-400 transition-colors" aria-label="View" title="View" @click.stop>
              <svg class="w-3 h-3" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 3H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-5M13 3h4m0 0v4m0-4L9 11"/></svg>
            </NuxtLink>
            <span v-if="displayFlowStatus(reach) !== 'unknown' || displayFlowBandLabel(reach)" :class="['inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold shrink-0', colorKeyToBadgeClass(displayBandColor(reach))]">{{ displayFlowBandLabel(reach) }}</span>
          </div>
          <div class="text-right shrink-0">
            <div class="font-bold tabular-nums leading-none text-3xl" :style="{ color: colorKeyToHex(displayBandColor(reach)) }">
              {{ displayCfs(reach) != null ? Math.round(displayCfs(reach)!).toLocaleString() : '—' }}
            </div>
            <div class="text-xs text-neutral-400">cfs</div>
          </div>
          <TrashButton label="Remove" @click="$emit('remove', reach)" />
        </div>
        <div class="opacity-70">
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

function prefetchAll() {
  for (const r of props.reaches) {
    if (r.contextReachSlug) prefetch(r.contextReachSlug)
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
