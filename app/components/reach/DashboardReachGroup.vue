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
        <NuxtLink
          :to="`/reaches/${reach.contextReachSlug}`"
          class="shrink-0 p-0.5 rounded text-neutral-300 dark:text-neutral-600 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
          aria-label="View reach page"
          @click.stop
        >
          <svg class="w-3 h-3" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 3H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-5M13 3h4m0 0v4m0-4L9 11"/>
          </svg>
        </NuxtLink>
      </div>
      <div class="w-36 shrink-0 hidden sm:block h-6 opacity-60 pointer-events-none">
        <GaugeSparkline :gauge-id="reach.id" flow-status="unknown" :color="sparklineColor(reach)" compact @latest-cfs="(v) => setLiveCfs(reach, v)" />
      </div>
      <span
        v-if="displayFlowStatus(reach) !== 'unknown' || displayFlowBandLabel(reach)"
        :class="['inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold shrink-0', bandBadgeClass(displayFlowBandLabel(reach), displayFlowStatus(reach))]"
      >{{ flowBandLabel(displayFlowBandLabel(reach), displayFlowStatus(reach)) }}</span>
      <span class="shrink-0 whitespace-nowrap text-right text-base font-bold tabular-nums" :style="{ color: bandSolid(displayFlowBandLabel(reach)) }">
        {{ displayCfs(reach) != null ? displayCfs(reach)!.toLocaleString() : '—' }}
        <span class="text-xs font-normal text-neutral-400">cfs</span>
      </span>
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
            <NuxtLink
              :to="`/reaches/${reach.contextReachSlug}`"
              class="shrink-0 p-0.5 rounded text-neutral-300 dark:text-neutral-600 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
              aria-label="View reach page"
              @click.stop
            >
              <svg class="w-3 h-3" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 3H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-5M13 3h4m0 0v4m0-4L9 11"/>
              </svg>
            </NuxtLink>
          </div>
          <span
            v-if="displayFlowStatus(reach) !== 'unknown' || displayFlowBandLabel(reach)"
            :class="['inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold shrink-0', bandBadgeClass(displayFlowBandLabel(reach), displayFlowStatus(reach))]"
          >{{ flowBandLabel(displayFlowBandLabel(reach), displayFlowStatus(reach)) }}</span>
          <span class="text-lg font-bold tabular-nums shrink-0 leading-none" :style="{ color: bandSolid(displayFlowBandLabel(reach)) }">
            {{ displayCfs(reach) != null ? displayCfs(reach)!.toLocaleString() : '—' }}
          </span>
          <span class="text-xs text-neutral-400 shrink-0">cfs</span>
          <TrashButton label="Remove" @click="$emit('remove', reach)" />
        </div>
      </template>

      <!-- Comfortable / Full: left column (name + badge + sparkline) + right CFS -->
      <template v-else>
        <div class="flex items-start gap-3">
          <!-- Left -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1">
              <span class="min-w-0 text-base font-semibold text-neutral-800 dark:text-neutral-100 truncate">
                {{ reachLabel(reach) }}
              </span>
              <NuxtLink
                :to="`/reaches/${reach.contextReachSlug}`"
                class="shrink-0 p-0.5 rounded text-neutral-300 dark:text-neutral-600 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
                aria-label="View reach page"
                @click.stop
              >
                <svg class="w-3 h-3" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 3H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-5M13 3h4m0 0v4m0-4L9 11"/>
                </svg>
              </NuxtLink>
              <span
                v-if="displayFlowStatus(reach) !== 'unknown' || displayFlowBandLabel(reach)"
                :class="['inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold shrink-0', bandBadgeClass(displayFlowBandLabel(reach), displayFlowStatus(reach))]"
              >{{ flowBandLabel(displayFlowBandLabel(reach), displayFlowStatus(reach)) }}</span>
            </div>
            <div class="mt-1.5 opacity-70 h-14">
              <GaugeSparkline :gauge-id="reach.id" flow-status="unknown" :color="sparklineColor(reach)" :compact="false" @latest-cfs="(v) => setLiveCfs(reach, v)" />
            </div>
          </div>
          <!-- Right: CFS + remove -->
          <div class="flex items-start gap-1 shrink-0">
            <div class="text-right">
              <div class="font-bold tabular-nums leading-none text-3xl" :style="{ color: bandSolid(displayFlowBandLabel(reach)) }">
                {{ displayCfs(reach) != null ? displayCfs(reach)!.toLocaleString() : '—' }}
              </div>
              <div class="text-xs text-neutral-400 mt-0.5">cfs</div>
            </div>
            <TrashButton label="Remove" @click="$emit('remove', reach)" />
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted, watch } from 'vue'
import type { WatchedGauge } from '~/stores/watchlist'
import { flowBandLabel } from '~/utils/flowBand'

const props = defineProps<{
  reaches: WatchedGauge[]
  density?: 'compact' | 'comfortable' | 'full' | 'list'
}>()

const emit = defineEmits<{
  (e: 'open', gauge: WatchedGauge, mode: 'gauge' | 'reach'): void
  (e: 'remove', gauge: WatchedGauge): void
}>()

const { bandBadgeClass, bandSolid } = useFlowBandPalette()
const liveCfsMap = reactive<Record<string, number>>({})
const { prefetch, bandForCfs, statusForBand } = useReachFlowBand()

function reachKey(reach: WatchedGauge): string {
  return `${reach.id}::${reach.contextReachSlug}`
}

function setLiveCfs(reach: WatchedGauge, v: number) {
  liveCfsMap[reachKey(reach)] = v
}

function displayCfs(reach: WatchedGauge): number | null {
  return liveCfsMap[reachKey(reach)] ?? reach.currentCfs
}

function displayFlowBandLabel(reach: WatchedGauge): string | null {
  return bandForCfs(reach.contextReachSlug, displayCfs(reach)) ?? reach.flowBandLabel ?? null
}

function displayFlowStatus(reach: WatchedGauge): string {
  return statusForBand(displayFlowBandLabel(reach)) ?? reach.flowStatus ?? 'unknown'
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
  return bandSolid(displayFlowBandLabel(reach))
}

</script>
