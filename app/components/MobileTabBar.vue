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
    <NuxtLink
      to="/explore"
      class="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors"
      :class="route.path === '/explore'
        ? 'text-primary-600 dark:text-primary-400'
        : 'text-neutral-500 dark:text-neutral-400'"
    >
      <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 14c3-6 6-9 8-9s5 9 8 9 5-9 8-9"/>
      </svg>
      Explore
    </NuxtLink>
    <NuxtLink
      to="/runs/community"
      class="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors"
      :class="route.path === '/runs/community'
        ? 'text-primary-600 dark:text-primary-400'
        : 'text-neutral-500 dark:text-neutral-400'"
    >
      <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
      Community
    </NuxtLink>
  </nav>
</template>

<script setup lang="ts">
const route = useRoute()
</script>
