<template>
  <div class="w-72 max-w-[calc(100vw-1rem)] rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white/95 dark:bg-neutral-900/95 backdrop-blur shadow-xl p-3.5 space-y-2.5">
    <!-- Header -->
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0">
        <div v-if="run" class="flex items-center gap-1.5 mb-0.5">
          <span class="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
            @{{ run.handle }}
            <svg v-if="run.is_special" class="w-2.5 h-2.5 text-primary-500" viewBox="0 0 20 20" fill="currentColor" aria-label="Official account">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
          </span>
        </div>
        <p class="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">{{ name }}</p>
        <p v-if="riverName" class="text-xs text-neutral-400 truncate">{{ riverName }}</p>
      </div>
      <button class="shrink-0 text-neutral-300 hover:text-neutral-500 dark:text-neutral-600 dark:hover:text-neutral-400" aria-label="Close" @click="emit('close')">
        <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
      </button>
    </div>

    <!-- Flow chip -->
    <div v-if="run?.flow_band" class="flex items-center gap-2">
      <span
        class="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
        :class="run.flow_color ? colorKeyToBadgeClass(run.flow_color) : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'"
      >
        {{ run.flow_band }}<template v-if="run.current_cfs != null"> · {{ Math.round(run.current_cfs).toLocaleString() }} cfs</template>
      </span>
    </div>

    <!-- Facts (full set when the run is in the loaded list; the map feature
         carries a reduced set for pins beyond the current page) -->
    <dl class="space-y-1 text-xs">
      <div v-if="classLabel" class="flex justify-between gap-2">
        <dt class="text-neutral-400 shrink-0">Class</dt>
        <dd class="text-neutral-700 dark:text-neutral-200">{{ classLabel }}</dd>
      </div>
      <div v-if="run?.length_mi" class="flex justify-between gap-2">
        <dt class="text-neutral-400 shrink-0">Length</dt>
        <dd class="text-neutral-700 dark:text-neutral-200">{{ run.length_mi.toFixed(1) }} mi</dd>
      </div>
      <div v-if="run?.gauge_name" class="flex justify-between gap-2">
        <dt class="text-neutral-400 shrink-0">Gauge</dt>
        <dd class="text-neutral-700 dark:text-neutral-200 truncate text-right">{{ run.gauge_name }}</dd>
      </div>
      <div v-if="upvotes != null" class="flex justify-between gap-2">
        <dt class="text-neutral-400 shrink-0">Upvotes</dt>
        <dd class="text-neutral-700 dark:text-neutral-200">{{ upvotes }}</dd>
      </div>
      <div v-if="run?.original_author_handle" class="flex justify-between gap-2">
        <dt class="text-neutral-400 shrink-0">Forked from</dt>
        <dd class="text-neutral-700 dark:text-neutral-200 truncate text-right">@{{ run.original_author_handle }}</dd>
      </div>
      <div v-if="run?.last_forked_at" class="flex justify-between gap-2">
        <dt class="text-neutral-400 shrink-0">Last forked</dt>
        <dd class="text-neutral-700 dark:text-neutral-200">{{ fmtDate(run.last_forked_at) }}</dd>
      </div>
      <div v-if="run" class="flex justify-between gap-2">
        <dt class="text-neutral-400 shrink-0">Put-in</dt>
        <dd class="text-neutral-700 dark:text-neutral-200 font-mono">{{ run.put_in_lat.toFixed(3) }}, {{ run.put_in_lng.toFixed(3) }}</dd>
      </div>
    </dl>

    <!-- Actions -->
    <div class="flex items-center gap-2 pt-1 border-t border-neutral-100 dark:border-neutral-800" @click.stop>
      <template v-if="run">
        <span v-if="adder.addedRunIds.value.has(run.id)" class="px-2.5 py-1 rounded-md text-xs font-medium bg-green-600 text-white">✓ Added</span>
        <button
          v-else
          class="px-2.5 py-1 rounded-md text-xs font-medium bg-primary-600 hover:bg-primary-700 text-white transition-colors disabled:opacity-60"
          :disabled="adder.addingRunId.value === run.id"
          @click="adder.addRun(run)"
        >
          <span v-if="adder.addingRunId.value === run.id" class="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/>
          <template v-else>Add</template>
        </button>
        <button
          class="text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 transition-colors disabled:opacity-50"
          :disabled="adder.forkingId.value === run.id"
          @click="adder.startFork(run)"
        >{{ adder.forkingId.value === run.id ? 'Forking…' : 'Fork' }}</button>
      </template>
      <NuxtLink
        :to="viewUrl"
        class="ml-auto text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 transition-colors"
      >View →</NuxtLink>
    </div>

    <!-- Inline fork dashboard picker (multi-dashboard, same adder state the
         list rows render — whichever surface is visible hosts it) -->
    <div v-if="run && adder.forkedForRunId.value === run.id" class="flex flex-wrap items-center gap-2 pt-1" @click.stop>
      <span class="text-xs text-neutral-500">Add fork to:</span>
      <button
        v-for="d in db.dashboards.value"
        :key="d.id"
        class="px-2 py-1 rounded-md text-xs border transition-colors"
        :class="adder.addingToDashId.value === d.id
          ? 'bg-primary-100 border-primary-300 text-primary-700 cursor-default'
          : 'border-neutral-200 dark:border-neutral-700 hover:border-primary-400 hover:bg-primary-50/60 text-neutral-600 dark:text-neutral-300'"
        :disabled="adder.addingToDashId.value != null"
        @click="adder.confirmForkDashboard(d.id)"
      >{{ d.name }}</button>
      <button class="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 ml-1" @click="adder.cancelFork()">Cancel</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ReachListItem } from '~/components/map/RunsMap.vue'
import type { DiscoverRun } from '~/composables/useCommunitySearch'
import type { ExploreAdd } from '~/composables/useExploreAdd'
import { classRange } from '~/utils/classRating'
import { colorKeyToBadgeClass } from '~/utils/flowBand'

// Community pin/row detail card (web#335). Prefers the full DiscoverRun from
// the loaded list; for a pin whose run sits beyond the current page it falls
// back to the map feature's ReachListItem (RunsMap is frozen and strips the
// richer MapCommunity props in toListItem, so the fallback set is smaller —
// View → always offers the full page).
const props = defineProps<{
  run: DiscoverRun | null
  feature: ReachListItem | null
  adder: ExploreAdd
}>()

const emit = defineEmits<{ (e: 'close'): void }>()

const db = useDashboards()

const name = computed(() => props.run?.name ?? props.feature?.name ?? '')
const riverName = computed(() => props.feature?.river_name ?? null)
const upvotes = computed(() => props.run?.upvote_count ?? props.feature?.upvote_count ?? null)
const classLabel = computed(() => {
  if (props.run && (props.run.class_min || props.run.class_max)) {
    return classRange(props.run.class_min, props.run.class_max)
  }
  if (props.feature?.class_max != null) return classRange(null, props.feature.class_max)
  return null
})
const viewUrl = computed(() => {
  const handle = props.run?.handle ?? props.feature?.author_handle ?? 'h2oflows'
  const slug = props.run?.slug ?? props.feature?.slug ?? ''
  return `/runs/${handle}/${slug}`
})

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })
  } catch { return '' }
}
</script>
