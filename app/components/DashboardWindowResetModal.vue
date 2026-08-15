<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4" @pointerdown="backdropDown" @pointerup="backdropUp($event) && $emit('cancel')">
      <div class="absolute inset-0 bg-black/40" @click="$emit('cancel')" />
      <div class="relative w-full max-w-xs bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-xl p-5 space-y-3">
        <h3 class="text-sm font-semibold">Set every sparkline to {{ label }}?</h3>
        <p class="text-sm text-neutral-500 dark:text-neutral-400">
          {{ count }} gauge{{ count === 1 ? '' : 's' }} on this dashboard {{ count === 1 ? 'has' : 'have' }} its own time
          window. Applying the dashboard window resets {{ count === 1 ? 'it' : 'them' }}.
        </p>
        <div class="flex gap-2 justify-end pt-1">
          <button class="px-3 py-1.5 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700" @click="$emit('cancel')">Cancel</button>
          <button class="px-3 py-1.5 text-sm rounded-lg bg-primary-600 text-white hover:bg-primary-700" @click="$emit('submit')">Apply to all</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  open: boolean
  /** Human label of the window being applied, e.g. "1 week". */
  label: string
  /** How many sparklines currently carry their own window. */
  count: number
}>()

defineEmits<{
  submit: []
  cancel: []
}>()
</script>
