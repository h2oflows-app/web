<template>
  <!-- Inline pill rendered inside WizardAppBar next to the Back button. Solid
       backdrop so the name stays legible over any basemap (#312 follow-up). -->
  <Transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0 -translate-x-1" enter-to-class="opacity-100 translate-x-0">
    <div
      v-if="store.riverName"
      class="pointer-events-none flex items-center gap-1.5 min-w-0 max-w-[45vw] sm:max-w-xs px-2.5 py-1 rounded-full text-xs font-medium shadow-md border border-[--ui-border]"
      style="background: var(--ui-bg)"
    >
      <span class="w-1.5 h-1.5 rounded-full bg-[--ui-primary] shrink-0" />
      <span class="text-[--ui-text-highlighted] font-semibold truncate" style="font-family: var(--font-heading, inherit)">{{ store.riverName }}</span>
      <span class="text-[--ui-text-dimmed] font-mono text-[10px] shrink-0">NHD</span>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useRunWizardStore } from '~/stores/runWizard'
const store = useRunWizardStore()
</script>
