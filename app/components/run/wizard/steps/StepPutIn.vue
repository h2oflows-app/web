<template>
  <div class="flex flex-col gap-5">
    <WizardProgress />
    <div class="flex flex-col gap-1">
      <p class="text-[10px] font-bold tracking-widest text-[--ui-text-muted] uppercase">PUT-IN · Step 1 of 4</p>
      <h2 class="text-xl font-bold text-[--ui-text-highlighted]" style="font-family: var(--font-heading, inherit); letter-spacing: -0.01em">Drag the pin to your put-in</h2>
      <p class="text-sm text-[--ui-text-muted]">Slide the green pin along the river — it stays locked to the flow line, so you can't miss.</p>
    </div>
    <UButton
      label="Set put-in"
      leading-icon="i-heroicons-map-pin"
      size="xl"
      block
      color="primary"
      style="background: #16a34a; border-color: #16a34a"
      @click="$emit('set-putin')"
    />
  </div>
</template>

<script setup lang="ts">
defineEmits<{ 'set-putin': [] }>()
</script>
