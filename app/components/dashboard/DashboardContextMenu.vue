<template>
  <div ref="wrap" class="relative">
    <ToolbarButton title="More actions" @click="open = !open">
      <svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
        <circle cx="8" cy="3" r="1.4"/>
        <circle cx="8" cy="8" r="1.4"/>
        <circle cx="8" cy="13" r="1.4"/>
      </svg>
    </ToolbarButton>
    <div
      v-if="open"
      class="absolute right-0 top-full mt-1 z-50 w-52 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg overflow-hidden py-1"
      @click="open = false"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
const wrap = ref<HTMLElement | null>(null)
const open = ref(false)

function onDocClick(e: MouseEvent) {
  if (wrap.value && !wrap.value.contains(e.target as Node)) open.value = false
}

onMounted(() => {
  if (import.meta.client) document.addEventListener('click', onDocClick)
})
onUnmounted(() => {
  if (import.meta.client) document.removeEventListener('click', onDocClick)
})
</script>
