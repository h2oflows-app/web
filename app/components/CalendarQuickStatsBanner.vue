<template>
  <div class="rounded-xl bg-primary-50 dark:bg-primary-950/30 border border-primary-100 dark:border-primary-900/40 px-4 py-3">
    <div class="flex items-center justify-between mb-2.5">
      <p class="text-xs font-medium text-primary-700 dark:text-primary-400">{{ year }} season</p>
      <NuxtLink to="/season" class="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline shrink-0">View season →</NuxtLink>
    </div>

    <!-- fetchDone rule (feedback_loading_vs_empty): gate the skeleton on
         `loaded`, not on stats being falsy — a genuinely empty season (all
         zeros) must render the real 0s, not an endless skeleton. -->
    <div v-if="!loaded" class="grid grid-cols-4 gap-2">
      <div v-for="i in 4" :key="i" class="h-10 rounded-lg bg-primary-100/60 dark:bg-primary-900/30 animate-pulse" />
    </div>
    <div v-else class="grid grid-cols-4 gap-2 text-center">
      <div>
        <p class="text-lg font-bold font-mono text-neutral-800 dark:text-neutral-100 leading-none">{{ stats?.days_on_water ?? 0 }}</p>
        <p class="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mt-1">Days</p>
      </div>
      <div>
        <p class="text-lg font-bold font-mono text-neutral-800 dark:text-neutral-100 leading-none">{{ stats?.rivers ?? 0 }}</p>
        <p class="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mt-1">Rivers</p>
      </div>
      <div>
        <p class="text-lg font-bold font-mono text-neutral-800 dark:text-neutral-100 leading-none">{{ stats?.runs ?? 0 }}</p>
        <p class="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mt-1">Runs</p>
      </div>
      <div>
        <p class="text-lg font-bold font-mono text-neutral-800 dark:text-neutral-100 leading-none">{{ stats?.streak ?? 0 }}</p>
        <p class="text-[10px] text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mt-1">Streak</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useSeason } from '~/composables/useSeason'

const year = new Date().getFullYear()
const { stats, loaded, load } = useSeason()

onMounted(() => { load(year) })
</script>
