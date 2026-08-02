<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-950">
    <AppHeader />

    <!-- Auth loading -->
    <div v-if="!authReady" class="max-w-3xl mx-auto px-4 py-20 flex justify-center">
      <div class="w-6 h-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
    </div>

    <!-- Not signed in -->
    <div v-else-if="!isAuthenticated" class="max-w-3xl mx-auto px-4 py-20 flex flex-col items-center gap-3 text-center">
      <svg class="w-10 h-10 text-neutral-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
      <h2 class="text-lg font-semibold">Sign in to view your season</h2>
      <NuxtLink to="/login" class="text-sm text-primary-600 dark:text-primary-400 hover:underline">Sign in</NuxtLink>
    </div>

    <!-- Authenticated -->
    <main v-else class="max-w-3xl mx-auto px-4 py-6 pb-24 sm:pb-6 space-y-5">
      <div class="flex items-center justify-between gap-3">
        <h1 class="text-xl font-bold text-neutral-900 dark:text-white">Season</h1>

        <!-- Year switcher: prev/current only (a full year picker isn't cheap
             enough for this wave — TODO(#246 follow-up): arbitrary year
             picker once seasons-in-history matter). -->
        <div class="flex items-center gap-1 rounded-full bg-neutral-100 dark:bg-neutral-800 p-0.5">
          <button
            type="button"
            class="px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
            :class="year === prevYear ? 'bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100 shadow-sm' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'"
            @click="selectYear(prevYear)"
          >{{ prevYear }}</button>
          <button
            type="button"
            class="px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
            :class="year === currentYear ? 'bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100 shadow-sm' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'"
            @click="selectYear(currentYear)"
          >{{ currentYear }}</button>
        </div>
      </div>

      <SeasonHero />
      <SeasonStatRow :stats="stats" :loading="!loaded" />
      <SeasonHighlights :stats="stats" />

      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-2">Recent runs</p>

        <div v-if="!loaded" class="space-y-2">
          <div v-for="i in 3" :key="i" class="h-16 rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
        </div>

        <div v-else-if="!stats?.recent?.length" class="flex flex-col items-center gap-2 text-center text-neutral-400 py-10">
          <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
          <p class="text-sm">Nothing logged for {{ year }} yet.</p>
        </div>

        <div v-else class="space-y-2">
          <PlanRunFeedCard
            v-for="r in stats.recent"
            :key="r.id"
            :run="toCalendarRun(r)"
            :date="r.run_date"
          />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ ssr: false })

import { ref, computed, onMounted, watch } from 'vue'
import { useSeason } from '~/composables/useSeason'
import type { SeasonRecentRun } from '~/composables/useSeason'
import type { CalendarRun } from '~/composables/useCalendar'

const { isAuthenticated } = useAuth()

const authReady = ref(false)
onMounted(() => { authReady.value = true })

const { stats, loaded, load } = useSeason()

const currentYear = new Date().getFullYear()
const prevYear = currentYear - 1
const year = ref(currentYear)

function selectYear(y: number) {
  year.value = y
  load(y)
}

watch(isAuthenticated, (v) => {
  if (v) load(year.value)
}, { immediate: true })

// SeasonRecentRun (season API's flatter shape) -> CalendarRun, so
// PlanRunFeedCard (built against the calendar contract) can render it
// unchanged rather than forking a season-specific feed card component.
function toCalendarRun(r: SeasonRecentRun): CalendarRun {
  return {
    id: r.id,
    // r.name is guaranteed non-null in practice (calendar_runs.name is NOT
    // NULL) but stays optional in the api's own seasonRecentRun struct (see
    // useSeason.ts doc note) — reach_name is the next-best fallback, and
    // PlanRunFeedCard's own template gates on truthiness rather than
    // rendering "undefined" either way.
    name: r.name ?? r.reach_name ?? 'Paddle',
    reach_name: r.reach_name ?? undefined,
    flow_band: r.flow_band ?? undefined,
    flow_color: r.flow_color ?? undefined,
    gauge_cfs: r.gauge_cfs ?? undefined,
    paddled: true, // season `recent` is always WHERE pr.paddled
    notes: r.notes ?? undefined,
  }
}
</script>
