<template>
  <Transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0 translate-y-1" enter-to-class="opacity-100 translate-y-0">
    <div
      v-if="store.riverName"
      class="absolute top-14 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shadow-sm pointer-events-none"
      :style="{ background: 'color-mix(in srgb, var(--ui-bg) 85%, transparent)', backdropFilter: 'blur(6px)', border: '1px solid var(--ui-border)' }"
    >
      <span class="w-1.5 h-1.5 rounded-full bg-[--ui-primary] shrink-0" />
      <span class="text-[--ui-text-highlighted] font-semibold" style="font-family: var(--font-heading, inherit)">{{ store.riverName }}</span>
      <span class="text-[--ui-text-dimmed] font-mono text-[10px] ml-0.5">NHD</span>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useRunWizardStore } from '~/stores/runWizard'
const store = useRunWizardStore()
</script>
