<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-950">
    <AppHeader />

    <!-- Auth loading -->
    <div v-if="!authReady" class="max-w-3xl mx-auto px-4 py-20 flex justify-center">
      <div class="w-6 h-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
    </div>

    <!-- Not signed in -->
    <div v-else-if="!isAuthenticated" class="max-w-3xl mx-auto px-4 py-20 flex flex-col items-center gap-3 text-center">
      <svg class="w-10 h-10 text-neutral-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
      <h2 class="text-lg font-semibold">Sign in to view your invites</h2>
      <NuxtLink to="/login" class="text-sm text-primary-600 dark:text-primary-400 hover:underline">Sign in</NuxtLink>
    </div>

    <!-- Authenticated -->
    <main v-else class="max-w-3xl mx-auto px-4 py-6 pb-24 sm:pb-6 space-y-5">
      <div class="flex items-center justify-between gap-3">
        <h1 class="text-xl font-bold text-neutral-900 dark:text-white">Invites</h1>
        <span class="text-sm text-neutral-400">
          {{ pendingCount > 0 ? `${pendingCount} pending` : 'All caught up' }}
        </span>
      </div>

      <div v-if="!loaded" class="space-y-3">
        <div v-for="i in 3" :key="i" class="h-20 rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
      </div>

      <div v-else-if="!invites.length" class="mt-16 flex flex-col items-center gap-3 text-center text-neutral-400">
        <svg class="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
        </svg>
        <p class="text-sm">No invites right now.</p>
        <p class="text-xs">When a paddler invites you to a run, it'll show up here.</p>
      </div>

      <div v-else class="space-y-3">
        <InviteFeedCard
          v-for="i in invites"
          :key="i.id"
          :invite="i"
          :busy="busyId"
          @accept="onAccept"
          @dismiss="onDismiss"
        />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useInvites } from '~/composables/useInvites'

definePageMeta({ ssr: false })

const { isAuthenticated } = useAuth()

const authReady = ref(false)
onMounted(() => { authReady.value = true })

const { invites, loaded, unreadCount, refresh, accept, dismiss } = useInvites()
const busyId = ref<string | null>(null)

// web#354 W4: invites are flat (one item = one run) — "pending" is just
// unreadCount straight off useInvites, matching the bell badge.
const pendingCount = computed(() => unreadCount.value)

// NotificationBell (in AppHeader, same page) already triggers a load on
// mount, but this page owns its own fetchDone gate — don't rely on sibling
// component timing to avoid an empty-state flash before that load resolves.
watch(isAuthenticated, (v) => { if (v) refresh() }, { immediate: true })

async function onAccept(id: string) {
  if (busyId.value) return
  busyId.value = id
  await accept(id)
  busyId.value = null
}

async function onDismiss(id: string) {
  if (busyId.value) return
  busyId.value = id
  await dismiss(id)
  busyId.value = null
}
</script>
