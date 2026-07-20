<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="$emit('cancel')">
      <div class="absolute inset-0 bg-black/40" @click="$emit('cancel')" />
      <div class="relative w-full max-w-xs bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-xl p-5 space-y-3">
        <h3 class="text-sm font-semibold">Delete this dashboard?</h3>
        <p class="text-sm text-neutral-500 dark:text-neutral-400">
          "{{ dashboard?.name }}" and all its watchlisted gauges will be removed. This cannot be undone.
        </p>
        <div class="flex gap-2 justify-end pt-1">
          <button class="px-3 py-1.5 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700" @click="$emit('cancel')">Cancel</button>
          <button class="px-3 py-1.5 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700" @click="$emit('submit')">Delete</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { Dashboard } from '~/composables/useDashboards'

defineProps<{
  open: boolean
  dashboard: Dashboard | null
}>()

defineEmits<{
  submit: []
  cancel: []
}>()
</script>
