<template>
  <div class="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 px-6"
    :style="{ background: 'color-mix(in srgb, var(--ui-bg) 95%, transparent)', backdropFilter: 'blur(8px)' }">
    <div class="w-16 h-16 rounded-full flex items-center justify-center" style="background: #16a34a">
      <UIcon name="i-heroicons-check" class="text-white text-3xl" />
    </div>
    <div class="text-center">
      <h2 class="text-2xl font-bold text-[--ui-text-highlighted]" style="font-family: var(--font-heading, inherit)">Run created</h2>
      <p class="text-sm text-[--ui-text-muted] mt-1">It's live on your dashboard and shared to Explore.</p>
    </div>
    <!-- TODO Phase 3: summary card, view run, add another -->
    <UButton label="Add another run" variant="ghost" color="neutral" @click="$emit('reset')" />
  </div>
</template>

<script setup lang="ts">
defineEmits<{ reset: [] }>()
</script>
