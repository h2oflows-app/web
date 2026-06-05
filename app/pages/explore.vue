<template>
  <div class="h-dvh flex flex-col overflow-hidden bg-white dark:bg-neutral-950">

    <!-- Backdrop: consumes the click that closes the dashboard dropdown so it doesn't hit reach rows -->
    <div v-if="dropdownSlug !== null" class="fixed inset-0 z-30" @click.stop="dropdownSlug = null" />

    <!-- Sharing banner — one-time, auth only, localStorage dismissed flag -->
    <div v-if="showSharingBanner" class="shrink-0 bg-blue-50 dark:bg-blue-950 border-b border-blue-200 dark:border-blue-800 px-4 py-2 flex items-center justify-between gap-4 text-sm">
      <p class="text-blue-800 dark:text-blue-200 text-center flex-1">
        Your runs help others discover paddleable water.
        <span class="font-medium">Mark any run private from its edit page.</span>
      </p>
      <button class="shrink-0 text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-100 font-medium transition-colors" @click="dismissSharingBanner">Dismiss</button>
    </div>

    <!-- Demo banner -->
    <div v-if="showDemoBanner" class="shrink-0 bg-amber-50 dark:bg-amber-950 border-b border-amber-200 dark:border-amber-800 px-4 py-2 flex items-center justify-between gap-4 text-sm">
      <p class="text-amber-800 dark:text-amber-200 text-center flex-1">
        <span class="font-semibold">Demo only.</span>
        River data is AI-seeded and unverified — do not use for trip planning or safety decisions.
      </p>
      <button class="shrink-0 text-amber-600 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-100 font-medium transition-colors" @click="dismissBanner">Dismiss</button>
    </div>

    <AppHeader class="shrink-0" />

    <!-- Split-pane body -->
    <div class="flex-1 overflow-hidden flex relative">

      <!-- ── Left panel ───────────────────────────────────────────────────────── -->
      <aside
        class="shrink-0 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex flex-col overflow-hidden transition-all"
        :class="listVisible
          ? 'absolute sm:relative inset-0 sm:inset-auto z-30 sm:z-auto w-full sm:w-80'
          : 'hidden sm:flex sm:w-80'"
      >
        <!-- Tab segmented control -->
        <div class="shrink-0 px-3 pt-2.5 pb-0">
          <div class="flex rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden text-xs font-medium">
            <button
              v-for="tab in TABS" :key="tab.id"
              class="flex-1 py-1.5 transition-colors"
              :class="activeTab === tab.id
                ? 'bg-primary-600 text-white'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-900'"
              @click="setTab(tab.id)"
            >{{ tab.label }}</button>
          </div>
        </div>

        <!-- Search + mobile map toggle (all tabs) -->
        <div class="px-3 py-2 shrink-0 flex items-center gap-2">
          <input
            v-model="query"
            type="search"
            placeholder="Search runs, rivers…"
            class="flex-1 text-sm bg-neutral-100 dark:bg-neutral-900 rounded-md px-3 py-1.5 text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <button
            class="sm:hidden shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-primary-500 hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-950/50 transition-colors"
            aria-label="Show map"
            @click="listVisible = false"
          >
            <svg class="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 5l-5 5 5 5"/>
            </svg>
            Map
          </button>
        </div>

        <!-- Zoom & Filter toggle -->
        <div class="px-3 pb-1.5 shrink-0 flex items-center justify-between">
          <label class="flex items-center gap-1.5 cursor-pointer select-none text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200">
            <input
              v-model="zoomFilter"
              type="checkbox"
              class="rounded w-3 h-3 accent-primary-500 cursor-pointer"
            />
            Zoom &amp; Filter
          </label>
          <span class="text-xs text-neutral-400 tabular-nums">{{ sidebarReaches.length }} runs</span>
        </div>

        <!-- Dashboard filter (My Runs tab) -->
        <div v-if="activeTab === 'mine'" class="shrink-0 border-b border-neutral-100 dark:border-neutral-800 px-3 pb-2 space-y-1">
          <div v-if="db.dashboards.value.length === 0" class="text-xs text-neutral-400 py-1">No dashboards yet.</div>
          <button
            v-for="dashboard in db.dashboards.value"
            :key="dashboard.id"
            class="w-full flex items-center gap-2 py-1 text-xs text-left"
            @click="toggleDashboardFilter(dashboard.id)"
          >
            <svg
              class="w-3.5 h-3.5 shrink-0"
              :class="selectedDashboardIds.has(dashboard.id) ? 'text-primary-500' : 'text-neutral-300 dark:text-neutral-600'"
              viewBox="0 0 20 20" fill="currentColor"
            >
              <path v-if="selectedDashboardIds.has(dashboard.id)" fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
              <circle v-else cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
            </svg>
            <span class="truncate text-neutral-700 dark:text-neutral-300">{{ dashboard.name }}</span>
          </button>
        </div>

        <!-- Browse User: handle input in sidebar -->
        <div v-if="activeTab === 'browse'" class="shrink-0 border-b border-neutral-100 dark:border-neutral-800 px-3 py-2 space-y-1.5">
          <div class="flex gap-1 items-center">
            <input
              v-model="browseInput"
              type="text"
              placeholder="@h2oflows"
              class="flex-1 text-sm bg-neutral-100 dark:bg-neutral-900 rounded-md px-3 py-1.5 text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-primary-500 min-w-0"
              @keydown.enter.prevent="browseUser"
            />
            <button
              class="shrink-0 px-3 py-1.5 rounded-md text-xs font-medium bg-primary-500 hover:bg-primary-600 text-white transition-colors disabled:opacity-50"
              :disabled="browseLoading"
              @click="browseUser"
            >
              <svg v-if="browseLoading" class="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="31.4" stroke-dashoffset="10" stroke-linecap="round"/></svg>
              <span v-else>Go</span>
            </button>
          </div>
          <div v-if="userSuggestions.length > 0" class="rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden">
            <button
              v-for="h in userSuggestions"
              :key="h"
              class="w-full text-left px-3 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              @click="selectSuggestion(h)"
            >@{{ h }}</button>
          </div>
          <p v-if="browseError" class="text-xs text-red-500">{{ browseError }}</p>
          <p v-if="browseHandle" class="text-xs text-neutral-400">
            Showing <span class="font-medium text-neutral-700 dark:text-neutral-300">@{{ browseHandle }}</span>'s runs
            <button class="ml-1 text-primary-500 hover:underline" @click="clearBrowse">clear</button>
          </p>
        </div>

        <!-- Loading / error / empty states -->
        <div v-if="!isAuthenticated && activeTab !== 'browse'" class="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center text-sm text-neutral-400">
          <span>Sign in to see your runs.</span>
          <NuxtLink to="/login" class="text-primary-500 hover:underline">Sign in →</NuxtLink>
        </div>
        <div v-else-if="mapReaches.length === 0 && activeTab === 'browse' && !browseHandle" class="flex-1 flex items-center justify-center text-sm text-neutral-400 px-4 text-center">
          Enter a handle and press Go to browse another user's runs.
        </div>
        <div v-else-if="sidebarReaches.length === 0 && isAuthenticated" class="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center text-sm text-neutral-400">
          <span>{{ activeTab === 'browse' ? 'No public runs found.' : 'No runs yet.' }}</span>
          <NuxtLink v-if="activeTab !== 'browse'" to="/my/runs/new" class="text-primary-500 hover:underline">Create your first run →</NuxtLink>
        </div>
        <div v-else-if="query.length >= 2 && filteredSidebarGroups.length === 0" class="flex-1 flex items-center justify-center text-sm text-neutral-400 px-4 text-center">
          No results for "{{ query }}"
        </div>

        <!-- Reach list -->
        <div
          v-if="showReachList"
          class="flex-1 overflow-y-auto"
        >
          <div v-for="group in filteredSidebarGroups" :key="group.name">
            <!-- River header (collapsible) -->
            <button
              class="w-full flex items-center gap-2 px-3 py-1.5 border-b border-neutral-100 dark:border-neutral-800/50 bg-neutral-50 dark:bg-neutral-900/50 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800/60 transition-colors"
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
              <span class="text-xs text-neutral-400 shrink-0">{{ group.reaches.length }}</span>
            </button>
            <!-- Reach rows (collapsed by river group) -->
            <div v-show="!collapsedRivers.has(group.name)">
            <div
              v-for="reach in group.reaches"
              :key="reach.slug"
              :ref="(el) => setReachRef(reach.slug, el as HTMLElement | null)"
              class="flex items-center gap-2 pl-6 pr-2 py-1.5 cursor-pointer transition-colors group"
              :class="hoveredSlug === reach.slug
                ? 'bg-primary-50 dark:bg-primary-950/40'
                : 'hover:bg-neutral-50 dark:hover:bg-neutral-900/60'"
              @mouseenter="hoveredSlug = reach.slug"
              @mouseleave="hoveredSlug = null"
              @click="mapRef?.flyToSlug(reach.slug); listVisible = false"
            >
              <span
                class="w-2 h-2 rounded-full shrink-0"
                :style="{ background: bandSolid(null, reach.flow_status) }"
              />
              <span class="flex-1 min-w-0 text-sm text-neutral-800 dark:text-neutral-200 truncate">{{ reach.name }}</span>
              <span
                v-if="reach.current_cfs != null"
                class="text-xs font-medium tabular-nums shrink-0"
                :style="{ color: bandSolid(null, reach.flow_status) }"
              >{{ Math.round(reach.current_cfs).toLocaleString() }}</span>
              <span v-else class="text-xs text-neutral-300 dark:text-neutral-600 shrink-0">—</span>
              <!-- Add to dashboard (own runs only) -->
              <div
                v-if="isAuthenticated && activeTab !== 'browse'"
                class="dashboard-dropdown-anchor shrink-0 relative"
                @click.stop
              >
                <button
                  class="p-1 rounded transition-colors text-neutral-400 dark:text-neutral-500 hover:text-primary-500 dark:hover:text-primary-400"
                  aria-label="Add to dashboard"
                  @click="openUserReachDropdown(reach)"
                >
                  <svg class="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                    <circle cx="10" cy="10" r="8"/><line x1="10" y1="6" x2="10" y2="14"/><line x1="6" y1="10" x2="14" y2="10"/>
                  </svg>
                </button>
                <div
                  v-if="dropdownSlug === reach.slug"
                  class="absolute right-0 top-full mt-1 z-40 min-w-40 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg overflow-hidden"
                >
                  <div v-if="membershipLoading" class="px-3 py-2 text-xs text-neutral-400">Loading…</div>
                  <button
                    v-else
                    v-for="dashboard in db.dashboards.value"
                    :key="dashboard.id"
                    class="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                    @click="toggleDashboardForUserReach(reach, dashboard.id)"
                  >
                    <svg
                      class="w-3.5 h-3.5 shrink-0"
                      :class="membershipDashboardIds.has(dashboard.id) ? 'text-primary-500' : 'text-neutral-300 dark:text-neutral-600'"
                      viewBox="0 0 20 20" fill="currentColor"
                    >
                      <path v-if="membershipDashboardIds.has(dashboard.id)" fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                      <circle v-else cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
                    </svg>
                    <span class="truncate text-neutral-700 dark:text-neutral-300">{{ dashboard.name }}</span>
                  </button>
                </div>
              </div>
              <!-- View link -->
              <NuxtLink
                :to="activeTab === 'browse' ? `/runs/${browseHandle}/${reach.slug}` : `/my/runs/${reach.slug}`"
                class="shrink-0 p-0.5 rounded text-neutral-300 dark:text-neutral-600 hover:text-primary-500 dark:hover:text-primary-400 transition-opacity opacity-60 sm:opacity-0 sm:group-hover:opacity-100 hover:opacity-100"
                aria-label="View run"
                @click.stop
              >
                <svg class="w-3 h-3" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 3H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-5M13 3h4m0 0v4m0-4L9 11" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </NuxtLink>
            </div>
            </div><!-- end collapsible rows wrapper -->
          </div>
        </div>
      </aside>

      <!-- ── Right panel: map ──────────────────────────────────────────────── -->
      <div class="flex-1 min-w-0 relative flex flex-col">

        <!-- Browsing banner (Browse User tab with active handle) -->
        <div
          v-if="activeTab === 'browse' && browseHandle"
          class="shrink-0 bg-primary-50 dark:bg-primary-950 border-b border-primary-200 dark:border-primary-800 px-3 py-1.5 flex items-center justify-between gap-3 text-xs z-10"
        >
          <span class="text-primary-700 dark:text-primary-300 font-medium truncate">
            Browsing <span class="font-bold">@{{ browseHandle }}</span>'s runs
          </span>
          <button
            class="shrink-0 flex items-center gap-1 text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200 transition-colors font-medium"
            @click="clearBrowse"
          >
            <svg class="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 4 4 12M4 4l8 8"/></svg>
            My Runs
          </button>
        </div>

        <div class="flex-1 relative">
          <ClientOnly>
            <RunsMap
              ref="mapRef"
              :hovered-slug="hoveredSlug"
              :source-url="mapSourceUrl"
              :source-headers="mapSourceHeaders"
              @reaches-updated="onReachesUpdated"
              @all-reaches-updated="onAllReachesUpdated"
              @zoom-updated="(z) => mapZoom = z"
              @hover-changed="onMapHover"
              @reach-click="onReachClick"
            />
          </ClientOnly>

          <!-- Mobile: open list (only shown when map is visible) -->
          <button
            v-if="!listVisible"
            class="sm:hidden absolute top-2 left-2 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shadow-md bg-white/95 dark:bg-neutral-900/95 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200"
            @click="listVisible = true"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/>
            </svg>
            {{ mapReaches.length }} reaches
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Gauge detail modal -->
  <GaugeDetailModal
    v-if="detailGauge"
    v-model:open="detailOpen"
    :gauge="detailGauge"
    mode="reach"
  />

  <!-- Import run modal -->
  <RunImportModal v-model:open="importModalOpen" @imported="reloadMap" />

  <!-- Search / Discover modal — opened via ?discover=true or ?import=true query -->
  <GaugeSearchModal
    v-model:open="searchModalOpen"
    :initial-tab="searchModalInitialTab"
    @added-external="reloadMap"
  />

  <!-- New reach modal (admin only) -->
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="authorModalOpen"
        class="fixed inset-0 z-50 flex flex-col bg-neutral-50 dark:bg-neutral-950 overflow-y-auto"
      >
        <div class="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-sm border-b border-neutral-200 dark:border-neutral-800">
          <h2 class="text-sm font-semibold text-neutral-800 dark:text-neutral-100">New Run</h2>
          <button
            class="p-1.5 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            @click="authorModalOpen = false"
          >
            <svg class="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M6 6l8 8M14 6l-8 8"/>
            </svg>
          </button>
        </div>
        <div class="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
          <RunAuthor @created="onAuthorCreated" @cancel="authorModalOpen = false" />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import type { ReachListItem, ReachClickPayload } from '~/components/map/RunsMap.vue'
import type { WatchedGauge } from '~/stores/watchlist'

definePageMeta({ ssr: false })

const { bandSolid } = useFlowBandPalette()
const { apiBase } = useRuntimeConfig().public
const router = useRouter()
const route = useRoute()
let pendingFocusSlug: string | null = (route.query.focus as string) || null
const { isAuthenticated, getToken } = useAuth()
const db = useDashboards()

// ── Tab control ───────────────────────────────────────────────────────────────
type TabId = 'mine' | 'browse'
const TABS: { id: TabId; label: string }[] = [
  { id: 'mine',   label: 'My Runs'     },
  { id: 'browse', label: 'Browse User' },
]
const TAB_STORAGE_KEY = 'h2o-explore-tab'
const activeTab = ref<TabId>('mine')

function setTab(id: TabId) {
  activeTab.value = id
  try { localStorage.setItem(TAB_STORAGE_KEY, id) } catch {}
}

// ── New reach / import / search modals ───────────────────────────────────────
const authorModalOpen       = ref(false)
const importModalOpen       = ref(false)
const searchModalOpen       = ref(false)
const searchModalInitialTab = ref<'mine' | 'discover'>('mine')

function onAuthorCreated(slug: string) {
  authorModalOpen.value = false
  router.push(`/my/runs/${slug}`)
}

// ── Demo banner ───────────────────────────────────────────────────────────────
const showDemoBanner = ref(false)

// ── Sharing banner ────────────────────────────────────────────────────────────
const showSharingBanner = ref(false)

function dismissSharingBanner() {
  showSharingBanner.value = false
  localStorage.setItem('sharing-banner-dismissed', 'true')
}

// ── Dashboard dropdown per reach ──────────────────────────────────────────────
const dropdownSlug           = ref<string | null>(null)
const membershipDashboardIds = ref<Set<string>>(new Set())
const membershipLoading      = ref(false)

function onDocClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (dropdownSlug.value && !target.closest('.dashboard-dropdown-anchor')) dropdownSlug.value = null
}

onMounted(async () => {
  showDemoBanner.value = localStorage.getItem('demo-banner-dismissed') !== 'true'
  document.addEventListener('click', onDocClick)

  // Restore persisted tab (map legacy 'all'/'dashboards' → 'mine')
  try {
    const saved = localStorage.getItem(TAB_STORAGE_KEY)
    if (saved === 'browse') activeTab.value = 'browse'
    else if (saved === 'mine' || saved === 'all' || saved === 'dashboards') activeTab.value = 'mine'
  } catch {}

  if (isAuthenticated.value) {
    db.load()
    await initMapToken()
    await loadDashboardMembership()
    if (localStorage.getItem('sharing-banner-dismissed') !== 'true') {
      showSharingBanner.value = true
    }
  }

  // wizard paths
  if (route.query.import === 'true') {
    importModalOpen.value = true
    router.replace({ query: {} })
  } else if (route.query.discover === 'true') {
    searchModalInitialTab.value = 'discover'
    searchModalOpen.value = true
    router.replace({ query: {} })
  }

  // ?browse=handle query param
  if (route.query.browse) {
    const handle = (route.query.browse as string).replace(/^@/, '').toLowerCase()
    browseInput.value = handle
    activeTab.value = 'browse'
    browseHandle.value = handle
    router.replace({ query: {} })
  }
})
onUnmounted(() => document.removeEventListener('click', onDocClick))

function dismissBanner() {
  showDemoBanner.value = false
  localStorage.setItem('demo-banner-dismissed', 'true')
}

// ── Map auth token ────────────────────────────────────────────────────────────
const mapToken = ref<string | null>(null)

async function initMapToken() {
  const token = await getToken()
  mapToken.value = token
}

const mapSourceHeaders = computed((): Record<string, string> => {
  if (activeTab.value === 'browse') return {}
  return mapToken.value ? { Authorization: `Bearer ${mapToken.value}` } : {}
})

// ── Dashboard filter (dashboards tab) ─────────────────────────────────────────
const selectedDashboardIds = ref(new Set<string>())
const dashboardReachMap    = ref(new Map<string, Set<string>>())

function toggleDashboardFilter(id: string) {
  const next = new Set(selectedDashboardIds.value)
  if (next.has(id)) next.delete(id)
  else               next.add(id)
  selectedDashboardIds.value = next
}

async function loadDashboardMembership() {
  const token = await getToken()
  if (!token) return
  try {
    const res = await fetch(`${apiBase}/api/v1/watchlist`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return
    const data = await res.json()
    const m = new Map<string, Set<string>>()
    for (const item of (data.items ?? [])) {
      if (item.reach_slug && item.dashboard_id && item.gauge_id == null) {
        if (!m.has(item.dashboard_id)) m.set(item.dashboard_id, new Set())
        m.get(item.dashboard_id)!.add(item.reach_slug)
      }
    }
    dashboardReachMap.value = m
  } catch {}
}

// ── Browse User mode ──────────────────────────────────────────────────────────
const browseHandle    = ref<string | null>(null)
const browseInput     = ref('@h2oflows')
const browseLoading   = ref(false)
const browseError     = ref('')
const userSuggestions = ref<string[]>([])
let   suggestTimer: ReturnType<typeof setTimeout> | null = null

watch(browseInput, (val) => {
  if (suggestTimer) clearTimeout(suggestTimer)
  const q = val.trim().replace(/^@/, '')
  if (q.length < 2) { userSuggestions.value = []; return }
  suggestTimer = setTimeout(async () => {
    try {
      const res = await fetch(`${apiBase}/api/v1/users/search?q=${encodeURIComponent(q)}`)
      if (res.ok) {
        const data = await res.json() as { handle: string }[]
        userSuggestions.value = data.map(d => d.handle)
      }
    } catch {}
  }, 250)
})

async function browseUser() {
  // cancel pending suggestion fetch — avoids race with GO
  if (suggestTimer) { clearTimeout(suggestTimer); suggestTimer = null }
  userSuggestions.value = []
  const raw = browseInput.value.trim().replace(/^@/, '').toLowerCase()
  if (!raw) return
  browseLoading.value = true
  browseError.value = ''
  try {
    const res = await fetch(`${apiBase}/api/v1/users/${encodeURIComponent(raw)}`)
    if (!res.ok) { browseError.value = 'User not found'; return }
    if (browseHandle.value !== raw) {
      browseHandle.value = raw  // triggers mapSourceUrl change → RunsMap watch auto-reloads
    } else {
      await mapRef.value?.reloadSource()  // same handle: force refresh
    }
  } catch {
    browseError.value = 'Failed to reach server'
  } finally {
    browseLoading.value = false
  }
}

function clearBrowse() {
  browseHandle.value = null
  browseInput.value = '@h2oflows'
  browseError.value = ''
  userSuggestions.value = []
  setTab('mine')
}

function selectSuggestion(handle: string) {
  browseInput.value = handle
  userSuggestions.value = []
  browseUser()
}

// ── Map source URL ────────────────────────────────────────────────────────────
const mapSourceUrl = computed((): string | null => {
  if (activeTab.value === 'browse') {
    if (!browseHandle.value) return null
    return `${apiBase}/api/v1/users/${encodeURIComponent(browseHandle.value)}/runs/map/all`
  }
  if (!mapToken.value) return null
  const base = `${apiBase}/api/v1/me/runs/map/all`
  if (selectedDashboardIds.value.size === 0) return base
  // dashboard filter active: include only slugs belonging to selected dashboards
  const slugs = new Set<string>()
  for (const id of selectedDashboardIds.value) {
    for (const slug of (dashboardReachMap.value.get(id) ?? new Set())) slugs.add(slug)
  }
  if (slugs.size === 0) return null
  return `${base}?slugs=${[...slugs].join(',')}`
})

// ── Reach list ────────────────────────────────────────────────────────────────
const query = ref('')

interface ReachGroup { name: string; reaches: ReachListItem[] }

const filteredSidebarGroups = computed((): ReachGroup[] => {
  const q = query.value.trim().toLowerCase()
  const items = q.length >= 2
    ? sidebarReaches.value.filter(r =>
        r.name.toLowerCase().includes(q) ||
        (r.river_name?.toLowerCase().includes(q) ?? false)
      )
    : sidebarReaches.value
  const grouped = new Map<string, ReachListItem[]>()
  for (const r of items) {
    const key = r.river_name ?? 'No River'
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(r)
  }
  return [...grouped.entries()]
    .sort(([a], [b]) => a === 'No River' ? 1 : b === 'No River' ? -1 : a.localeCompare(b))
    .map(([name, reaches]) => ({ name, reaches }))
})

// keep for legacy compat (showReachList uses this)
const filteredMapGroups = filteredSidebarGroups

const showReachList = computed(() => {
  if (!isAuthenticated.value && activeTab.value !== 'browse') return false
  if (activeTab.value === 'browse' && !browseHandle.value) return false
  if (sidebarReaches.value.length === 0) return false
  if (query.value.length >= 2 && filteredSidebarGroups.value.length === 0) return false
  return true
})

// ── Map interaction ───────────────────────────────────────────────────────────
const mapRef      = ref<{ flyToSlug: (slug: string) => void; reloadSource: () => Promise<void> } | null>(null)
const hoveredSlug = ref<string | null>(null)
const mapReaches  = ref<ReachListItem[]>([])   // viewport-filtered (from map moveend)
const allReaches  = ref<ReachListItem[]>([])   // all loaded from source (not viewport-filtered)
const mapZoom     = ref(4)

// ── Zoom & Filter toggle ──────────────────────────────────────────────────────
const zoomFilter = ref(false)
// auto-enable when source loads >150 runs
watch(allReaches, (reaches) => {
  if (reaches.length > 150) zoomFilter.value = true
})

// sidebar source: all loaded OR viewport-filtered based on toggle
const sidebarReaches = computed((): ReachListItem[] =>
  zoomFilter.value ? mapReaches.value : allReaches.value
)

// ── Collapsible river groups ──────────────────────────────────────────────────
const collapsedRivers = ref(new Set<string>())

function toggleRiverCollapse(name: string) {
  const next = new Set(collapsedRivers.value)
  if (next.has(name)) next.delete(name)
  else                next.add(name)
  collapsedRivers.value = next
}

const reachRefs = new Map<string, HTMLElement>()
function setReachRef(slug: string, el: HTMLElement | null) {
  if (el) reachRefs.set(slug, el)
  else    reachRefs.delete(slug)
}

function onReachesUpdated(r: ReachListItem[]) {
  mapReaches.value = r
  if (pendingFocusSlug && r.some(x => x.slug === pendingFocusSlug)) {
    mapRef.value?.flyToSlug(pendingFocusSlug)
    pendingFocusSlug = null
    router.replace({ query: {} })
  }
}

function onAllReachesUpdated(r: ReachListItem[]) {
  allReaches.value = r
}

function onMapHover(slug: string | null) {
  hoveredSlug.value = slug
  if (slug) {
    nextTick(() => {
      reachRefs.get(slug)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }
}

function onReachClick(payload: ReachClickPayload) {
  if (activeTab.value === 'browse' && browseHandle.value) {
    navigateTo(`/runs/${browseHandle.value}/${payload.slug}`)
    return
  }
  if (payload.authorHandle) {
    navigateTo(`/runs/${payload.authorHandle}/${payload.slug}`)
    return
  }
  navigateTo(`/my/runs/${payload.slug}`)
}

async function reloadMap() {
  await initMapToken()
  await mapRef.value?.reloadSource()
}

// ── Mobile list/map toggle ────────────────────────────────────────────────────
const listVisible = ref(false)

// ── Dashboard watchlist integration ──────────────────────────────────────────
async function openUserReachDropdown(r: ReachListItem) {
  if (dropdownSlug.value === r.slug) { dropdownSlug.value = null; return }
  dropdownSlug.value = r.slug
  membershipLoading.value = true
  membershipDashboardIds.value = new Set()
  const token = await getToken()
  if (!token) { membershipLoading.value = false; return }
  try {
    const res = await fetch(`${apiBase}/api/v1/watchlist`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return
    const data = await res.json()
    const ids = new Set<string>()
    for (const item of (data.items ?? [])) {
      if (item.reach_slug === r.slug && item.gauge_id == null && item.dashboard_id) {
        ids.add(item.dashboard_id)
      }
    }
    membershipDashboardIds.value = ids
  } finally {
    membershipLoading.value = false
  }
}

async function toggleDashboardForUserReach(r: ReachListItem, dashboardId: string) {
  const { addReachToWatchlist } = useWatchlistSync()
  if (membershipDashboardIds.value.has(dashboardId)) {
    membershipDashboardIds.value = new Set([...membershipDashboardIds.value].filter(id => id !== dashboardId))
    const token = await getToken()
    if (token) {
      const qs = `?kind=reach&dashboard_id=${encodeURIComponent(dashboardId)}`
      fetch(`${apiBase}/api/v1/watchlist/${encodeURIComponent(r.slug)}${qs}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})
    }
  } else {
    membershipDashboardIds.value = new Set([...membershipDashboardIds.value, dashboardId])
    await addReachToWatchlist(r.slug, dashboardId)
    if (import.meta.client) {
      const key = `h2oflow_hidden_reaches_${dashboardId}`
      try {
        const set = new Set<string>(JSON.parse(localStorage.getItem(key) ?? '[]'))
        if (set.delete(r.slug)) localStorage.setItem(key, JSON.stringify([...set]))
      } catch {}
    }
  }
}

// ── Gauge detail modal ────────────────────────────────────────────────────────
const detailOpen  = ref(false)
const detailGauge = ref<WatchedGauge | null>(null)
</script>

<style scoped>
/* Push MapLibre zoom controls below the mode label pill */
:deep(.maplibregl-ctrl-top-right) {
  top: 44px;
}
</style>
