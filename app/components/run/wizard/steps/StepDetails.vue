<template>
  <div class="flex flex-col gap-5">
    <WizardProgress />
    <div class="flex flex-col gap-1">
      <p class="text-[10px] font-bold tracking-widest text-[--ui-text-muted] uppercase">DETAILS · Step 4 of 4</p>
      <h2 class="text-xl font-bold text-[--ui-text-highlighted]" style="font-family: var(--font-heading, inherit)">Run details</h2>
      <p class="text-sm text-[--ui-text-muted]">Name your run, set difficulty, and add flow thresholds.</p>
    </div>
    <!-- TODO Phase 3: name, difficulty chips, FlowBandEditor, notes -->
    <UButton label="Create run" size="xl" block color="primary" @click="$emit('save')" />
  </div>
</template>

<script setup lang="ts">
defineEmits<{ save: [] }>()
</script>
