<template>
  <span
    v-if="isOfficial"
    class="inline-flex items-center gap-1 text-xs font-medium text-primary-600 dark:text-primary-400"
    title="Official H2OFlows run"
  >
    <svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
    H2OFlows
  </span>
  <span
    v-else-if="authorHandle"
    class="inline-flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400"
  >
    <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
    @{{ authorHandle }}
  </span>
</template>

<script setup lang="ts">
defineProps<{
  isOfficial: boolean
  authorHandle?: string | null
}>()
</script>
