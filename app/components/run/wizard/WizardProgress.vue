<template>
  <!-- Hidden in edit mode: editing is not a 4-step march (#317 follow-up) -->
  <div v-if="store.mode !== 'edit'" class="flex gap-1.5 px-1">
    <div
      v-for="n in 4"
      :key="n"
      class="h-1 flex-1 rounded-full transition-colors duration-300"
      :class="n <= activeSegment ? 'bg-[--ui-primary]' : 'bg-[--ui-border]'"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRunWizardStore } from '~/stores/runWizard'
const store = useRunWizardStore()

const activeSegment = computed(() => {
  const map: Record<string, number> = { putin: 1, takeout: 2, gauge: 3, details: 4, saved: 4 }
  return map[store.step] ?? 1
})
</script>
