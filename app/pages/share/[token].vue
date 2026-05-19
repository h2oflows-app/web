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

        <!-- Item list with live readings -->
        <div class="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden divide-y divide-neutral-100 dark:divide-neutral-800">
          <div
            v-for="item in payload.items"
            :key="item.id + (item.rs ?? '')"
            class="flex items-center gap-3 px-4 py-3"
          >
            <svg class="w-4 h-4 text-neutral-400 dark:text-neutral-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-label="Gauge">
              <path d="M12 14a2 2 0 100-4 2 2 0 000 4z"/><path d="M12 12l4-4"/><path d="M3 12a9 9 0 0118 0"/>
            </svg>
            <span class="flex-1 min-w-0 truncate text-sm text-neutral-700 dark:text-neutral-200">{{ itemLabel(item) }}</span>
            <template v-if="readingsFetchDone">
              <span v-if="reading(item)?.current_cfs != null" class="text-sm font-semibold tabular-nums" :style="{ color: bandColor(reading(item)) }">
                {{ Math.round(reading(item)!.current_cfs!).toLocaleString() }}
                <span class="text-xs font-normal text-neutral-400">cfs</span>
              </span>
              <span v-else class="text-xs text-neutral-400">—</span>
              <span v-if="reading(item)?.flow_band_label" class="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded font-semibold" :style="{ color: bandColor(reading(item)), backgroundColor: bandBgColor(reading(item)) }">
                {{ reading(item)!.flow_band_label }}
              </span>
            </template>
            <span v-else class="w-3 h-3 rounded-full border-2 border-neutral-300 border-t-transparent animate-spin" />
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
  // Label — optional. Legacy tokens included it; newer (smaller) tokens omit it
  // and rely on the batch endpoint response for gauge names. Both forms render.
  l?: string
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

// Live readings fetched from the batch endpoint
interface BatchReading {
  id: string
  name: string | null
  context_reach_slug: string | null
  context_reach_common_name: string | null
  context_reach_full_name: string | null
  current_cfs: number | null
  flow_status: string
  flow_band_label: string | null
}
const readings = ref<BatchReading[]>([])
const readingsFetchDone = ref(false)

function readingKey(id: string, rs: string | null): string {
  return id + '|' + (rs ?? '')
}
const readingMap = computed(() => {
  const m = new Map<string, BatchReading>()
  for (const r of readings.value) {
    m.set(readingKey(r.id, r.context_reach_slug), r)
  }
  return m
})

function reading(item: ShareItem): BatchReading | undefined {
  // Exact match by (gauge id, reach slug); fall back to gauge-only match if reach context not present.
  return readingMap.value.get(readingKey(item.id, item.rs))
      ?? readingMap.value.get(readingKey(item.id, null))
}

function itemLabel(item: ShareItem): string {
  // Prefer legacy embedded label (older tokens). Otherwise pull from batch response.
  if (item.l) return item.l
  const r = reading(item)
  return r?.context_reach_common_name
      ?? r?.context_reach_full_name
      ?? r?.name
      ?? '…'
}

function bandColor(r: BatchReading | undefined): string {
  if (!r) return '#94a3b8'
  switch (r.flow_status) {
    case 'runnable': return '#22c55e'
    case 'caution':  return '#ef4444'
    case 'flood':    return '#3b82f6'
    default:         return '#94a3b8'
  }
}

function bandBgColor(r: BatchReading | undefined): string {
  if (!r) return 'transparent'
  switch (r.flow_status) {
    case 'runnable': return 'rgba(34,197,94,0.12)'
    case 'caution':  return 'rgba(239,68,68,0.12)'
    case 'flood':    return 'rgba(59,130,246,0.12)'
    default:         return 'transparent'
  }
}

async function fetchReadings() {
  if (!payload.value) return
  // POST is preferred for large lists — avoids URL length limits.
  const ids = payload.value.items.map(it => it.rs ? `${it.id}:${it.rs}` : it.id)
  try {
    const res = await fetch(`${apiBase}/api/v1/gauges/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
    if (res.ok) {
      const data = await res.json() as { features?: { properties: BatchReading }[] }
      readings.value = (data.features ?? []).map(f => f.properties)
    }
  } catch {
    // best-effort; missing readings render as "—"
  } finally {
    readingsFetchDone.value = true
  }
}

function padBase64(s: string): string {
  // atob is strict in some browsers — pad back to multiple of 4
  const r = s.length % 4
  if (r === 2) return s + '=='
  if (r === 3) return s + '='
  return s
}

// Token formats:
//   v1: base64url(JSON)             — payload {v:1, items:[...]}
//   v2: "z" + base64url(gzip(JSON)) — payload {v:2, items:[...]}
async function decodeToken(raw: string): Promise<SharePayload | null> {
  try {
    if (raw.startsWith('z')) {
      const b64 = padBase64(raw.slice(1).replace(/-/g, '+').replace(/_/g, '/'))
      const binary = atob(b64)
      const bytes = Uint8Array.from(binary, c => c.charCodeAt(0))
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
      const json = await new Response(stream).text()
      const parsed = JSON.parse(json) as SharePayload
      if ((parsed.v === 1 || parsed.v === 2) && Array.isArray(parsed.items)) return parsed
      console.warn('share: v2 token parsed but shape rejected', parsed)
      return null
    }
    // Legacy v1: plain base64url JSON
    const b64 = padBase64(raw.replace(/-/g, '+').replace(/_/g, '/'))
    const binary = atob(b64)
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0))
    const json = new TextDecoder().decode(bytes)
    const parsed = JSON.parse(json) as SharePayload
    if (parsed.v === 1 && Array.isArray(parsed.items)) return parsed
    console.warn('share: v1 token parsed but shape rejected', parsed)
    return null
  } catch (err) {
    console.error('share: token decode failed', err, 'raw:', raw.slice(0, 60) + '…')
    return null
  }
}

onMounted(async () => {
  const raw = route.params.token as string
  payload.value = await decodeToken(raw)
  loading.value = false
  if (payload.value) {
    await fetchReadings()
  }
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
