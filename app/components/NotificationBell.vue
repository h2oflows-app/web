<template>
  <NuxtLink
    to="/invites"
    class="relative shrink-0 p-1.5 rounded-md text-neutral-500 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
    :class="route.path.startsWith('/invites') ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/50' : ''"
    aria-label="Invites"
    :title="unreadCount > 0 ? `Invites (${unreadCount} pending)` : 'Invites'"
  >
    <svg class="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
    </svg>
    <span
      v-if="unreadCount > 0"
      class="absolute top-0.5 right-0.5 min-w-3.75 h-3.75 px-0.75 rounded-full bg-red-500 text-white text-[9px] font-bold leading-3.75 text-center"
    >{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
  </NuxtLink>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useInvites } from '~/composables/useInvites'

const route = useRoute()
const { isAuthenticated } = useAuth()
const { unreadCount, refresh } = useInvites()

// Mount-time poll only (no websockets/realtime) — NotificationBell lives
// inside AppHeader, which every page includes directly (no shared layout
// wrapper), so it remounts on every client-side nav; this is the same
// "refresh on nav mount" pattern AppHeader itself uses for loadAdminRoles().
onMounted(() => { if (isAuthenticated.value) refresh() })
watch(isAuthenticated, (v) => { if (v) refresh() })
</script>
