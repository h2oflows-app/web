<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="$emit('cancel')">
      <div class="absolute inset-0 bg-black/40" @click="$emit('cancel')" />
      <div class="relative w-full max-w-xs bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-xl p-5 space-y-4">
        <h3 class="text-sm font-semibold">Rename dashboard</h3>
        <input
          ref="renameInput"
          v-model="renameName"
          type="text"
          class="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
          @keydown.enter="submit"
          @keydown.esc="$emit('cancel')"
        />
        <div class="flex gap-2 justify-end">
          <button class="px-3 py-1.5 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700" @click="$emit('cancel')">Cancel</button>
          <button class="px-3 py-1.5 text-sm rounded-lg bg-primary-600 text-white hover:bg-primary-700" @click="submit">Save</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import type { Dashboard } from '~/composables/useDashboards'

const props = defineProps<{
  open: boolean
  dashboard: Dashboard | null
}>()

const emit = defineEmits<{
  submit: [name: string]
  cancel: []
}>()

const renameName = ref('')
const renameInput = ref<HTMLInputElement | null>(null)

// Seed the input from the target dashboard whenever the modal opens, and
// focus it — mirrors the behavior DashboardTabBar used to own inline.
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    renameName.value = props.dashboard?.name ?? ''
    nextTick(() => renameInput.value?.focus())
  }
})

function submit() {
  if (!renameName.value.trim()) return
  emit('submit', renameName.value.trim())
}
</script>
