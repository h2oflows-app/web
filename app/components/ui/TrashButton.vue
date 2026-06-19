<template>
  <button
    class="rounded p-1 cursor-pointer text-neutral-300 dark:text-neutral-600 hover:text-red-400 dark:hover:text-red-400 transition-colors shrink-0"
    :aria-label="label ?? 'Remove'"
    @click.stop="$emit('click')"
  >
    <svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 112 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd"/>
    </svg>
  </button>
</template>

<script setup lang="ts">
defineProps<{ label?: string }>()
defineEmits<{ click: [] }>()
</script>
