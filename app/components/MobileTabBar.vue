<template>
  <nav class="fixed bottom-0 inset-x-0 z-30 sm:hidden bg-white dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 flex overflow-x-hidden w-full pb-[env(safe-area-inset-bottom)]">
    <NuxtLink
      to="/dashboard"
      class="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors"
      :class="route.path === '/dashboard'
        ? 'text-primary-600 dark:text-primary-400'
        : 'text-neutral-500 dark:text-neutral-400'"
    >
      <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="4" rx="1"/><rect x="14" y="10" width="7" height="11" rx="1"/><rect x="3" y="13" width="7" height="8" rx="1"/>
      </svg>
      Dashboard
    </NuxtLink>
    <div class="shrink-0 flex items-center justify-center px-3">
      <button
        type="button"
        class="w-11 h-11 rounded-full bg-primary-600 text-white shadow-md active:scale-95 transition-transform flex items-center justify-center"
        aria-label="Add run"
        @click="onAdd"
      >
        <svg class="w-5 h-5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/>
        </svg>
      </button>
    </div>

    <NuxtLink
      to="/explore"
      class="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors"
      :class="route.path.startsWith('/explore')
        ? 'text-primary-600 dark:text-primary-400'
        : 'text-neutral-500 dark:text-neutral-400'"
    >
      <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 14c3-6 6-9 8-9s5 9 8 9 5-9 8-9"/>
      </svg>
      Explore
    </NuxtLink>
  </nav>
</template>

<script setup lang="ts">
const route = useRoute()
const { open } = useGaugeSearch()

async function onAdd() {
  if (route.path !== '/dashboard') await navigateTo('/dashboard')
  open('discover')
}
</script>
