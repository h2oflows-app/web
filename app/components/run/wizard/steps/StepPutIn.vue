<template>
  <div class="flex flex-col gap-5">
    <WizardProgress />
    <div class="flex flex-col gap-1">
      <p class="text-[10px] font-bold tracking-widest text-[--ui-text-muted] uppercase">PUT-IN · Step 1 of 4</p>
      <h2 class="text-xl font-bold text-[--ui-text-highlighted]" style="font-family: var(--font-heading, inherit); letter-spacing: -0.01em">Tap your put-in</h2>
      <p class="text-sm text-[--ui-text-muted]">Zoom in to your river and tap the most-exact spot where you drop your boat in the water. That's your put-in.</p>
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
