<template>
  <span
    v-if="authorHandle"
    class="inline-flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400"
  >
    <!-- Special (org/curator) accounts get a subtle building glyph; regular users get a person glyph. -->
    <svg v-if="isSpecial" class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="1"/>
      <path d="M9 22v-4h6v4"/>
      <path d="M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>
    </svg>
    <svg v-else class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
    @{{ authorHandle }}
  </span>
</template>

<script setup lang="ts">
defineProps<{
  isSpecial: boolean
  authorHandle?: string | null
}>()
</script>
