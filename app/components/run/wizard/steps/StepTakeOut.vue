<template>
  <div class="flex flex-col gap-5">
    <WizardProgress />
    <div class="flex flex-col gap-1">
      <p class="text-[10px] font-bold tracking-widest text-[--ui-text-muted] uppercase">TAKE-OUT · Step 2 of 4</p>
      <h2 class="text-xl font-bold text-[--ui-text-highlighted]" style="font-family: var(--font-heading, inherit); letter-spacing: -0.01em">Tap the take-out</h2>
      <p class="text-sm text-[--ui-text-muted]">Zoom &amp; tap the spot along the river where you take the boats out of the water.</p>
    </div>

    <!-- Live distance row -->
    <div
      class="flex items-center gap-3 px-4 py-3 rounded-xl"
      :style="{ background: 'var(--ui-bg-muted)', border: '1px solid var(--ui-border)' }"
    >
      <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background: #22c55e" />
      <span class="text-[--ui-text-dimmed] text-sm">→</span>
      <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background: #ef4444" />
      <span class="flex-1 text-sm text-[--ui-text-muted]">river miles</span>
      <span class="tabular-nums font-semibold text-[--ui-text-highlighted] text-base">{{ store.distanceMi > 0 ? store.distanceMi.toFixed(1) : '—' }} mi</span>
    </div>

    <div class="flex flex-col gap-2">
      <UButton
        label="Set take-out"
        leading-icon="i-heroicons-map-pin"
        size="xl"
        block
        color="primary"
        @click="$emit('set-takeout')"
      />
      <UButton
        label="Redo put-in"
        variant="ghost"
        color="neutral"
        size="md"
        block
        @click="$emit('redo-putin')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRunWizardStore } from '~/stores/runWizard'
const store = useRunWizardStore()
defineEmits<{ 'set-takeout': []; 'redo-putin': [] }>()
</script>
