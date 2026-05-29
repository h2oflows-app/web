<template>
  <div class="h-dvh flex flex-col overflow-hidden bg-white dark:bg-neutral-950">

    <!-- Backdrop: consumes the click that closes the dashboard dropdown so it doesn't hit reach rows -->
    <div v-if="dropdownSlug !== null" class="fixed inset-0 z-30" @click.stop="dropdownSlug = null" />

    <!-- Sharing banner (V22) — one-time, auth only, localStorage dismissed flag -->
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

      <!-- ── Left panel: runs list ──────────────────────────────────────────── -->
      <aside
        class="shrink-0 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex flex-col overflow-hidden transition-all"
        :class="listVisible
          ? 'absolute sm:relative inset-0 sm:inset-auto z-30 sm:z-auto w-full sm:w-80'
          : 'hidden sm:flex sm:w-80'"
      >
        <!-- Search + mobile map toggle -->
        <div class="px-3 py-2.5 sm:border-b border-neutral-100 dark:border-neutral-800 shrink-0 flex items-center gap-2">
          <input
            v-model="query"
            type="search"
            placeholder="Search runs, rivers…"
            class="flex-1 text-sm bg-neutral-100 dark:bg-neutral-900 rounded-md px-3 py-1.5 text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <!-- Back to map (mobile only, shown when list is visible) -->
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

        <!-- New run button -->
        <div
          v-if="isAuthenticated"
          class="reach-picker-anchor px-3 pb-2 shrink-0 relative"
        >
          <button
            class="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white transition-colors shadow-sm"
            @click="reachPickerOpen = !reachPickerOpen"
          >
            <svg class="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <line x1="10" y1="3" x2="10" y2="17"/><line x1="3" y1="10" x2="17" y2="10"/>
            </svg>
            New Run
          </button>
          <!-- Picker popover -->
          <div
            v-if="reachPickerOpen"
            class="absolute left-3 right-3 top-full mt-1 z-40 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg overflow-hidden"
          >
            <button
              class="w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              @click="reachPickerOpen = false; navigateTo('/my/runs/new')"
            >
              <svg class="w-4 h-4 text-primary-500 shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 3H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-5M13 3h4m0 0v4m0-4L9 11"/>
              </svg>
              <div>
                <p class="font-medium text-neutral-800 dark:text-neutral-100">Create new</p>
                <p class="text-xs text-neutral-400">Build your own run</p>
              </div>
            </button>
            <div class="border-t border-neutral-100 dark:border-neutral-800" />
            <button
              class="w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              @click="reachPickerOpen = false; importModalOpen = true"
            >
              <svg class="w-4 h-4 text-neutral-500 shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 16v1a1 1 0 001 1h10a1 1 0 001-1v-1M7 10l3 3 3-3M10 3v10"/>
              </svg>
              <div>
                <p class="font-medium text-neutral-800 dark:text-neutral-100">Import shared…</p>
                <p class="text-xs text-neutral-400">Paste a share code from another user</p>
              </div>
            </button>
          </div>
        </div>

        <!-- Loading / error / empty states -->
        <div v-if="userReachesLoading" class="flex-1 flex items-center justify-center text-sm text-neutral-400">Loading…</div>
        <div v-else-if="userReachesError" class="flex-1 flex items-center justify-center text-sm text-red-400">{{ userReachesError }}</div>
        <div v-else-if="!isAuthenticated" class="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center text-sm text-neutral-400">
          <span>Sign in to see your runs.</span>
          <NuxtLink to="/login" class="text-primary-500 hover:underline">Sign in →</NuxtLink>
        </div>
        <div v-else-if="userReaches.length === 0" class="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center text-sm text-neutral-400">
          <span>No saved runs yet.</span>
          <NuxtLink to="/my/runs/new" class="text-primary-500 hover:underline">Create your first run →</NuxtLink>
        </div>
        <div v-else-if="query.length >= 2 && userRiverGroups.length === 0" class="flex-1 flex items-center justify-center text-sm text-neutral-400">
          No results for "{{ query }}"
        </div>

        <!-- My runs list -->
        <div
          v-if="!userReachesLoading && !userReachesError && isAuthenticated && userReaches.length > 0 && !(query.length >= 2 && userRiverGroups.length === 0)"
          class="flex-1 overflow-y-auto"
        >
          <div v-for="group in userRiverGroups" :key="group.name">
            <!-- River header -->
            <div class="flex items-center gap-2 px-3 py-1.5 border-b border-neutral-100 dark:border-neutral-800/50 bg-neutral-50 dark:bg-neutral-900/50">
              <span class="text-xs font-semibold text-neutral-600 dark:text-neutral-300 flex-1 truncate">{{ group.name }}</span>
              <span class="text-xs text-neutral-400 shrink-0">{{ group.reaches.length }}</span>
            </div>
            <!-- Reach rows -->
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
              <!-- Add to dashboard dropdown -->
              <div
                v-if="isAuthenticated"
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
              <NuxtLink
                :to="`/my/runs/${reach.slug}`"
                class="shrink-0 p-0.5 rounded text-neutral-300 dark:text-neutral-600 hover:text-primary-500 dark:hover:text-primary-400 transition-opacity opacity-60 sm:opacity-0 sm:group-hover:opacity-100 hover:opacity-100"
                aria-label="View run"
                @click.stop
              >
                <svg class="w-3 h-3" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 3H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-5M13 3h4m0 0v4m0-4L9 11" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </NuxtLink>
            </div>
          </div>
        </div>
      </aside>

      <!-- ── Right panel: map ──────────────────────────────────────────────── -->
      <div class="flex-1 min-w-0 relative">

        <!-- Floating filter dropdown — multi-select dashboard checkboxes (V3/V4/V5) -->
        <div
          v-if="isAuthenticated && !listVisible"
          class="mode-dropdown-anchor absolute top-2 right-2 z-20"
        >
          <button
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-md bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-white dark:hover:bg-neutral-900 transition-colors"
            @click="filterDropdownOpen = !filterDropdownOpen"
          >
            <span class="text-neutral-400 dark:text-neutral-500">Showing:</span>
            <span class="text-primary-600 dark:text-primary-400">{{ filterLabel }}</span>
            <svg class="w-3 h-3 text-neutral-400 transition-transform" :class="filterDropdownOpen ? 'rotate-180' : ''" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd"/>
            </svg>
          </button>
          <div
            v-if="filterDropdownOpen && db.dashboards.value.length > 0"
            class="absolute right-0 top-full mt-1 min-w-44 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg overflow-hidden"
          >
            <!-- All Runs row -->
            <button
              class="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              @click="clickAllRuns"
            >
              <svg
                class="w-3.5 h-3.5 shrink-0"
                :class="allRunsMode ? 'text-primary-500' : 'text-neutral-300 dark:text-neutral-600'"
                viewBox="0 0 20 20" fill="currentColor"
              >
                <path v-if="allRunsMode" fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                <circle v-else cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
              </svg>
              <span class="font-medium text-neutral-700 dark:text-neutral-300">All Runs</span>
            </button>
            <div class="border-t border-neutral-100 dark:border-neutral-800"/>
            <!-- Per-dashboard rows -->
            <button
              v-for="dashboard in db.dashboards.value"
              :key="dashboard.id"
              class="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors"
              :class="allRunsMode
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-neutral-50 dark:hover:bg-neutral-800'"
              :disabled="allRunsMode"
              :title="allRunsMode ? 'Uncheck All Runs to filter by dashboard.' : ''"
              @click="!allRunsMode && toggleDashboardFilter(dashboard.id)"
            >
              <svg
                class="w-3.5 h-3.5 shrink-0"
                :class="!allRunsMode && selectedDashboardIds.has(dashboard.id) ? 'text-primary-500' : 'text-neutral-300 dark:text-neutral-600'"
                viewBox="0 0 20 20" fill="currentColor"
              >
                <path v-if="!allRunsMode && selectedDashboardIds.has(dashboard.id)" fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                <circle v-else cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
              </svg>
              <span class="truncate text-neutral-700 dark:text-neutral-300">{{ dashboard.name }}</span>
            </button>
          </div>
        </div>

        <ClientOnly>
          <RunsMap
            ref="mapRef"
            :hovered-slug="hoveredSlug"
            :source-url="mapSourceUrl"
            :source-headers="mapSourceHeaders"
            @reaches-updated="onReachesUpdated"
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

  <!-- Gauge detail modal -->
  <GaugeDetailModal
    v-if="detailGauge"
    v-model:open="detailOpen"
    :gauge="detailGauge"
    mode="reach"
  />

  <!-- Import run modal -->
  <RunImportModal v-model:open="importModalOpen" @imported="loadUserReaches" />

  <!-- Search / Discover modal — opened via ?discover=true or ?import=true query (V9) -->
  <GaugeSearchModal
    v-model:open="searchModalOpen"
    :initial-tab="searchModalInitialTab"
    @added-external="loadUserReaches"
  />

  <!-- New reach modal (admin only — retained for admin reach authoring) -->
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
import type { ReachListItem as MapReachItem } from '~/components/map/RunsMap.vue'
import type { WatchedGauge } from '~/stores/watchlist'

definePageMeta({ ssr: false })

const { bandSolid } = useFlowBandPalette()
const { apiBase } = useRuntimeConfig().public
const router = useRouter()
const route = useRoute()
let pendingFocusSlug: string | null = (route.query.focus as string) || null
const { isAuthenticated, getToken } = useAuth()
const db = useDashboards()

// ── New reach / import / search modals ────────────────────────────────────────
const authorModalOpen      = ref(false)
const reachPickerOpen      = ref(false)
const importModalOpen      = ref(false)
const searchModalOpen      = ref(false)
const searchModalInitialTab = ref<'mine' | 'discover'>('mine')

function onAuthorCreated(slug: string) {
  authorModalOpen.value = false
  router.push(`/runs/${slug}/edit`)
}

// ── Demo banner ───────────────────────────────────────────────────────────────
const showDemoBanner = ref(false)

// ── Sharing banner (V22) ──────────────────────────────────────────────────────
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
  if (reachPickerOpen.value && !target.closest('.reach-picker-anchor')) reachPickerOpen.value = false
  if (dropdownSlug.value && !target.closest('.dashboard-dropdown-anchor')) dropdownSlug.value = null
  if (filterDropdownOpen.value && !target.closest('.mode-dropdown-anchor')) filterDropdownOpen.value = false
}

onMounted(async () => {
  showDemoBanner.value = localStorage.getItem('demo-banner-dismissed') !== 'true'
  document.addEventListener('click', onDocClick)
  if (isAuthenticated.value) {
    db.load()
    await loadUserReaches()
    await loadDashboardMembership()
    if (
      userReaches.value.length > 0 &&
      localStorage.getItem('sharing-banner-dismissed') !== 'true'
    ) {
      showSharingBanner.value = true
    }
  }
  // wizard paths: ?import=true opens import modal (V10); ?discover=true opens search modal on Discover tab (V9)
  if (route.query.import === 'true') {
    importModalOpen.value = true
    router.replace({ query: {} })
  } else if (route.query.discover === 'true') {
    searchModalInitialTab.value = 'discover'
    searchModalOpen.value = true
    router.replace({ query: {} })
  }
})
onUnmounted(() => document.removeEventListener('click', onDocClick))

function dismissBanner() {
  showDemoBanner.value = false
  localStorage.setItem('demo-banner-dismissed', 'true')
}

// ── Map source ────────────────────────────────────────────────────────────────
const mapToken = ref<string | null>(null)
const mapSourceHeaders = computed((): Record<string, string> =>
  mapToken.value ? { Authorization: `Bearer ${mapToken.value}` } : {}
)

// ── Dashboard filter (V3/V4/V5) ───────────────────────────────────────────────
const filterDropdownOpen  = ref(false)
const allRunsMode         = ref(true)
const selectedDashboardIds = ref(new Set<string>())
const dashboardReachMap   = ref(new Map<string, Set<string>>())

const filterLabel = computed(() => {
  if (allRunsMode.value || selectedDashboardIds.value.size === 0) return 'All Runs'
  if (selectedDashboardIds.value.size === 1) {
    const id = [...selectedDashboardIds.value][0]
    return db.dashboards.value.find(d => d.id === id)?.name ?? 'Dashboard'
  }
  return `${selectedDashboardIds.value.size} dashboards`
})

const mapSourceUrl = computed((): string | null => {
  if (!mapToken.value) return null
  const base = `${apiBase}/api/v1/me/runs/map/all`
  if (allRunsMode.value || selectedDashboardIds.value.size === 0) return base
  const slugs = new Set<string>()
  for (const id of selectedDashboardIds.value) {
    for (const slug of (dashboardReachMap.value.get(id) ?? new Set())) slugs.add(slug)
  }
  if (slugs.size === 0) return null
  return `${base}?slugs=${[...slugs].join(',')}`
})

function clickAllRuns() {
  if (allRunsMode.value) {
    allRunsMode.value = false
  } else {
    allRunsMode.value = true
    selectedDashboardIds.value = new Set()
  }
}

function toggleDashboardFilter(id: string) {
  const next = new Set(selectedDashboardIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
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
  } catch { /* silent — filter just won't narrow */ }
}

// ── User reaches ──────────────────────────────────────────────────────────────
interface UserReachSummary {
  id: string; slug: string; name: string
  river_name: string | null
  current_cfs: number | null
  flow_status: string
  gauge_id?: string | null
}
interface UserRiverGroup { name: string; reaches: UserReachSummary[] }

const userReachesLoading = ref(false)
const userReachesError  = ref('')
const userReaches       = ref<UserReachSummary[]>([])

async function loadUserReaches() {
  userReachesLoading.value = true
  userReachesError.value = ''
  try {
    const token = await getToken()
    mapToken.value = token
    if (!token) { userReachesError.value = 'Sign in to view your runs.'; return }
    const res = await fetch(`${apiBase}/api/v1/me/reaches`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`${res.status}`)
    userReaches.value = await res.json()
  } catch {
    userReachesError.value = 'Failed to load your runs.'
  } finally {
    userReachesLoading.value = false
  }
}

// ── Search ────────────────────────────────────────────────────────────────────
const query = ref('')

const userRiverGroups = computed((): UserRiverGroup[] => {
  const q = query.value.trim().toLowerCase()
  const items = q.length >= 2
    ? userReaches.value.filter(r =>
        r.name.toLowerCase().includes(q) ||
        (r.river_name?.toLowerCase().includes(q) ?? false)
      )
    : userReaches.value
  const grouped = new Map<string, UserReachSummary[]>()
  for (const r of items) {
    const key = r.river_name ?? 'No River'
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(r)
  }
  return [...grouped.entries()]
    .sort(([a], [b]) => a === 'No River' ? 1 : b === 'No River' ? -1 : a.localeCompare(b))
    .map(([name, reaches]) => ({ name, reaches }))
})

// ── Two-way interaction: list ↔ map ───────────────────────────────────────────
const mapRef      = ref<{ flyToSlug: (slug: string) => void; reloadSource: () => Promise<void> } | null>(null)
const hoveredSlug = ref<string | null>(null)
const mapReaches  = ref<MapReachItem[]>([])
const mapZoom     = ref(4)

const reachRefs = new Map<string, HTMLElement>()
function setReachRef(slug: string, el: HTMLElement | null) {
  if (el) reachRefs.set(slug, el)
  else    reachRefs.delete(slug)
}

function onReachesUpdated(r: MapReachItem[]) {
  mapReaches.value = r
  if (pendingFocusSlug && r.some(x => x.slug === pendingFocusSlug)) {
    mapRef.value?.flyToSlug(pendingFocusSlug)
    pendingFocusSlug = null
    router.replace({ query: {} })
  }
}

function onMapHover(slug: string | null) {
  hoveredSlug.value = slug
  if (slug) {
    nextTick(() => {
      reachRefs.get(slug)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }
}

function onReachClick(payload: { slug: string; id?: string; isCommunity?: boolean }) {
  navigateTo(`/my/runs/${payload.slug}`)
}

// ── Mobile list/map toggle ────────────────────────────────────────────────────
const listVisible = ref(false)

// ── Dashboard watchlist integration ───────────────────────────────────────────
async function openUserReachDropdown(r: UserReachSummary) {
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

async function toggleDashboardForUserReach(r: UserReachSummary, dashboardId: string) {
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
        if (set.delete(r.id)) localStorage.setItem(key, JSON.stringify([...set]))
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
