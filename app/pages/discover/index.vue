<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-950">
    <AppHeader>
      <span class="text-neutral-300 dark:text-neutral-700 shrink-0">/</span>
      <span class="text-sm font-medium text-neutral-700 dark:text-neutral-200">Discover</span>
    </AppHeader>

    <!-- Auth loading -->
    <div v-if="!authReady" class="max-w-3xl mx-auto px-4 py-20 flex justify-center">
      <div class="w-6 h-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
    </div>

    <!-- Not signed in (contract §6 REVISED: calendar domain is auth-only, no anon read) -->
    <div v-else-if="!isAuthenticated" class="max-w-3xl mx-auto px-4 py-20 flex flex-col items-center gap-3 text-center">
      <svg class="w-10 h-10 text-neutral-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
      <h2 class="text-lg font-semibold">Sign in to browse Discover</h2>
      <NuxtLink to="/login" class="text-sm text-primary-600 dark:text-primary-400 hover:underline">Sign in</NuxtLink>
    </div>

    <!-- Authenticated -->
    <main v-else class="max-w-3xl mx-auto px-4 py-6 pb-24 sm:pb-6 space-y-4">
      <h1 class="text-xl font-bold text-neutral-900 dark:text-white">Discover</h1>
      <p class="text-xs text-neutral-400 -mt-2">Public plans looking for crew show here. Turn on <strong class="text-neutral-600 dark:text-neutral-300">Looking for crew</strong> on a run when you make a plan to appear.</p>

      <!-- Search + location filter -->
      <div class="flex flex-col sm:flex-row gap-2">
        <div class="relative flex-1">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            v-model="q"
            type="text"
            placeholder="Search plans by name…"
            class="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
          />
        </div>
        <input
          v-model="location"
          type="text"
          placeholder="Location…"
          class="sm:w-48 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
        />
      </div>

      <!-- Loading (first page) -->
      <div v-if="!fetchDone" class="space-y-3">
        <div v-for="i in 3" :key="i" class="h-32 rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
      </div>

      <!-- Empty -->
      <div v-else-if="!items.length" class="mt-16 flex flex-col items-center gap-3 text-center text-neutral-400">
        <svg class="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <p class="text-sm">{{ q || location ? 'No plans match your search.' : 'No crew calls right now — check back soon.' }}</p>
      </div>

      <!-- Results -->
      <div v-else class="space-y-3">
        <DiscoverPlanCard v-for="p in items" :key="p.id" :plan="p" />

        <div v-if="hasMore" class="flex justify-center pt-2">
          <button
            type="button"
            class="rounded-full px-4 py-2 text-sm font-medium border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-800 disabled:opacity-50 transition-colors"
            :disabled="loadingMore"
            @click="loadMore"
          >{{ loadingMore ? 'Loading…' : 'Load more' }}</button>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import type { DiscoverPlan } from '~/utils/discover'

definePageMeta({ ssr: false })

const { apiBase } = useRuntimeConfig().public
const { isAuthenticated, getToken } = useAuth()

const authReady = ref(false)
onMounted(() => { authReady.value = true })

const q = ref('')
const location = ref('')
const items = ref<DiscoverPlan[]>([])
const nextOffset = ref(0)
const hasMore = ref(false)
// fetchDone (house rule): gates the empty-state message so it never flashes
// before the first fetch resolves — distinct from `loadingMore`, which only
// covers the "Load more" pagination tail.
const fetchDone = ref(false)
const loadingMore = ref(false)

let searchTimer: ReturnType<typeof setTimeout> | null = null

// TODO(W4): see utils/discover.ts — GET /discover/plans reshaped to a flat
// run list in web#354 A1; this page's DiscoverPlan[] typing is stale until
// W4's regroup lands.
async function fetchPage(offset: number): Promise<{ items: DiscoverPlan[]; has_more: boolean; next_offset: number } | null> {
  const token = await getToken()
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`
  const params = new URLSearchParams({ limit: '20', offset: String(offset) })
  if (q.value.trim()) params.set('q', q.value.trim())
  if (location.value.trim()) params.set('location', location.value.trim())
  const res = await fetch(`${apiBase}/api/v1/discover/plans?${params}`, { headers }).catch(() => null)
  return res?.ok ? await res.json().catch(() => null) : null
}

async function search() {
  fetchDone.value = false
  const data = await fetchPage(0)
  items.value = data?.items ?? []
  hasMore.value = data?.has_more ?? false
  nextOffset.value = data?.next_offset ?? 0
  fetchDone.value = true
}

async function loadMore() {
  if (loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  const data = await fetchPage(nextOffset.value)
  if (data) {
    items.value = [...items.value, ...data.items]
    hasMore.value = data.has_more
    nextOffset.value = data.next_offset
  }
  loadingMore.value = false
}

watch(isAuthenticated, (v) => { if (v) search() }, { immediate: true })

// Debounced re-search on filter change (350ms, matches the run-picker
// community search elsewhere in this codebase).
watch([q, location], () => {
  if (!isAuthenticated.value) return
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(search, 350)
})
</script>
