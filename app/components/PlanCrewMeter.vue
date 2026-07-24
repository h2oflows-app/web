<template>
  <div class="space-y-1.5">
    <div class="flex items-center justify-between gap-2">
      <p class="text-sm font-medium text-neutral-800 dark:text-neutral-100">{{ title }}</p>
      <slot name="action" />
    </div>
    <div class="flex items-center gap-2">
      <div class="flex-1 h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
        <div
          class="h-full rounded-full transition-all"
          :class="isFull ? 'bg-neutral-400 dark:bg-neutral-600' : 'bg-primary-500 dark:bg-primary-400'"
          :style="{ width: `${pct}%` }"
        />
      </div>
      <span class="shrink-0 text-xs font-medium tabular-nums" :class="isFull ? 'text-neutral-400' : 'text-neutral-500 dark:text-neutral-400'">
        {{ isFull ? `${filled}/${max} full` : `${filled}/${max ?? '—'} crew` }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  filled: number
  max?: number | null
  title?: string
}>(), {
  title: 'Looking for crew',
})

const isFull = computed(() => props.max != null && props.filled >= props.max)
const pct = computed(() => {
  if (!props.max) return 0
  return Math.min(100, Math.round((props.filled / props.max) * 100))
})
</script>
