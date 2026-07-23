<template>
  <div class="inline-flex p-0.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 gap-0.5">
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      class="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
      :class="modelValue === opt.value
        ? 'bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100 shadow-sm'
        : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'"
      @click="$emit('update:modelValue', opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
export type CalendarView = 'month' | 'year' | 'list'

defineProps<{ modelValue: CalendarView }>()
defineEmits<{ 'update:modelValue': [CalendarView] }>()

const options: { value: CalendarView; label: string }[] = [
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
  { value: 'list', label: 'List' },
]
</script>
