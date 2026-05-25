<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-950 pb-20 sm:pb-0">
    <AppHeader />

    <main class="max-w-3xl mx-auto px-4 py-6 space-y-5">

      <!-- Header -->
      <div class="flex items-center justify-between gap-3">
        <h1 class="text-xl font-bold text-neutral-900 dark:text-white">Community Runs</h1>
        <span class="text-sm text-neutral-400">{{ total }} run<span v-if="total !== 1">s</span></span>
      </div>

      <!-- Search -->
      <input
        v-model="query"
        type="search"
        placeholder="Search by name or river…"
        class="w-full text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg px-3 py-2 text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        @input="onSearch"
      />

      <!-- Loading skeleton -->
      <div v-if="loading && items.length === 0" class="space-y-2">
        <div v-for="i in 6" :key="i" class="h-20 rounded-lg bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
      </div>

      <!-- Error -->
      <div v-else-if="error" class="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-600 dark:text-red-400">
        {{ error }}
      </div>

      <!-- Empty -->
      <div v-else-if="fetchDone && items.length === 0" class="mt-16 flex flex-col items-center gap-3 text-center text-neutral-400">
        <svg class="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M3 6h18M3 12h18M3 18h18" stroke-linecap="round"/>
        </svg>
        <p class="text-sm">No community runs found.</p>
      </div>

      <!-- Run cards -->
      <div v-else class="space-y-2">
        <div
          v-for="run in items"
          :key="run.id"
          class="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4"
        >
          <div class="flex items-start gap-3">
            <!-- Info block -->
            <NuxtLink :to="`/runs/${run.slug}`" class="flex-1 min-w-0 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
              <div class="flex items-center gap-2 flex-wrap">
                <p class="text-sm font-semibold text-neutral-900 dark:text-white truncate">{{ run.name }}</p>
                <span
                  v-if="run.class_min != null || run.class_max != null"
                  class="shrink-0 text-xs text-neutral-500 dark:text-neutral-400"
                >{{ classLabel(run.class_min, run.class_max) }}</span>
              </div>
              <p v-if="run.river_name" class="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">{{ run.river_name }}</p>
              <div class="flex items-center gap-2 mt-1 flex-wrap">
                <span
                  v-if="run.flow_band || run.flow_status !== 'unknown'"
                  class="text-xs font-medium px-2 py-0.5 rounded-full"
                  :class="bandBadgeClass(run.flow_band, run.flow_status)"
                >{{ flowBandLabel(run.flow_band, run.flow_status) }}</span>
                <span v-if="run.current_cfs != null" class="text-xs font-mono text-neutral-500 dark:text-neutral-400">
                  {{ run.current_cfs.toLocaleString() }} cfs
                </span>
                <span v-if="run.author_handle" class="text-xs text-neutral-400">by {{ run.author_handle }}</span>
                <span v-else class="text-xs text-neutral-400 italic">official</span>
              </div>
            </NuxtLink>

            <!-- Add to dashboard -->
            <div v-if="isAuthenticated" class="shrink-0 relative add-anchor" :data-run-id="run.id">
              <button
                class="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-primary-50 dark:hover:bg-primary-950/30 hover:border-primary-300 dark:hover:border-primary-700 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                :disabled="forking === run.id"
                @click.stop="toggleAddMenu(run.id)"
              >
                <svg v-if="forking === run.id" class="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/>
                </svg>
                <svg v-else class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add
              </button>

              <!-- Dashboard picker dropdown -->
              <div
                v-if="addMenuRunId === run.id"
                class="absolute right-0 top-full mt-1 z-40 w-52 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg overflow-hidden"
              >
                <p class="px-3 py-2 text-xs font-semibold text-neutral-400 uppercase tracking-wide">Add to dashboard</p>
                <div class="border-t border-neutral-100 dark:border-neutral-800" />
                <button
                  v-for="db in dashboards"
                  :key="db.id"
                  class="w-full text-left px-3 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors truncate"
                  @click="addToDashboard(run, db.id)"
                >
                  {{ db.name }}
                </button>
                <div v-if="dashboards.length === 0" class="px-3 py-2 text-sm text-neutral-400">No dashboards yet</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Load more -->
      <div v-if="hasMore" class="flex justify-center pt-2">
        <button
          class="px-4 py-2 text-sm font-medium rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          :disabled="loading"
          @click="loadMore"
        >
          <span v-if="loading">Loading…</span>
          <span v-else>Load more</span>
        </button>
      </div>

    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { flowBandLabel } from '~/utils/flowBand'
import { classRange } from '~/utils/classRating'

const { bandBadgeClass } = useFlowBandPalette()
const { isAuthenticated, getToken } = useAuth()
const { apiBase } = useRuntimeConfig().public
const { addUserReachToWatchlist, addReachToWatchlist } = useWatchlistSync()
const { dashboards, load: loadDashboards } = useDashboards()

interface CommunityRun {
  id:            string
  slug:          string
  name:          string
  river_name:    string | null
  class_min:     number | null
  class_max:     number | null
  flow_band:     string | null
  flow_status:   string
  current_cfs:   number | null
  gauge_id:      string | null
  author_handle: string | null
  is_official:   boolean
}

const items    = ref<CommunityRun[]>([])
const loading  = ref(false)
const fetchDone = ref(false)
const error    = ref('')
const hasMore  = ref(false)
const offset   = ref(0)
const query    = ref('')
const total    = computed(() => items.value.length + (hasMore.value ? '+' : ''))

const forking     = ref<string | null>(null)
const addMenuRunId = ref<string | null>(null)

let searchTimer: ReturnType<typeof setTimeout> | null = null

function classLabel(min: number | null, max: number | null): string {
  if (min == null && max == null) return ''
  return classRange(min, max)
}

function toggleAddMenu(runId: string) {
  addMenuRunId.value = addMenuRunId.value === runId ? null : runId
}

function onDocClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (addMenuRunId.value && !target.closest('.add-anchor')) {
    addMenuRunId.value = null
  }
}

function onSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    items.value = []
    offset.value = 0
    fetchDone.value = false
    loadPage()
  }, 300)
}

async function loadPage(append = false) {
  loading.value = true
  error.value = ''
  try {
    const params = new URLSearchParams({ limit: '20', offset: String(offset.value) })
    if (query.value.trim()) params.set('q', query.value.trim())
    const res = await fetch(`${apiBase}/api/v1/user-runs/community?${params}`)
    if (!res.ok) throw new Error(`${res.status}`)
    const data = await res.json()
    if (append) {
      items.value.push(...(data.items ?? []))
    } else {
      items.value = data.items ?? []
    }
    hasMore.value = data.has_more ?? false
    offset.value = data.next_offset ?? offset.value
  } catch (e: any) {
    error.value = e.message ?? 'Failed to load.'
  } finally {
    loading.value = false
    fetchDone.value = true
  }
}

async function loadMore() {
  await loadPage(true)
}

async function addToDashboard(run: CommunityRun, dashboardId: string) {
  addMenuRunId.value = null
  forking.value = run.id

  try {
    const token = await getToken()
    if (!token) return

    // Fork the run into the caller's own user_reaches.
    const res = await fetch(`${apiBase}/api/v1/user-runs/${run.id}/fork`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`fork failed: ${res.status}`)
    const forked = await res.json()

    // Add the forked run to the selected dashboard.
    if (forked.gauge_id) {
      await addUserReachToWatchlist(forked.gauge_id, forked.slug, dashboardId)
    } else {
      await addReachToWatchlist(forked.slug, dashboardId)
    }
  } catch {
    // silently ignore — user can retry via their runs page
  } finally {
    forking.value = null
  }
}

onMounted(async () => {
  document.addEventListener('click', onDocClick)
  loadPage()
  if (isAuthenticated.value) loadDashboards()
})

onUnmounted(() => {
  document.removeEventListener('click', onDocClick)
})
</script>
