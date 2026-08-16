<template>
  <div class="sm:hidden absolute top-2 left-2 right-2 z-20 space-y-2">
    <!-- Floating search card (hidden for scopes that bring their own inputs) -->
    <div v-if="!hideInput" class="flex items-center gap-2 rounded-xl bg-white/95 dark:bg-neutral-900/95 border border-neutral-200 dark:border-neutral-700 shadow-lg px-3 py-2.5">
      <svg class="w-4 h-4 shrink-0 text-neutral-400" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="9" r="6"/><path d="m14 14 3 3"/></svg>
      <input
        :value="modelValue"
        type="search"
        :placeholder="placeholder"
        class="flex-1 min-w-0 bg-transparent text-sm text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value); emit('input')"
      />
    </div>
    <!-- Scope pills -->
    <ExploreScopeSwitcher :model-value="scope" variant="pills" @select="emit('scopeSelect', $event)" />
  </div>
</template>

<script setup lang="ts">
import type { ExploreScope } from '~/types/explore'

// Mobile map overlay: floating search + scope pills (web#335). The sheet
// below carries the results; this stays pinned over the map.
defineProps<{
  modelValue: string
  placeholder: string
  scope: ExploreScope
  hideInput?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
  (e: 'input'): void
  (e: 'scopeSelect', s: ExploreScope): void
}>()
</script>
