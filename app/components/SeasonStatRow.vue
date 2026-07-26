<template>
  <div class="grid grid-cols-4 gap-2">
    <template v-if="loading">
      <div v-for="i in 4" :key="i" class="h-16 rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
    </template>
    <template v-else>
      <div class="rounded-xl border border-neutral-100 dark:border-neutral-800 px-2 py-3 text-center">
        <p class="text-lg font-bold font-mono text-neutral-900 dark:text-white leading-none">{{ stats?.rivers ?? 0 }}</p>
        <p class="text-[10px] text-neutral-400 uppercase tracking-wide mt-1.5">Rivers</p>
      </div>
      <div class="rounded-xl border border-neutral-100 dark:border-neutral-800 px-2 py-3 text-center">
        <p class="text-lg font-bold font-mono text-neutral-900 dark:text-white leading-none">{{ stats?.runs ?? 0 }}</p>
        <p class="text-[10px] text-neutral-400 uppercase tracking-wide mt-1.5">Runs</p>
      </div>
      <div class="rounded-xl border border-neutral-100 dark:border-neutral-800 px-2 py-3 text-center">
        <p class="text-lg font-bold font-mono text-neutral-900 dark:text-white leading-none">{{ stats?.new_runs?.length ?? 0 }}</p>
        <p class="text-[10px] text-neutral-400 uppercase tracking-wide mt-1.5">New</p>
      </div>
      <div class="rounded-xl border border-neutral-100 dark:border-neutral-800 px-2 py-3 text-center">
        <p class="text-lg font-bold font-mono text-neutral-900 dark:text-white leading-none">{{ stats?.highest_flow?.cfs != null ? Math.round(stats.highest_flow.cfs).toLocaleString() : '—' }}</p>
        <p class="text-[10px] text-neutral-400 uppercase tracking-wide mt-1.5">Peak cfs</p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { SeasonStats } from '~/composables/useSeason'

defineProps<{
  stats: SeasonStats | null
  loading?: boolean
}>()
</script>
