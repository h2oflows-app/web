<template>
  <div class="flex flex-col gap-5">
    <WizardProgress />
    <div class="flex flex-col gap-1">
      <p class="text-[10px] font-bold tracking-widest text-[--ui-text-muted] uppercase">GAUGE · Step 3 of 4</p>
      <h2 class="text-xl font-bold text-[--ui-text-highlighted]" style="font-family: var(--font-heading, inherit)">Add a gauge</h2>
      <p class="text-sm text-[--ui-text-muted]">Attach a USGS gauge to track flow conditions for this run.</p>
    </div>
    <!-- TODO Phase 2: gauge auto-suggest card + chooser list -->
    <UButton label="Continue" size="xl" block color="primary" @click="$emit('continue')" />
    <UButton label="Skip — add a gauge later" variant="ghost" color="neutral" block @click="$emit('skip')" />
  </div>
</template>

<script setup lang="ts">
defineEmits<{ continue: []; skip: [] }>()
</script>
