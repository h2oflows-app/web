<template>
  <!-- h2oflows brand wave -->
  <UTooltip v-if="resolvedHandle === 'h2oflows'" text="H2OFlows official" class="shrink-0 inline-flex">
    <svg class="w-3.5 h-3.5 shrink-0 text-primary-500 dark:text-primary-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M2 12c2-4 4-6 6-6s4 6 6 6 4-6 6-6" stroke-linecap="round"/>
    </svg>
  </UTooltip>

  <!-- Current user: single-person icon -->
  <UTooltip v-else-if="isMine(resolvedHandle)" text="Your run" class="shrink-0 inline-flex">
    <svg class="w-3.5 h-3.5 shrink-0 text-primary-500 dark:text-primary-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  </UTooltip>

  <!-- Another user: group/shared icon -->
  <UTooltip v-else :text="`@${resolvedHandle}`" class="shrink-0 inline-flex">
    <svg class="w-3.5 h-3.5 shrink-0 text-primary-500 dark:text-primary-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  </UTooltip>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  authorHandle?: string | null
}>()

const { isMine } = useMyProfile()

const resolvedHandle = computed(() => props.authorHandle ?? 'h2oflows')
</script>
