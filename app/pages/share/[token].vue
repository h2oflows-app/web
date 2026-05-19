<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-950">
    <AppHeader />

    <main class="max-w-lg mx-auto px-4 py-12 pb-24 sm:pb-12">
      <!-- Loading -->
      <div v-if="loading" class="flex justify-center py-20">
        <div class="w-6 h-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
      </div>

      <!-- Invalid token -->
      <div v-else-if="!payload" class="flex flex-col items-center gap-3 text-center py-20">
        <svg class="w-10 h-10 text-neutral-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <h2 class="text-lg font-semibold text-neutral-700 dark:text-neutral-200">Invalid share link</h2>
        <p class="text-sm text-neutral-500">This link may be malformed or from an unsupported version.</p>
        <NuxtLink to="/dashboard" class="text-sm text-primary-600 dark:text-primary-400 hover:underline">
          Go to dashboard
        </NuxtLink>
      </div>

      <!-- Valid payload -->
      <div v-else class="space-y-6">
        <div>
          <h1 class="text-xl font-bold text-neutral-900 dark:text-white">Dashboard snapshot</h1>
          <p class="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {{ payload.items.length }} gauge item{{ payload.items.length !== 1 ? 's' : '' }} shared with you
          </p>
        </div>

        <!-- Item list -->
        <div class="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden divide-y divide-neutral-100 dark:divide-neutral-800">
          <div
            v-for="item in payload.items"
            :key="item.id + (item.rs ?? '')"
            class="flex items-center gap-3 px-4 py-3"
          >
            <svg class="w-4 h-4 text-neutral-400 dark:text-neutral-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-label="Gauge">
              <path d="M12 14a2 2 0 100-4 2 2 0 000 4z"/><path d="M12 12l4-4"/><path d="M3 12a9 9 0 0118 0"/>
            </svg>
            <span class="text-sm text-neutral-700 dark:text-neutral-200">{{ item.l }}</span>
          </div>
        </div>

        <!-- Not authenticated -->
        <div
          v-if="!isAuthenticated"
          class="rounded-xl border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-950/30 px-4 py-5 text-center space-y-3"
        >
          <p class="text-sm text-neutral-700 dark:text-neutral-200">Sign in to add these gauges to your dashboard</p>
          <NuxtLink
            :to="`/login?redirect=${encodeURIComponent(route.fullPath)}`"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors"
          >
            Sign in
          </NuxtLink>
        </div>

        <!-- Authenticated: import -->
        <template v-else>
          <div v-if="!imported">
            <button
              class="w-full py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-medium transition-colors disabled:opacity-60"
              :disabled="importing"
              @click="importAll"
            >
              <span v-if="importing" class="flex items-center justify-center gap-2">
                <div class="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Adding…
              </span>
              <span v-else>Add all to my dashboard</span>
            </button>
            <p v-if="importError" class="mt-2 text-sm text-red-600 dark:text-red-400 text-center">{{ importError }}</p>
          </div>

          <!-- Success -->
          <div v-else class="space-y-3">
            <div class="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-4 flex items-center gap-3">
              <svg class="w-5 h-5 text-emerald-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
              <span class="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                Added {{ payload.items.length }} item{{ payload.items.length !== 1 ? 's' : '' }} to your dashboard
              </span>
            </div>
            <NuxtLink
              to="/dashboard"
              class="w-full flex items-center justify-center py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              Go to dashboard
            </NuxtLink>
          </div>
        </template>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ ssr: false })

interface ShareItem {
  t: 'g'
  id: string
  rs: string | null
  l: string
}
interface SharePayload {
  v: number
  items: ShareItem[]
}

const route = useRoute()
const { isAuthenticated, getToken } = useAuth()
const { apiBase } = useRuntimeConfig().public

const loading = ref(true)
const payload = ref<SharePayload | null>(null)
const importing = ref(false)
const imported = ref(false)
const importError = ref('')

onMounted(() => {
  const raw = route.params.token as string
  try {
    const pad = raw.replace(/-/g, '+').replace(/_/g, '/')
    const binary = atob(pad)
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0))
    const json = new TextDecoder().decode(bytes)
    const parsed = JSON.parse(json) as SharePayload
    if (parsed.v === 1 && Array.isArray(parsed.items)) {
      payload.value = parsed
    }
  } catch {
    // invalid token — payload stays null
  }
  loading.value = false
})

async function importAll() {
  if (!payload.value || importing.value) return
  importing.value = true
  importError.value = ''
  const token = await getToken()
  if (!token) { importing.value = false; return }

  try {
    await Promise.all(
      payload.value.items.map(item =>
        fetch(`${apiBase}/api/v1/watchlist`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ gauge_id: item.id, reach_slug: item.rs }),
        })
      )
    )
    imported.value = true
  } catch {
    importError.value = 'Something went wrong. Please try again.'
  } finally {
    importing.value = false
  }
}
</script>
