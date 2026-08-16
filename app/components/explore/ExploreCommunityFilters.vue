<template>
  <div>
    <div class="flex items-center gap-2 flex-wrap">
      <!-- Filters toggle w/ active count -->
      <button
        class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors"
        :class="expanded
          ? 'bg-primary-50 dark:bg-primary-950/40 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300'
          : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:border-neutral-300'"
        @click="expanded = !expanded"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L13 10.414V15a1 1 0 01-.553.894l-4 2A1 1 0 017 17v-6.586L3.293 6.707A1 1 0 013 6V3z" clip-rule="evenodd"/>
        </svg>
        Filters
        <span v-if="search.activeFilterCount.value > 0" class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary-600 text-white text-[10px] font-bold">{{ search.activeFilterCount.value }}</span>
      </button>

      <!-- Running now — the in_band chip is always visible (the headline filter) -->
      <button
        class="px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors"
        :class="search.inBand.value
          ? 'bg-green-600 border-green-600 text-white'
          : 'bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 hover:border-green-400'"
        @click="search.inBand.value = !search.inBand.value; search.reload()"
      >Running now</button>
    </div>

    <!-- Filter fields — collapsed by default -->
    <div v-if="expanded" class="mt-2 flex flex-wrap items-center gap-2">
      <input
        v-model.number="minClassProxy"
        type="number" min="1" max="6" step="0.5"
        placeholder="Min class"
        class="w-24 text-xs bg-neutral-100 dark:bg-neutral-900 rounded-md px-2 py-1.5 text-neutral-700 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
        @change="search.reload()"
      />
      <input
        v-model.number="maxClassProxy"
        type="number" min="1" max="6" step="0.5"
        placeholder="Max class"
        class="w-24 text-xs bg-neutral-100 dark:bg-neutral-900 rounded-md px-2 py-1.5 text-neutral-700 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
        @change="search.reload()"
      />
      <button
        class="px-2.5 py-1.5 text-xs rounded-md border transition-colors"
        :class="search.hasGauge.value
          ? 'bg-primary-100 dark:bg-primary-900/50 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300'
          : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600'"
        @click="search.hasGauge.value = !search.hasGauge.value; search.reload()"
      >Has gauge</button>
      <input
        v-model="search.handleFilter.value"
        type="text"
        placeholder="@handle"
        class="w-28 text-xs bg-neutral-100 dark:bg-neutral-900 rounded-md px-2 py-1.5 text-neutral-700 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
        @input="search.onQueryInput()"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { CommunitySearch } from '~/composables/useCommunitySearch'

// Community filter chips (web#335): the modal's filter block plus the new
// "Running now" (in_band) chip. Mutates the shared search state directly —
// the page owns the composable instance and both feeds read from it.
const props = defineProps<{ search: CommunitySearch }>()

const expanded = ref(false)

// v-model.number writes '' for a cleared field; the API wants null.
const minClassProxy = computed({
  get: () => props.search.minClass.value ?? undefined,
  set: (v) => { props.search.minClass.value = typeof v === 'number' && !Number.isNaN(v) ? v : null },
})
const maxClassProxy = computed({
  get: () => props.search.maxClass.value ?? undefined,
  set: (v) => { props.search.maxClass.value = typeof v === 'number' && !Number.isNaN(v) ? v : null },
})
</script>
