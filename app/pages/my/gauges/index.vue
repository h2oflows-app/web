<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-950">
    <AppHeader />

    <main class="max-w-4xl mx-auto px-4 py-6 space-y-5">

      <div v-if="!isAuthenticated && authReady" class="mt-20 flex flex-col items-center gap-3 text-center">
        <h2 class="text-lg font-semibold">Sign in to view your gauges</h2>
        <NuxtLink to="/login" class="text-sm text-primary-600 dark:text-primary-400 hover:underline">Sign in</NuxtLink>
      </div>

      <div v-else-if="!authReady" class="mt-20 flex justify-center">
        <div class="w-6 h-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
      </div>

      <template v-else>
        <div class="flex items-center justify-between">
          <h1 class="text-xl font-bold text-neutral-900 dark:text-white">My Gauges</h1>
          <UButton
            v-if="activeTab === 'custom'"
            icon="i-heroicons-plus"
            size="sm"
            :disabled="customItems.length >= 25"
            @click="router.push('/my/gauges/new')"
          >
            New gauge
          </UButton>
        </div>

        <!-- Tabs -->
        <div class="flex gap-1 border-b border-neutral-200 dark:border-neutral-700">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px"
            :class="activeTab === tab.key
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'"
            @click="switchTab(tab.key)"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- ── Monitored gauges tab ────────────────────────────── -->
        <template v-if="activeTab === 'monitored'">
          <div v-if="monLoading" class="space-y-2">
            <div v-for="i in 4" :key="i" class="h-12 rounded-lg bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
          </div>

          <div v-else-if="monError" class="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-600 dark:text-red-400">
            {{ monError }}
          </div>

          <div v-else-if="monItems.length === 0" class="mt-10 flex flex-col items-center gap-3 text-center text-neutral-400">
            <svg class="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2a10 10 0 0 1 10 10"/><path d="M12 2a10 10 0 0 0-10 10"/>
              <circle cx="12" cy="12" r="1" fill="currentColor"/><path d="M12 2v2M2 12h2M20 12h2M15.5 8.5 12 12"/>
            </svg>
            <p class="text-sm">No monitored gauges yet. Add a gauge to a run or dashboard to see it here.</p>
          </div>

          <div v-else class="rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
            <table class="w-full text-xs">
              <thead class="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 dark:text-neutral-400">
                <tr>
                  <th class="text-left px-3 py-2 font-medium">Name</th>
                  <th class="text-left px-3 py-2 font-medium hidden sm:table-cell">Source</th>
                  <th class="text-left px-3 py-2 font-medium hidden md:table-cell">Status</th>
                  <th class="text-right px-3 py-2 font-medium hidden md:table-cell">Last reading</th>
                  <th class="text-right px-3 py-2 font-medium hidden sm:table-cell">Failures</th>
                  <th class="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800 bg-white dark:bg-neutral-900">
                <tr v-for="g in monItems" :key="g.id" class="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                  <td class="px-3 py-2">
                    <p class="font-medium text-neutral-800 dark:text-neutral-100 truncate max-w-48">{{ g.name }}</p>
                    <a
                      v-if="g.source_url"
                      :href="g.source_url"
                      target="_blank"
                      rel="noopener"
                      class="text-neutral-400 font-mono hover:underline hover:text-primary-500 transition-colors"
                      @click.stop
                    >{{ g.external_id }}</a>
                    <span v-else class="text-neutral-400 font-mono">{{ g.external_id }}</span>
                  </td>
                  <td class="px-3 py-2 hidden sm:table-cell">
                    <span class="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                      {{ g.source }}
                    </span>
                  </td>
                  <td class="px-3 py-2 hidden md:table-cell">
                    <span :class="['inline-flex items-center rounded-full px-1.5 py-0.5 font-medium text-[10px]', statusClass(g.status)]">
                      {{ g.status }}
                    </span>
                  </td>
                  <td class="px-3 py-2 text-right hidden md:table-cell tabular-nums">
                    <span v-if="g.last_reading_cfs != null" class="text-neutral-700 dark:text-neutral-300 font-medium">
                      {{ g.last_reading_cfs.toLocaleString() }} <span class="text-neutral-400 font-normal">cfs</span>
                    </span>
                    <span v-else-if="g.recent_fail_count > 0" class="text-amber-500">err</span>
                    <em v-else class="text-neutral-400 not-italic">no data</em>
                  </td>
                  <td class="px-3 py-2 text-right hidden sm:table-cell" :class="g.recent_fail_count > 0 ? 'text-amber-500' : 'text-neutral-400'">
                    {{ g.recent_fail_count || '—' }}
                  </td>
                  <td class="px-3 py-2">
                    <UButton
                      size="xs"
                      variant="ghost"
                      color="neutral"
                      :loading="refreshingId === g.id"
                      title="Refresh gauge"
                      @click="refreshGauge(g.id)"
                    >
                      <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M13.5 8A5.5 5.5 0 1 1 10 3.07"/><path d="M10 2v3h3"/>
                      </svg>
                    </UButton>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>

        <!-- ── Custom gauges tab ──────────────────────────────── -->
        <template v-if="activeTab === 'custom'">
          <div v-if="customLoading" class="space-y-2">
            <div v-for="i in 3" :key="i" class="h-16 rounded-lg bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
          </div>

          <div v-else-if="customError" class="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-600 dark:text-red-400">
            {{ customError }}
          </div>

          <div v-else-if="customItems.length === 0" class="mt-10 flex flex-col items-center gap-3 text-center text-neutral-400">
            <svg class="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M9 7h6m0 10v-3m-3 3v-6m-3 6v-1M3 6h18M3 12h18M3 18h18" stroke-linecap="round"/>
            </svg>
            <p class="text-sm">No custom gauges yet. Create a sum or difference of real gauges.</p>
          </div>

          <div v-else class="space-y-2">
            <NuxtLink
              v-for="g in customItems"
              :key="g.id"
              :to="`/my/gauges/${g.slug}`"
              class="block rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-primary-300 dark:hover:border-primary-700 transition-colors p-4"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-neutral-900 dark:text-white truncate">{{ g.name }}</p>
                  <p v-if="g.description" class="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">{{ g.description }}</p>
                </div>
                <div class="shrink-0 text-right">
                  <span v-if="g.last_value_cfs != null" class="text-base font-bold tabular-nums text-neutral-900 dark:text-white">
                    {{ g.last_value_cfs.toLocaleString() }}
                    <span class="text-xs font-normal text-neutral-400">{{ g.unit }}</span>
                  </span>
                  <span v-else class="text-sm text-neutral-400">—</span>
                </div>
              </div>
            </NuxtLink>
          </div>
        </template>
      </template>
    </main>

    <!-- 429 rate-limit dialog -->
    <UModal v-model:open="rateLimitOpen" title="Too many refresh requests">
      <template #body>
        <p class="text-sm text-neutral-600 dark:text-neutral-300">
          Refresh limit reached for this gauge (5 per hour).
          <template v-if="rateLimitNext">
            Try again at <strong>{{ rateLimitNext }}</strong>.
          </template>
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end">
          <UButton @click="rateLimitOpen = false">OK</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const { isAuthenticated, getToken } = useAuth()
const { apiBase } = useRuntimeConfig().public
const router = useRouter()

const authReady = ref(false)

const tabs = [
  { key: 'monitored', label: 'Monitored' },
  { key: 'custom',    label: 'Custom' },
]
const activeTab = ref<'monitored' | 'custom'>('monitored')

// ── Monitored gauges ─────────────────────────────────────────────────────────

interface MonitoredGauge {
  id:               string
  external_id:      string
  source:           string
  name:             string
  lat:              number | null
  lng:              number | null
  status:           string
  last_reading_cfs: number | null
  last_reading_ts:  string | null
  recent_fail_count: number
  source_url:       string | null
}

const monItems   = ref<MonitoredGauge[]>([])
const monLoading = ref(false)
const monError   = ref('')

async function loadMonitored() {
  if (monItems.value.length > 0) return
  monLoading.value = true
  monError.value = ''
  try {
    const token = await getToken()
    const res = await fetch(`${apiBase}/api/v1/me/gauges`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new Error(`${res.status}`)
    const data = await res.json()
    monItems.value = data.gauges ?? []
  } catch (e: any) {
    monError.value = e.message ?? 'Failed to load.'
  } finally {
    monLoading.value = false
  }
}

const refreshingId  = ref<string | null>(null)
const rateLimitOpen = ref(false)
const rateLimitNext = ref<string | null>(null)

async function refreshGauge(id: string) {
  refreshingId.value = id
  try {
    const token = await getToken()
    const res = await fetch(`${apiBase}/api/v1/me/gauges/${id}/refresh`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (res.status === 429) {
      const data = await res.json().catch(() => ({}))
      if (data.next_attempt_ts) {
        rateLimitNext.value = new Date(data.next_attempt_ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      } else {
        rateLimitNext.value = null
      }
      rateLimitOpen.value = true
      return
    }
    if (!res.ok) return
    // Reload to reflect updated reading
    monItems.value = []
    await loadMonitored()
  } finally {
    refreshingId.value = null
  }
}

function statusClass(status: string) {
  switch (status) {
    case 'active':   return 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
    case 'inactive': return 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
    case 'retired':  return 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'
    case 'seasonal': return 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
    default:         return 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
  }
}

// ── Custom gauges ─────────────────────────────────────────────────────────────

interface CustomGaugeSummary {
  id:            string
  slug:          string
  name:          string
  description:   string | null
  unit:          string
  last_value_cfs: number | null
}

const customItems   = ref<CustomGaugeSummary[]>([])
const customLoading = ref(false)
const customError   = ref('')

async function loadCustom() {
  if (customItems.value.length > 0) return
  customLoading.value = true
  customError.value = ''
  try {
    const token = await getToken()
    const res = await fetch(`${apiBase}/api/v1/me/custom-gauges`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new Error(`${res.status}`)
    const data = await res.json()
    customItems.value = data.items ?? []
  } catch (e: any) {
    customError.value = e.message ?? 'Failed to load.'
  } finally {
    customLoading.value = false
  }
}

function switchTab(key: 'monitored' | 'custom') {
  activeTab.value = key
  if (key === 'monitored') loadMonitored()
  else loadCustom()
}

onMounted(async () => {
  authReady.value = true
  if (isAuthenticated.value) await loadMonitored()
})
</script>
