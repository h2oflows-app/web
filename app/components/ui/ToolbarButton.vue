<template>
  <button
    class="shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors"
    :class="active
      ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'"
    v-bind="$attrs"
  >
    <slot />
    <span v-if="label" class="hidden sm:inline ml-0.5">{{ label }}</span>
  </button>
</template>

<script setup lang="ts">
defineProps<{ active?: boolean; label?: string }>()
</script>
