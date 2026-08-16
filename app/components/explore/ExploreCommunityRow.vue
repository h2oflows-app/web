<template>
  <li
    class="py-2.5 px-2 transition-colors cursor-pointer"
    :class="hovered
      ? 'bg-primary-50 dark:bg-primary-950/40'
      : selected ? 'bg-primary-50/70 dark:bg-primary-950/30' : 'hover:bg-neutral-50 dark:hover:bg-neutral-900/50'"
    @mouseenter="emit('hover', run.slug)"
    @mouseleave="emit('hover', null)"
    @click="emit('select', run)"
  >
    <div class="flex items-start gap-3">
      <div class="min-w-0 flex-1">
        <!-- Handle badge + special ✓ + fork attribution -->
        <div class="flex items-center gap-1.5 mb-0.5">
          <span class="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
            @{{ run.handle }}
            <svg v-if="run.is_special" class="w-2.5 h-2.5 text-primary-500" viewBox="0 0 20 20" fill="currentColor" aria-label="Official account">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
          </span>
          <span v-if="run.original_author_handle" class="text-[10px] text-neutral-400 dark:text-neutral-500">
            Forked from @{{ run.original_author_handle }}
          </span>
        </div>
        <p class="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{{ run.name }}</p>
        <!-- Meta row -->
        <div class="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
          <span v-if="run.class_min || run.class_max" class="text-xs text-neutral-500 dark:text-neutral-400">
            {{ classRange(run.class_min, run.class_max) }}
          </span>
          <span v-if="run.length_mi" class="text-xs text-neutral-400">{{ run.length_mi.toFixed(1) }}mi</span>
          <span v-if="run.gauge_name" class="text-xs text-neutral-400 truncate max-w-30">📍 {{ run.gauge_name }}</span>
          <span class="text-xs text-neutral-400">{{ run.upvote_count }} ▲</span>
          <span v-if="run.fork_count > 0" class="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
            {{ run.fork_count }} variant{{ run.fork_count !== 1 ? 's' : '' }}
          </span>
          <!-- Flow-band chip + live cfs (api#212 fields; color from the p<n>
               palette key — flow_status is deliberately not consulted) -->
          <span
            v-if="run.flow_band"
            class="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
            :class="run.flow_color ? colorKeyToBadgeClass(run.flow_color) : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'"
          >
            {{ run.flow_band }}<template v-if="run.current_cfs != null"> · {{ Math.round(run.current_cfs).toLocaleString() }} cfs</template>
          </span>
        </div>
        <!-- Action row -->
        <div class="mt-1.5 flex items-center gap-2" @click.stop>
          <!-- Added / adding / split Add -->
          <span v-if="adder.addedRunIds.value.has(run.id)" class="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-green-600 text-white">
            ✓ Added
          </span>
          <span v-else-if="adder.addingRunId.value === run.id" class="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-primary-600 text-white">
            <span class="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
          </span>
          <div v-else class="flex items-stretch rounded-md overflow-hidden shadow-sm">
            <button
              class="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white transition-colors"
              @click="adder.addRun(run)"
            >Add</button>
            <!-- Dropdown arrow for a different dashboard — desktop only -->
            <div class="relative hidden sm:block">
              <button
                class="flex items-center justify-center w-6 h-full bg-primary-700 hover:bg-primary-800 text-white transition-colors border-l border-primary-500"
                title="Add to a different dashboard"
                @click.stop="emit('toggleSplit', run.id)"
              >
                <svg class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd"/>
                </svg>
              </button>
              <div
                v-if="splitOpen"
                class="absolute right-0 top-full mt-1 z-50 min-w-[180px] rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg py-1"
              >
                <p class="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Add to dashboard</p>
                <button
                  v-for="d in db.dashboards.value"
                  :key="d.id"
                  class="w-full text-left px-3 py-1.5 text-xs text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                  :class="d.id === dashboardId ? 'font-medium text-primary-700 dark:text-primary-300' : ''"
                  @click.stop="adder.addRun(run, d.id); emit('toggleSplit', null)"
                >{{ d.name }}</button>
                <div class="border-t border-neutral-100 dark:border-neutral-800 my-1"/>
                <!-- New dashboard: create it, then add this run to it -->
                <div v-if="creatingDash" class="px-2 py-1.5 flex items-center gap-1" @click.stop>
                  <input
                    ref="newDashInput"
                    v-model="newDashName"
                    type="text"
                    maxlength="60"
                    placeholder="Dashboard name"
                    class="flex-1 min-w-0 px-2 py-1 text-xs rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    @keydown.enter.stop="createDashAndAdd()"
                    @keydown.esc.stop="creatingDash = false; newDashName = ''"
                  >
                  <button
                    class="shrink-0 px-2 py-1 text-xs rounded bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
                    :disabled="!newDashName.trim() || creatingDashBusy"
                    @click.stop="createDashAndAdd()"
                  >Add</button>
                </div>
                <button
                  v-else
                  class="w-full text-left px-3 py-1.5 text-xs text-primary-600 dark:text-primary-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                  @click.stop="creatingDash = true; newDashName = ''"
                >+ New dashboard</button>
              </div>
            </div>
          </div>

          <!-- Fork & customize -->
          <button
            class="text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 transition-colors disabled:opacity-50"
            :disabled="adder.forkingId.value === run.id"
            @click="adder.startFork(run)"
          >
            <span v-if="adder.forkingId.value === run.id" class="inline-flex items-center gap-1">
              <span class="w-3 h-3 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin inline-block"/>
              Forking…
            </span>
            <template v-else>Fork &amp; customize</template>
          </button>

          <!-- View → -->
          <NuxtLink
            :to="`/runs/${run.handle}/${run.slug}`"
            class="ml-auto text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 transition-colors"
            @click.stop
          >View →</NuxtLink>
        </div>
      </div>
    </div>

    <!-- Inline fork dashboard picker — shown after fork completes (multi-dash) -->
    <div
      v-if="adder.forkedForRunId.value === run.id"
      class="mt-2 pl-2 flex flex-wrap items-center gap-2"
      @click.stop
    >
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
  </li>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import type { DiscoverRun } from '~/composables/useCommunitySearch'
import type { ExploreAdd } from '~/composables/useExploreAdd'
import { classRange } from '~/utils/classRating'
import { colorKeyToBadgeClass } from '~/utils/flowBand'

// One community result row (web#335): the modal row's anatomy plus the
// redesign's additions — special-account ✓, flow-band chip + live cfs,
// always-visible Fork, View →, and map hover/select sync by slug.
const props = defineProps<{
  run: DiscoverRun
  adder: ExploreAdd
  dashboardId: string | null
  hovered: boolean
  selected: boolean
  splitOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'hover', slug: string | null): void
  (e: 'select', run: DiscoverRun): void
  (e: 'toggleSplit', runId: string | null): void
}>()

const db = useDashboards()

// Inline "New dashboard" create-and-add (from the split-button picker)
const creatingDash = ref(false)
const creatingDashBusy = ref(false)
const newDashName = ref('')
const newDashInput = ref<HTMLInputElement | null>(null)
watch(creatingDash, (v) => { if (v) nextTick(() => newDashInput.value?.focus()) })

async function createDashAndAdd() {
  const name = newDashName.value.trim()
  if (!name || creatingDashBusy.value) return
  creatingDashBusy.value = true
  try {
    const d = await db.create(name)
    if (d) {
      props.adder.targetDashboardId.value = d.id
      await props.adder.addRun(props.run, d.id)
    }
  } finally {
    creatingDashBusy.value = false
    creatingDash.value = false
    newDashName.value = ''
    emit('toggleSplit', null)
  }
}
</script>
