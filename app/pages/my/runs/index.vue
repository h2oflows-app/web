<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-950">
    <!-- Backdrop: close any open membership dropdown -->
    <div v-if="openPickerSlug !== null" class="fixed inset-0 z-30" @click.stop="openPickerSlug = null" />

    <AppHeader>
      <span class="text-neutral-300 dark:text-neutral-700 shrink-0">/</span>
      <span class="text-sm font-medium text-neutral-700 dark:text-neutral-200">My Runs</span>
    </AppHeader>

    <!-- Auth loading -->
    <div v-if="!authReady" class="max-w-3xl mx-auto px-4 py-20 flex justify-center">
      <div class="w-6 h-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
    </div>

    <!-- Not signed in -->
    <div v-else-if="!isAuthenticated" class="max-w-3xl mx-auto px-4 py-20 flex flex-col items-center gap-3 text-center">
      <svg class="w-10 h-10 text-neutral-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
      <h2 class="text-lg font-semibold">Sign in to view your runs</h2>
      <NuxtLink to="/login" class="text-sm text-primary-600 dark:text-primary-400 hover:underline">Sign in</NuxtLink>
    </div>

    <!-- Authenticated -->
    <main v-else class="max-w-3xl mx-auto px-4 py-6 pb-24 sm:pb-6 space-y-5">

      <!-- Header row -->
      <div class="flex items-center justify-between gap-3">
        <h1 class="text-xl font-bold text-neutral-900 dark:text-white">My Runs</h1>
        <NuxtLink
          to="/my/runs/new"
          class="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 px-3 py-1.5 text-sm font-medium text-white transition-colors"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
          New run
        </NuxtLink>
      </div>

      <!-- Scope filter: All runs | On a dashboard -->
      <div class="flex gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg w-fit">
        <button
          v-for="tab in SCOPE_TABS"
          :key="tab.key"
          class="px-3 py-1 text-sm font-medium rounded-md transition-colors"
          :class="scopeFilter === tab.key
            ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
            : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'"
          @click="scopeFilter = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="space-y-3">
        <div v-for="i in 3" :key="i" class="h-20 rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
      </div>

      <!-- Error -->
      <div v-else-if="fetchError" class="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-700 dark:text-red-400">
        {{ fetchError }}
      </div>

      <!-- Empty: no runs at all -->
      <div v-else-if="fetchDone && runs.length === 0" class="mt-16 flex flex-col items-center gap-3 text-center text-neutral-400">
        <svg class="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0"/><path d="M3 12h4m10 0h4"/><path d="M12 3v4m0 10v4"/>
        </svg>
        <p class="text-sm">You haven't created any runs yet.</p>
        <NuxtLink to="/my/runs/new" class="text-sm text-primary-600 dark:text-primary-400 hover:underline">Create your first run</NuxtLink>
      </div>

      <!-- Empty: on-dashboard filter with no results -->
      <div v-else-if="fetchDone && scopeFilter === 'on_dashboard' && filteredRuns.length === 0" class="mt-16 flex flex-col items-center gap-3 text-center text-neutral-400">
        <svg class="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
        </svg>
        <p class="text-sm">None of your runs are on a dashboard yet.</p>
        <p class="text-xs">Switch to "All runs" and use the dashboard control on any run to add it.</p>
      </div>

      <!-- Grouped run list -->
      <div v-else-if="fetchDone" class="space-y-2">
        <div v-for="group in groupedRuns" :key="group.name">

          <!-- River group header (collapsible) -->
          <button
            class="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800/60 text-left hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
            @click="toggleRiverCollapse(group.name)"
          >
            <svg
              class="w-3 h-3 shrink-0 text-neutral-400 transition-transform"
              :class="collapsedRivers.has(group.name) ? '-rotate-90' : ''"
              viewBox="0 0 20 20" fill="currentColor"
            >
              <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
            <span class="text-xs font-semibold text-neutral-600 dark:text-neutral-300 flex-1 truncate">{{ group.name }}</span>
            <span class="text-xs text-neutral-400 shrink-0">{{ group.runs.length }}</span>
          </button>

          <!-- Run rows -->
          <div v-show="!collapsedRivers.has(group.name)" class="space-y-1 pl-1">
            <div
              v-for="run in group.runs"
              :key="run.id"
              class="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 px-4 py-3"
            >
              <!-- Top row: name + badges + flow -->
              <div class="flex items-start gap-2 min-w-0">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <NuxtLink
                      :to="`/runs/${run.author_handle ?? 'h2oflows'}/${run.slug}`"
                      class="text-sm font-medium text-neutral-800 dark:text-neutral-100 hover:text-primary-600 dark:hover:text-primary-400 transition-colors truncate"
                    >
                      {{ run.name }}
                    </NuxtLink>

                    <!-- Class -->
                    <span
                      v-if="classDisplay(run)"
                      class="shrink-0 text-xs font-medium text-neutral-500 dark:text-neutral-400"
                    >Class {{ classDisplay(run) }}</span>

                    <!-- Fork badge -->
                    <span
                      v-if="run.is_fork"
                      class="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400"
                    >
                      <svg class="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>
                      </svg>
                      Fork
                    </span>
                  </div>

                  <!-- River + state subtitle -->
                  <p v-if="run.river_name || run.state_abbr" class="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500 truncate">
                    {{ [run.river_name, run.state_abbr].filter(Boolean).join(' · ') }}
                  </p>
                </div>

                <!-- Current flow -->
                <div v-if="run.current_cfs != null" class="shrink-0 text-right">
                  <span
                    class="text-sm font-medium tabular-nums"
                    :class="flowBandCfsClass(run.flow_band, run.flow_status)"
                  >{{ Math.round(run.current_cfs).toLocaleString() }} cfs</span>
                  <span
                    v-if="run.flow_band"
                    class="block text-[10px] font-medium mt-0.5"
                    :class="flowBandBadgeClass(run.flow_band, run.flow_status)"
                  >{{ flowBandLabel(run.flow_band, run.flow_status) }}</span>
                </div>
              </div>

              <!-- Actions row -->
              <div class="mt-2 flex items-center gap-3">
                <!-- Edit link -->
                <NuxtLink
                  :to="`/my/runs/${run.slug}`"
                  class="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  Edit
                </NuxtLink>

                <!-- Dashboard membership control — lazy dropdown, counts from page-level watchlist -->
                <div class="membership-anchor relative" @click.stop>
                  <button
                    class="inline-flex items-center gap-1.5 text-xs transition-colors"
                    :class="dashboardCountFor(run.slug) > 0
                      ? 'text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300'
                      : 'text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400'"
                    @click="togglePicker(run.slug)"
                  >
                    <svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                      <rect x="2" y="3" width="16" height="13" rx="2"/>
                      <path d="M8 16v2M12 16v2M5 19h10"/>
                    </svg>
                    <span v-if="dashboardCountFor(run.slug) > 0" class="tabular-nums">
                      {{ dashboardCountFor(run.slug) }} dashboard{{ dashboardCountFor(run.slug) === 1 ? '' : 's' }}
                    </span>
                    <span v-else>Add to dashboard</span>
                  </button>

                  <!-- Lazy-mounted dashboard picker dropdown (only renders when open) -->
                  <div
                    v-if="openPickerSlug === run.slug"
                    class="absolute left-0 top-full mt-1 z-40 min-w-44 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg overflow-hidden"
                  >
                    <div v-if="db.dashboards.value.length === 0" class="px-3 py-2 text-xs text-neutral-400">No dashboards yet.</div>
                    <button
                      v-for="d in db.dashboards.value"
                      :key="d.id"
                      class="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                      :disabled="togglingDashboard === d.id + ':' + run.slug"
                      @click="toggleDashboard(run, d.id)"
                    >
                      <svg
                        class="w-3.5 h-3.5 shrink-0 transition-colors"
                        :class="dashboardIdsFor(run.slug).has(d.id) ? 'text-primary-500' : 'text-neutral-300 dark:text-neutral-600'"
                        viewBox="0 0 20 20" fill="currentColor"
                      >
                        <path v-if="dashboardIdsFor(run.slug).has(d.id)" fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                        <circle v-else cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
                      </svg>
                      <span class="truncate text-neutral-700 dark:text-neutral-300">{{ d.name }}</span>
                      <svg v-if="togglingDashboard === d.id + ':' + run.slug" class="w-3 h-3 ml-auto animate-spin text-neutral-400 shrink-0" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="31.4" stroke-dashoffset="10" stroke-linecap="round"/></svg>
                    </button>
                  </div>
                </div>

                <!-- Fork count -->
                <span v-if="run.fork_count > 0" class="ml-auto text-xs text-neutral-400">
                  {{ run.fork_count }} fork{{ run.fork_count === 1 ? '' : 's' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </main>
  </div>
</template>

<script setup lang="ts">
import { flowBandLabel, flowBandCfsClass, flowBandBadgeClass } from '~/utils/flowBand'
import { classRange } from '~/utils/classRating'

definePageMeta({ ssr: false })

const config = useRuntimeConfig()
const { isAuthenticated, getToken } = useAuth()
const toast = useToast()

// ── Auth gate ──────────────────────────────────────────────────────────────────
const authReady = ref(false)
onMounted(() => { authReady.value = true })

// ── Data types ─────────────────────────────────────────────────────────────────
interface MyRun {
  id: string
  slug: string
  name: string
  long_name: string | null
  river_name: string | null
  state_abbr: string | null
  basin_group: string | null
  class_min: number | null
  class_max: number | null
  current_cfs: number | null
  flow_band: string | null
  flow_status: string | null
  is_fork: boolean
  fork_count: number
  author_handle: string | null
  created_at: string
}

interface WatchlistItem {
  kind: string
  reach_slug: string
  dashboard_id: string
  referenced_user_reach_id: string | null
}

// ── State ──────────────────────────────────────────────────────────────────────
const runs       = ref<MyRun[]>([])
const watchlist  = ref<WatchlistItem[]>([])
const loading    = ref(false)
const fetchError = ref('')
const fetchDone  = ref(false)

// ── Scope filter ───────────────────────────────────────────────────────────────
const SCOPE_TABS = [
  { key: 'all',          label: 'All runs' },
  { key: 'on_dashboard', label: 'On a dashboard' },
] as const
type ScopeKey = typeof SCOPE_TABS[number]['key']
const scopeFilter = ref<ScopeKey>('all')

// ── Load data ──────────────────────────────────────────────────────────────────
const db = useDashboards()

async function load() {
  loading.value    = true
  fetchError.value = ''
  fetchDone.value  = false
  try {
    const token = await getToken()
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`

    const [runsRes, watchlistRes] = await Promise.all([
      fetch(`${config.public.apiBase}/api/v1/me/runs`, { headers }),
      fetch(`${config.public.apiBase}/api/v1/watchlist`, { headers }),
    ])

    if (!runsRes.ok) throw new Error(`HTTP ${runsRes.status}`)
    runs.value = await runsRes.json()

    if (watchlistRes.ok) {
      const wl = await watchlistRes.json()
      watchlist.value = wl.items ?? []
    }

    if (!db.loaded.value) db.load()
  } catch (e: any) {
    fetchError.value = e?.message ?? 'Failed to load runs'
  } finally {
    loading.value   = false
    fetchDone.value = true
  }
}

watch(isAuthenticated, (v) => { if (v) load() }, { immediate: true })

// ── Watchlist helpers — derived from single page-level fetch (no N fetches) ───
// Returns Set of dashboard_ids for own-run watchlist entries for a given slug.
function dashboardIdsFor(slug: string): Set<string> {
  const ids = new Set<string>()
  for (const item of watchlist.value) {
    if (item.reach_slug === slug && item.referenced_user_reach_id == null && item.dashboard_id) {
      ids.add(item.dashboard_id)
    }
  }
  return ids
}

function dashboardCountFor(slug: string): number {
  return dashboardIdsFor(slug).size
}

// Set of run slugs that appear on at least one dashboard (for scope filter).
const ownedSlugsOnDashboard = computed((): Set<string> => {
  const slugs = new Set<string>()
  for (const item of watchlist.value) {
    if (item.referenced_user_reach_id == null && item.dashboard_id && item.reach_slug) {
      slugs.add(item.reach_slug)
    }
  }
  return slugs
})

// ── Scope filter ───────────────────────────────────────────────────────────────
const filteredRuns = computed((): MyRun[] => {
  if (scopeFilter.value === 'on_dashboard') {
    return runs.value.filter(r => ownedSlugsOnDashboard.value.has(r.slug))
  }
  return runs.value
})

// ── River grouping (mirrors explore filteredSidebarGroups pattern) ─────────────
interface RunGroup { name: string; runs: MyRun[] }

const groupedRuns = computed((): RunGroup[] => {
  const grouped = new Map<string, MyRun[]>()
  for (const r of filteredRuns.value) {
    const key = r.river_name ?? 'No River'
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(r)
  }
  return [...grouped.entries()]
    .sort(([a], [b]) => a === 'No River' ? 1 : b === 'No River' ? -1 : a.localeCompare(b))
    .map(([name, runs]) => ({ name, runs }))
})

// ── Collapsible river groups ───────────────────────────────────────────────────
const collapsedRivers = ref(new Set<string>())

function toggleRiverCollapse(name: string) {
  const next = new Set(collapsedRivers.value)
  if (next.has(name)) next.delete(name)
  else                next.add(name)
  collapsedRivers.value = next
}

// ── Lazy membership picker ────────────────────────────────────────────────────
const openPickerSlug  = ref<string | null>(null)
const togglingDashboard = ref<string | null>(null) // "<dashboardId>:<slug>"

function togglePicker(slug: string) {
  openPickerSlug.value = openPickerSlug.value === slug ? null : slug
}

async function toggleDashboard(run: MyRun, dashboardId: string) {
  const key = `${dashboardId}:${run.slug}`
  togglingDashboard.value = key
  try {
    const token = await getToken()
    if (!token) return
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` }
    const isMember = dashboardIdsFor(run.slug).has(dashboardId)

    if (isMember) {
      const db_ = encodeURIComponent(dashboardId)
      await fetch(
        `${config.public.apiBase}/api/v1/watchlist/${encodeURIComponent(run.slug)}?kind=reach&dashboard_id=${db_}`,
        { method: 'DELETE', headers }
      ).catch(() => {})
      // Optimistic: remove from local watchlist
      watchlist.value = watchlist.value.filter(
        item => !(item.reach_slug === run.slug && item.dashboard_id === dashboardId && item.referenced_user_reach_id == null)
      )
      toast.add({ title: 'Removed from dashboard', color: 'neutral' })
    } else {
      await fetch(`${config.public.apiBase}/api/v1/watchlist`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reach_slug: run.slug, dashboard_id: dashboardId }),
      }).catch(() => {})
      // Optimistic: add to local watchlist
      watchlist.value = [
        ...watchlist.value,
        { kind: 'reach', reach_slug: run.slug, dashboard_id: dashboardId, referenced_user_reach_id: null }
      ]
      toast.add({ title: 'Added to dashboard', color: 'success' })
    }
  } finally {
    togglingDashboard.value = null
  }
}

// Close picker on outside click (delegated via backdrop div at top).
function onDocClick(e: MouseEvent) {
  if (openPickerSlug.value && !(e.target as HTMLElement).closest('.membership-anchor')) {
    openPickerSlug.value = null
  }
}
onMounted(() => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))

// ── Display helpers ────────────────────────────────────────────────────────────
function classDisplay(run: MyRun): string {
  return classRange(run.class_min, run.class_max)
}
</script>
