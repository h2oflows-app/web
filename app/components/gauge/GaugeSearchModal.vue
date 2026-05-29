<template>
  <UModal v-model:open="open" title="Add a Run" :ui="{ width: 'max-w-2xl' }">
    <template #body>
      <div class="space-y-3">

        <!-- Dashboard picker — multi-dash users -->
        <div
          v-if="db.dashboards.value.length > 1"
          class="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-primary-50 dark:bg-primary-950/30 border border-primary-100 dark:border-primary-900/40"
        >
          <div class="flex items-center gap-2 min-w-0">
            <svg class="w-4 h-4 text-primary-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="4" rx="1"/><rect x="14" y="10" width="7" height="11" rx="1"/><rect x="3" y="13" width="7" height="8" rx="1"/>
            </svg>
            <span class="text-xs text-neutral-600 dark:text-neutral-300 shrink-0">Add to:</span>
          </div>
          <select
            v-model="selectedDashboardId"
            class="flex-1 max-w-[60%] rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm text-neutral-700 dark:text-neutral-200 px-2 py-1"
          >
            <option v-for="d in db.dashboards.value" :key="d.id" :value="d.id">{{ d.name }}</option>
          </select>
        </div>

        <!-- 2-tab bar (V13) -->
        <div class="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1 self-start">
          <button
            v-for="t in TABS" :key="t.key"
            class="px-3 py-1 text-xs font-medium rounded-md transition-colors"
            :class="activeTab === t.key
              ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm'
              : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'"
            @click="setTab(t.key)"
          >{{ t.label }}</button>
        </div>

        <!-- ── My Runs tab (V13: client-side filter, no API) ── -->
        <template v-if="activeTab === 'mine'">
          <input
            v-model="myRunsQuery"
            type="search"
            placeholder="Filter your runs…"
            class="w-full text-sm bg-neutral-100 dark:bg-neutral-900 rounded-md px-3 py-2 text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <div v-if="myRunsLoading" class="space-y-2 py-2">
            <div v-for="i in 4" :key="i" class="flex items-center gap-3 px-2 py-2.5">
              <div class="flex-1 h-4 rounded bg-neutral-100 dark:bg-neutral-800 animate-pulse"/>
              <div class="h-7 w-16 rounded bg-neutral-100 dark:bg-neutral-800 animate-pulse"/>
            </div>
          </div>
          <div v-else-if="filteredMyRuns.length === 0 && myRuns.length === 0" class="text-center py-10 text-neutral-400 text-sm">
            No runs yet.
            <NuxtLink to="/my/runs/new" class="ml-1 text-primary-500 hover:underline font-medium" @click="open = false">Create one →</NuxtLink>
          </div>
          <div v-else-if="filteredMyRuns.length === 0" class="text-center py-10 text-neutral-400 text-sm">
            No runs matching "{{ myRunsQuery }}"
          </div>
          <ul v-else class="divide-y divide-neutral-100 dark:divide-neutral-800 max-h-[55vh] overflow-y-auto">
            <li
              v-for="r in filteredMyRuns"
              :key="r.id"
              class="flex items-center gap-3 py-2.5 px-2 hover:bg-primary-50 dark:hover:bg-primary-950/30 rounded-lg transition-colors"
            >
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{{ r.name }}</p>
                <div class="flex items-center gap-1.5 mt-0.5">
                  <span v-if="r.river_name" class="text-xs text-neutral-400 truncate">{{ r.river_name }}</span>
                  <span v-if="r.class_max" class="text-xs text-neutral-400">· {{ classRange(r.class_min, r.class_max) }}</span>
                </div>
              </div>
              <span v-if="r.current_cfs != null" class="text-sm font-semibold tabular-nums text-neutral-700 dark:text-neutral-300 shrink-0">
                {{ Math.round(r.current_cfs).toLocaleString() }}<span class="text-xs font-normal text-neutral-400 ml-0.5">cfs</span>
              </span>
              <button
                class="shrink-0 px-2.5 py-1 rounded-md text-xs font-medium bg-primary-600 hover:bg-primary-700 text-white transition-colors"
                :disabled="addingMineId === r.id"
                @click="addMyRun(r)"
              >
                <span v-if="addingMineId === r.id" class="flex items-center gap-1">
                  <span class="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                </span>
                <span v-else>Add</span>
              </button>
            </li>
          </ul>
        </template>

        <!-- ── Discover tab (V14-V19, V23) ── -->
        <template v-else>
          <!-- Search input -->
          <input
            v-model="discoverQuery"
            type="search"
            placeholder="Search runs by name, river…"
            class="w-full text-sm bg-neutral-100 dark:bg-neutral-900 rounded-md px-3 py-2 text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
            @input="onDiscoverInput"
          />

          <!-- Filter bar (V19) -->
          <div class="flex flex-wrap items-center gap-2">
            <input
              v-model.number="discoverMinClass"
              type="number" min="1" max="6" step="0.5"
              placeholder="Min class"
              class="w-24 text-xs bg-neutral-100 dark:bg-neutral-900 rounded-md px-2 py-1.5 text-neutral-700 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
              @change="loadDiscoverRuns()"
            />
            <input
              v-model.number="discoverMaxClass"
              type="number" min="1" max="6" step="0.5"
              placeholder="Max class"
              class="w-24 text-xs bg-neutral-100 dark:bg-neutral-900 rounded-md px-2 py-1.5 text-neutral-700 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
              @change="loadDiscoverRuns()"
            />
            <button
              class="px-2.5 py-1.5 text-xs rounded-md border transition-colors"
              :class="discoverHasGauge
                ? 'bg-primary-100 dark:bg-primary-900/50 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300'
                : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600'"
              @click="discoverHasGauge = !discoverHasGauge; loadDiscoverRuns()"
            >Has gauge</button>
            <input
              v-model="discoverHandle"
              type="text"
              placeholder="@handle"
              class="w-28 text-xs bg-neutral-100 dark:bg-neutral-900 rounded-md px-2 py-1.5 text-neutral-700 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
              @input="onDiscoverInput"
            />
          </div>

          <!-- Results + optional preview side panel -->
          <div class="flex gap-3 min-h-0">
            <!-- Results list -->
            <div class="flex-1 min-w-0">
              <div v-if="discoverLoading" class="space-y-2 py-2">
                <div v-for="i in 5" :key="i" class="flex items-center gap-3 px-2 py-2.5">
                  <div class="flex-1 space-y-2">
                    <div class="h-4 w-3/4 rounded bg-neutral-100 dark:bg-neutral-800 animate-pulse"/>
                    <div class="h-3 w-1/2 rounded bg-neutral-100 dark:bg-neutral-800 animate-pulse"/>
                  </div>
                  <div class="h-7 w-20 rounded bg-neutral-100 dark:bg-neutral-800 animate-pulse"/>
                </div>
              </div>
              <div v-else-if="discoverRuns.length === 0" class="text-center py-10 text-neutral-400 text-sm">
                {{ discoverQuery.length >= 2 ? `No runs matching "${discoverQuery}"` : 'No runs found. Try a different search.' }}
              </div>
              <ul v-else class="divide-y divide-neutral-100 dark:divide-neutral-800 max-h-[50vh] overflow-y-auto">
                <li
                  v-for="run in discoverRuns"
                  :key="run.id"
                  class="py-2.5 px-2 rounded-lg transition-colors"
                  :class="previewRun?.id === run.id ? 'bg-primary-50/70 dark:bg-primary-950/30' : 'hover:bg-neutral-50 dark:hover:bg-neutral-900/50'"
                >
                  <div class="flex items-start gap-3">
                    <div class="min-w-0 flex-1">
                      <!-- Handle badge (V16) -->
                      <div class="flex items-center gap-1.5 mb-0.5">
                        <span
                          class="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                          :class="run.is_official
                            ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'"
                        >
                          <span v-if="run.is_official">⭐</span>
                          {{ run.is_official ? 'H2OFlows' : `@${run.handle}` }}
                        </span>
                        <!-- Fork attribution (V23) -->
                        <span v-if="run.original_author_handle" class="text-[10px] text-neutral-400 dark:text-neutral-500">
                          Forked from @{{ run.original_author_handle }}
                        </span>
                      </div>
                      <p class="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{{ run.name }}</p>
                      <!-- Meta row (V16) -->
                      <div class="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                        <span v-if="run.class_min || run.class_max" class="text-xs text-neutral-500 dark:text-neutral-400">
                          {{ classRange(run.class_min, run.class_max) }}
                        </span>
                        <span v-if="run.length_mi" class="text-xs text-neutral-400">{{ run.length_mi.toFixed(1) }}mi</span>
                        <span v-if="run.gauge_name" class="text-xs text-neutral-400 truncate max-w-30">📍 {{ run.gauge_name }}</span>
                        <span class="text-xs text-neutral-400">{{ run.upvote_count }} ▲</span>
                        <span v-if="run.last_forked_at" class="text-xs text-neutral-300 dark:text-neutral-600">{{ fmtDate(run.last_forked_at) }}</span>
                      </div>
                    </div>

                    <!-- Action buttons -->
                    <div class="flex items-center gap-1 shrink-0">
                      <!-- Preview button (V18) -->
                      <button
                        class="p-1.5 rounded-md text-xs text-neutral-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-950/30 transition-colors"
                        :class="previewRun?.id === run.id ? 'text-primary-500 bg-primary-50 dark:bg-primary-950/30' : ''"
                        title="Preview"
                        @click="previewRun = previewRun?.id === run.id ? null : run"
                      >
                        <svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                          <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/>
                        </svg>
                      </button>
                      <!-- Fork & Add split button (V17) -->
                      <button
                        class="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white transition-colors"
                        :disabled="forkingId === run.id"
                        @click="startFork(run)"
                      >
                        <span v-if="forkingId === run.id" class="flex items-center gap-1">
                          <span class="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                        </span>
                        <template v-else>
                          Fork &amp; Add to
                          <svg class="w-2.5 h-2.5 ml-0.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd"/>
                          </svg>
                        </template>
                      </button>
                    </div>
                  </div>

                  <!-- Inline dashboard picker — shown after fork (V17) -->
                  <div
                    v-if="forkedForRunId === run.id && pendingForkedSlug"
                    class="mt-2 pl-2 flex flex-wrap items-center gap-2"
                  >
                    <span class="text-xs text-neutral-500">Add to dashboard:</span>
                    <button
                      v-for="d in db.dashboards.value"
                      :key="d.id"
                      class="px-2 py-1 rounded-md text-xs border transition-colors"
                      :class="addingToDashId === d.id
                        ? 'bg-primary-100 border-primary-300 text-primary-700 cursor-default'
                        : 'border-neutral-200 dark:border-neutral-700 hover:border-primary-400 hover:bg-primary-50/60 text-neutral-600 dark:text-neutral-300'"
                      :disabled="addingToDashId != null"
                      @click="confirmForkDashboard(d.id)"
                    >{{ d.name }}</button>
                    <button class="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 ml-1" @click="cancelFork">Cancel</button>
                  </div>
                </li>
              </ul>

              <!-- Load more -->
              <div v-if="discoverHasMore && !discoverLoading" class="pt-2 text-center">
                <button
                  class="text-xs text-primary-500 hover:text-primary-700 dark:text-primary-400 font-medium"
                  @click="loadMore"
                >Load more</button>
              </div>
            </div>

            <!-- Preview side panel (V18) -->
            <div
              v-if="previewRun"
              class="w-52 shrink-0 border-l border-neutral-100 dark:border-neutral-800 pl-3 space-y-3 max-h-[50vh] overflow-y-auto"
            >
              <div class="flex items-center justify-between">
                <p class="text-xs font-semibold text-neutral-700 dark:text-neutral-200 truncate">{{ previewRun.name }}</p>
                <button class="shrink-0 text-neutral-300 hover:text-neutral-500 dark:text-neutral-600 dark:hover:text-neutral-400" @click="previewRun = null">
                  <svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
                </button>
              </div>
              <dl class="space-y-1.5 text-xs">
                <div class="flex justify-between gap-2">
                  <dt class="text-neutral-400 shrink-0">Author</dt>
                  <dd class="text-neutral-700 dark:text-neutral-200 text-right truncate">
                    {{ previewRun.is_official ? '⭐ H2OFlows' : `@${previewRun.handle}` }}
                  </dd>
                </div>
                <div v-if="previewRun.class_min || previewRun.class_max" class="flex justify-between gap-2">
                  <dt class="text-neutral-400 shrink-0">Class</dt>
                  <dd class="text-neutral-700 dark:text-neutral-200">{{ classRange(previewRun.class_min, previewRun.class_max) }}</dd>
                </div>
                <div v-if="previewRun.length_mi" class="flex justify-between gap-2">
                  <dt class="text-neutral-400 shrink-0">Length</dt>
                  <dd class="text-neutral-700 dark:text-neutral-200">{{ previewRun.length_mi.toFixed(1) }} mi</dd>
                </div>
                <div v-if="previewRun.gauge_name" class="flex justify-between gap-2">
                  <dt class="text-neutral-400 shrink-0">Gauge</dt>
                  <dd class="text-neutral-700 dark:text-neutral-200 truncate text-right">{{ previewRun.gauge_name }}</dd>
                </div>
                <div class="flex justify-between gap-2">
                  <dt class="text-neutral-400 shrink-0">Upvotes</dt>
                  <dd class="text-neutral-700 dark:text-neutral-200">{{ previewRun.upvote_count }}</dd>
                </div>
                <div v-if="previewRun.original_author_handle" class="flex justify-between gap-2">
                  <dt class="text-neutral-400 shrink-0">Forked from</dt>
                  <dd class="text-neutral-700 dark:text-neutral-200 truncate text-right">@{{ previewRun.original_author_handle }}</dd>
                </div>
                <div v-if="previewRun.last_forked_at" class="flex justify-between gap-2">
                  <dt class="text-neutral-400 shrink-0">Last forked</dt>
                  <dd class="text-neutral-700 dark:text-neutral-200">{{ fmtDate(previewRun.last_forked_at) }}</dd>
                </div>
                <div class="flex justify-between gap-2">
                  <dt class="text-neutral-400 shrink-0">Put-in</dt>
                  <dd class="text-neutral-700 dark:text-neutral-200 font-mono">{{ previewRun.put_in_lat.toFixed(3) }}, {{ previewRun.put_in_lng.toFixed(3) }}</dd>
                </div>
              </dl>
            </div>
          </div>
        </template>

      </div>
    </template>
    <template #footer>
      <div class="flex justify-end">
        <UButton variant="ghost" color="neutral" size="sm" @click="open = false">Close</UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { WatchedGauge } from '~/stores/watchlist'
import { classRange } from '~/utils/classRating'

const open = defineModel<boolean>('open', { default: false })

const props = withDefaults(defineProps<{
  initialTab?: 'mine' | 'discover'
}>(), { initialTab: 'mine' })

interface AddedExternalPayload {
  kind: 'reach' | 'custom_gauge'
  reachId?: string
  reachSlug?: string
  customGaugeId?: string
}
const emit = defineEmits<{
  (e: 'add', gauge: Omit<WatchedGauge, 'watchState' | 'activeSince'>, dashboardId: string | null): void
  (e: 'addedExternal', payload?: AddedExternalPayload): void
}>()

const { apiBase } = useRuntimeConfig().public
const { getToken } = useAuth()
const db = useDashboards()
const { addReachToWatchlist } = useWatchlistSync()

onMounted(() => { if (!db.loaded.value) db.load() })

const selectedDashboardId = ref<string | null>(db.activeDashboardId.value)
watch(() => db.activeDashboardId.value, (id) => {
  if (!selectedDashboardId.value || !db.dashboards.value.find(d => d.id === selectedDashboardId.value)) {
    selectedDashboardId.value = id
  }
})

// ── Tabs (V13) ────────────────────────────────────────────────────────────────
type TabKey = 'mine' | 'discover'
const TABS: { key: TabKey; label: string }[] = [
  { key: 'mine',     label: 'My Runs' },
  { key: 'discover', label: 'Discover' },
]
const activeTab = ref<TabKey>(props.initialTab)

function setTab(key: TabKey) {
  activeTab.value = key
  if (key === 'mine' && myRuns.value.length === 0 && !myRunsLoading.value) loadMyRuns()
  if (key === 'discover' && discoverRuns.value.length === 0) loadDiscoverRuns()
}

watch(open, (v) => {
  if (!v) {
    activeTab.value = props.initialTab
    myRunsQuery.value = ''
    discoverQuery.value = ''
    discoverRuns.value = []
    previewRun.value = null
    forkedForRunId.value = null
    pendingForkedSlug.value = null
  } else {
    if (db.activeDashboardId.value) selectedDashboardId.value = db.activeDashboardId.value
    if (activeTab.value === 'mine') loadMyRuns()
    else loadDiscoverRuns()
  }
})

// ── My Runs tab (V13) ─────────────────────────────────────────────────────────
interface MyRunSummary {
  id: string; slug: string; name: string
  river_name: string | null
  class_min: number | null; class_max: number | null
  current_cfs: number | null
  gauge_id: string | null
}
const myRuns        = ref<MyRunSummary[]>([])
const myRunsLoading = ref(false)
const myRunsQuery   = ref('')
const addingMineId  = ref<string | null>(null)

const filteredMyRuns = computed((): MyRunSummary[] => {
  const q = myRunsQuery.value.trim().toLowerCase()
  if (!q) return myRuns.value
  return myRuns.value.filter(r =>
    r.name.toLowerCase().includes(q) ||
    (r.river_name?.toLowerCase().includes(q) ?? false)
  )
})

async function loadMyRuns() {
  myRunsLoading.value = true
  try {
    const token = await getToken()
    if (!token) return
    const res = await fetch(`${apiBase}/api/v1/me/reaches`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) myRuns.value = await res.json() ?? []
  } catch { /* non-fatal */ } finally {
    myRunsLoading.value = false
  }
}

async function addMyRun(r: MyRunSummary) {
  addingMineId.value = r.id
  try {
    await addReachToWatchlist(r.slug, selectedDashboardId.value)
    emit('addedExternal', { kind: 'reach', reachId: r.id, reachSlug: r.slug })
    open.value = false
  } finally {
    addingMineId.value = null
  }
}

// ── Discover tab (V14-V19, V23) ───────────────────────────────────────────────
interface DiscoverRun {
  id: string; slug: string; name: string; handle: string
  is_official: boolean
  class_min: number | null; class_max: number | null
  length_mi: number | null
  upvote_count: number
  last_forked_at: string | null
  gauge_name: string | null
  put_in_lng: number; put_in_lat: number
  original_author_handle: string | null
}

const discoverRuns     = ref<DiscoverRun[]>([])
const discoverLoading  = ref(false)
const discoverHasMore  = ref(false)
const discoverOffset   = ref(0)
const discoverQuery    = ref('')
const discoverMinClass = ref<number | null>(null)
const discoverMaxClass = ref<number | null>(null)
const discoverHasGauge = ref(false)
const discoverHandle   = ref('')
const previewRun       = ref<DiscoverRun | null>(null)

let discoverDebounce: ReturnType<typeof setTimeout> | null = null
function onDiscoverInput() {
  if (discoverDebounce) clearTimeout(discoverDebounce)
  discoverDebounce = setTimeout(loadDiscoverRuns, 350)
}

async function loadDiscoverRuns(append = false) {
  if (!append) { discoverOffset.value = 0; discoverRuns.value = [] }
  discoverLoading.value = true
  try {
    const params = new URLSearchParams({ limit: '20', offset: String(discoverOffset.value) })
    if (discoverQuery.value.trim()) params.set('q', discoverQuery.value.trim())
    if (discoverMinClass.value != null) params.set('min_class', String(discoverMinClass.value))
    if (discoverMaxClass.value != null) params.set('max_class', String(discoverMaxClass.value))
    if (discoverHasGauge.value) params.set('has_gauge', 'true')
    if (discoverHandle.value.trim()) params.set('handle', discoverHandle.value.trim().replace(/^@/, ''))
    const res = await fetch(`${apiBase}/api/v1/discover/runs?${params}`)
    if (!res.ok) return
    const data = await res.json()
    const items: DiscoverRun[] = data.items ?? []
    discoverRuns.value = append ? [...discoverRuns.value, ...items] : items
    discoverHasMore.value = data.has_more ?? false
    discoverOffset.value += items.length
  } catch { /* non-fatal */ } finally {
    discoverLoading.value = false
  }
}

async function loadMore() {
  await loadDiscoverRuns(true)
}

// ── Fork flow (V17) ───────────────────────────────────────────────────────────
const forkingId        = ref<string | null>(null)
const forkedForRunId   = ref<string | null>(null)
const pendingForkedSlug = ref<string | null>(null)
const addingToDashId   = ref<string | null>(null)

async function startFork(run: DiscoverRun) {
  forkingId.value = run.id
  forkedForRunId.value = null
  pendingForkedSlug.value = null
  try {
    const token = await getToken()
    if (!token) return
    // curated runs live in reaches table — use slug-based fork endpoint
    // community runs live in user_reaches — use id-based fork endpoint
    const url = run.is_official
      ? `${apiBase}/api/v1/me/runs/fork-reach/${run.slug}`
      : `${apiBase}/api/v1/user-runs/${run.id}/fork`
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return
    const forked = await res.json()
    pendingForkedSlug.value = forked.slug ?? forked.id
    if (db.dashboards.value.length <= 1) {
      await confirmForkDashboard(selectedDashboardId.value)
    } else {
      forkedForRunId.value = run.id
    }
  } finally {
    forkingId.value = null
  }
}

async function confirmForkDashboard(dashId: string | null) {
  if (!pendingForkedSlug.value) return
  addingToDashId.value = dashId
  try {
    await addReachToWatchlist(pendingForkedSlug.value, dashId)
    emit('addedExternal', { kind: 'reach', reachSlug: pendingForkedSlug.value })
    open.value = false
  } finally {
    addingToDashId.value = null
    forkedForRunId.value = null
    pendingForkedSlug.value = null
  }
}

function cancelFork() {
  forkedForRunId.value = null
  pendingForkedSlug.value = null
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })
  } catch { return '' }
}
</script>
