<template>
  <div v-if="stats?.highest_flow || stats?.new_runs?.length" class="rounded-xl border border-neutral-100 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800 overflow-hidden">
    <p class="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">Season highlights</p>

    <NuxtLink
      v-if="stats?.highest_flow"
      :to="`/plan-runs/${stats.highest_flow.plan_run_id}`"
      class="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
    >
      <div class="w-8 h-8 rounded-full bg-sky-100 dark:bg-sky-950/50 flex items-center justify-center shrink-0 text-sky-600 dark:text-sky-400">
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">Highest flow paddled</p>
        <p class="text-xs text-neutral-400 truncate">
          {{ stats.highest_flow.run_name || 'A run' }}<template v-if="stats.highest_flow.reach_name && stats.highest_flow.reach_name !== stats.highest_flow.run_name"> ({{ stats.highest_flow.reach_name }})</template> · {{ Math.round(stats.highest_flow.cfs).toLocaleString() }} cfs<template v-if="stats.highest_flow.date"> · {{ fmtDate(stats.highest_flow.date) }}</template>
        </p>
      </div>
      <svg class="w-4 h-4 text-neutral-300 dark:text-neutral-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m9 18 6-6-6-6"/></svg>
    </NuxtLink>

    <div v-if="stats?.new_runs?.length" class="px-4 py-3">
      <p class="text-sm font-medium text-neutral-800 dark:text-neutral-100 mb-1.5">{{ stats.new_runs.length }} new run{{ stats.new_runs.length === 1 ? '' : 's' }} ticked</p>
      <!-- new_runs carries only {slug,name,date} (no author handle — the
           paddled reach isn't necessarily caller-owned), so the usual
           `/runs/${handle}/${slug}` link (my/runs/index.vue's pattern) can't
           be built here. /my/runs/{slug} resolves by slug alone and already
           falls back to a read-only detail view when the caller isn't the
           author (RunWizard's `!isMine(authorHandle)` branch, #323) — the
           one slug-only route that's always safe to link. -->
      <div class="flex flex-wrap gap-1.5">
        <NuxtLink
          v-for="nr in stats.new_runs"
          :key="nr.slug"
          :to="`/my/runs/${nr.slug}`"
          class="inline-flex items-center rounded-full bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
          :title="fmtDate(nr.date)"
        >{{ nr.name }}</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SeasonStats } from '~/composables/useSeason'
import { fmtDate } from '~/utils/calendarDate'

defineProps<{
  stats: SeasonStats | null
}>()
</script>
