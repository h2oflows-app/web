<template>
  <div
    class="flex items-center gap-0.5"
    :class="variant === 'pills'
      ? 'flex-wrap'
      : 'bg-neutral-100 dark:bg-neutral-800 rounded-lg p-0.5'"
    role="tablist"
    aria-label="Explore scope"
  >
    <button
      v-for="tab in TABS"
      :key="tab.key"
      role="tab"
      :aria-selected="modelValue === tab.key"
      class="text-xs font-medium transition-colors"
      :class="[
        variant === 'pills'
          ? 'px-3.5 py-1.5 rounded-full shadow-sm ' + (modelValue === tab.key
            ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
            : 'bg-white/95 dark:bg-neutral-900/95 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700')
          : 'flex-1 px-2.5 py-1.5 rounded-md ' + (modelValue === tab.key
            ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-sm'
            : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'),
      ]"
      @click="emit('select', tab.key)"
    >{{ tab.label }}</button>
  </div>
</template>

<script setup lang="ts">
import type { ExploreScope } from '~/types/explore'

// Segmented control (desktop rail) / pill row (mobile map overlay) for the
// explore scopes. Deliberately emits `select` instead of v-model: the page
// decides whether a click commits a scope change (during the incremental
// build-out some scopes open the legacy search modal instead).
withDefaults(defineProps<{
  modelValue: ExploreScope
  variant?: 'segmented' | 'pills'
}>(), { variant: 'segmented' })

const emit = defineEmits<{ (e: 'select', scope: ExploreScope): void }>()

const TABS: { key: ExploreScope; label: string }[] = [
  { key: 'mine', label: 'My Runs' },
  { key: 'community', label: 'Community' },
  { key: 'gauges', label: 'Gauges' },
]
</script>
