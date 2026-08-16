<template>
  <div class="h-dvh flex flex-col overflow-hidden bg-white dark:bg-neutral-950">

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
        <!-- Sidebar header: "← My runs" when browsing a handle, else picker -->
        <div class="shrink-0 px-3 pt-2.5 pb-2 flex items-center justify-between gap-2 border-b border-neutral-100 dark:border-neutral-800">
          <template v-if="handle">
            <!-- Browsing a handle: show handle label + back link -->
            <div class="flex items-center gap-1.5 min-w-0">
              <NuxtLink
                to="/explore"
                class="shrink-0 flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                <svg class="w-3 h-3" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4 4 10l8 6"/></svg>
                My runs
              </NuxtLink>
              <span class="text-neutral-300 dark:text-neutral-700 text-xs">·</span>
              <span class="text-xs font-medium text-neutral-700 dark:text-neutral-300 truncate">@{{ handle }}</span>
            </div>
          </template>
          <template v-else>
            <!-- My runs mode: show title + browse picker -->
            <span class="text-xs font-medium text-neutral-700 dark:text-neutral-300">My Runs</span>
            <UserHandlePicker />
          </template>
        </div>

        <!-- web#335: adding-target chip + scope switcher (my-runs mode only;
             browse mode keeps its channel identity untouched) -->
        <template v-if="!handle && isAuthenticated">
          <div class="px-3 pt-2 shrink-0">
            <ExploreAddingToChip v-model:dashboard-id="selectedDashboardId" />
          </div>
          <div class="px-3 pt-2 pb-0.5 shrink-0">
            <ExploreScopeSwitcher :model-value="scope" @select="onScopeSelect" />
          </div>
        </template>

        <!-- N.3 Channel profile header (browse mode only) -->
        <div v-if="handle" class="shrink-0 px-4 pt-3 pb-3 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40">
          <div class="flex items-center gap-3">
            <!-- Generic avatar circle -->
            <div class="flex items-center justify-center w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 shrink-0">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 0 0-16 0"/>
              </svg>
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-neutral-800 dark:text-neutral-200 truncate">@{{ handle }}</p>
              <div class="flex items-center gap-3 mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                <span><span class="font-medium text-neutral-700 dark:text-neutral-300">{{ channelStats.runCount }}</span> runs</span>
                <span><span class="font-medium text-neutral-700 dark:text-neutral-300">{{ channelStats.riverCount }}</span> rivers</span>
                <span><span class="font-medium text-neutral-700 dark:text-neutral-300">{{ channelStats.totalUpvotes }}</span> upvotes</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Search + mobile map toggle (all modes) -->
        <div class="px-3 py-2 shrink-0 flex items-center gap-2">
          <input
            v-model="searchText"
            type="search"
            :placeholder="searchPlaceholder"
            class="flex-1 text-sm bg-neutral-100 dark:bg-neutral-900 rounded-md px-3 py-1.5 text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            @input="onSearchInput"
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

        <!-- Community filters (community scope only) -->
        <div v-if="!handle && scope === 'community'" class="px-3 pb-2 shrink-0">
          <ExploreCommunityFilters :search="communitySearch" />
        </div>

        <!-- Zoom & Filter toggle (map-fed scopes only) -->
        <div v-if="handle || scope === 'mine'" class="px-3 pb-1.5 shrink-0 flex items-center justify-between">
          <label class="flex items-center gap-1.5 cursor-pointer select-none text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200">
            <input
              v-model="zoomFilter"
              type="checkbox"
              class="rounded w-3 h-3 accent-primary-500 cursor-pointer"
            />
            Filter to view
          </label>
          <span class="text-xs text-neutral-400 tabular-nums">{{ sidebarCount }} runs</span>
        </div>
        <div v-else-if="scope === 'community'" class="px-3 pb-1.5 shrink-0 flex items-center justify-between">
          <span class="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Community runs</span>
          <span class="text-xs text-neutral-400 tabular-nums">{{ communitySearch.runs.value.length }} shown</span>
        </div>

        <!-- N.6 Sort toggle (browse mode) -->
        <div v-if="handle" class="px-3 pb-1.5 shrink-0 flex items-center gap-1">
          <span class="text-xs text-neutral-400 mr-1">Sort:</span>
          <button
            class="px-2 py-0.5 rounded text-xs transition-colors"
            :class="sortMode === 'river' ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 font-medium' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'"
            @click="sortMode = 'river'"
          >By river</button>
          <button
            class="px-2 py-0.5 rounded text-xs transition-colors"
            :class="sortMode === 'upvotes' ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 font-medium' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'"
            @click="sortMode = 'upvotes'"
          >Most upvoted</button>
        </div>

        <!-- ── Community scope ─────────────────────────────────────────────── -->
        <ExploreCommunityList
          v-if="!handle && scope === 'community'"
          :search="communitySearch"
          :adder="exploreAdd"
          :dashboard-id="selectedDashboardId"
          :hovered-slug="hoveredSlug"
          :selected-slug="selectedRunSlug"
          @hover="hoveredSlug = $event"
          @select="onCommunitySelect"
        />

        <!-- ── My Runs / browse scope ──────────────────────────────────────── -->
        <template v-else>
          <!-- Loading / error / empty states -->
          <div v-if="!isAuthenticated && !handle" class="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center text-sm text-neutral-400">
            <span>Sign in to see your runs.</span>
            <NuxtLink to="/login" class="text-primary-500 hover:underline">Sign in →</NuxtLink>
          </div>
          <div v-else-if="sidebarReaches.length === 0 && (isAuthenticated || handle)" class="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center text-sm text-neutral-400">
            <span v-if="handle">No public runs for @{{ handle }}.</span>
            <span v-else>No runs yet.</span>
            <NuxtLink v-if="!handle" to="/my/runs/new" class="text-primary-500 hover:underline">Create your first run →</NuxtLink>
          </div>
          <div v-else-if="query.length >= 2 && filteredSidebarGroups.length === 0" class="flex-1 flex items-center justify-center text-sm text-neutral-400 px-4 text-center">
            No results for "{{ query }}"
          </div>

          <!-- Reach list -->
          <ExploreMyRunsList
            v-if="showReachList"
            :groups="filteredSidebarGroups"
            :handle="handle"
            :my-handle="myHandle"
            :hovered-slug="hoveredSlug"
            @hover="hoveredSlug = $event"
            @select="onRowSelect"
            @patch-upvote="patchReachUpvote($event.slug, $event.count, $event.upvoted)"
          />
        </template>
      </aside>

      <!-- ── Right panel: map ──────────────────────────────────────────────── -->
      <div class="flex-1 min-w-0 relative flex flex-col">

        <div class="flex-1 relative">
          <ClientOnly>
            <RunsMap
              ref="mapRef"
              :hovered-slug="hoveredSlug"
              :source-url="mapSourceUrl"
              :source-headers="mapSourceHeaders"
              @reaches-updated="onReachesUpdated"
              @all-reaches-updated="onAllReachesUpdated"
              @hover-changed="onMapHover"
              @reach-click="onReachClick"
            />
          </ClientOnly>

          <!-- Mode pill — what the pins currently show (desktop; mobile gets
               its own shell in the mobile slice) -->
          <div class="hidden sm:flex absolute top-2 left-2 z-20 items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium shadow-md bg-white/95 dark:bg-neutral-900/95 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200">
            <span class="w-2 h-2 rounded-full shrink-0" :class="modePill.dotClass" />
            {{ modePill.label }}
          </div>

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

  <!-- Import run modal -->
  <RunImportModal v-model:open="importModalOpen" @imported="reloadMap" />

  <!-- Search / Discover modal — interim home of the Community + Gauges scopes
       until they move into the rail (web#335 PRs 3–4). Opened by the scope
       switcher and by ?discover=true / ?scope= deep links. -->
  <GaugeSearchModal
    v-model:open="searchModalOpen"
    :initial-tab="searchModalInitialTab"
    @added-external="reloadMap"
  />

</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import type { ReachListItem, ReachClickPayload } from '~/components/map/RunsMap.vue'
import type { ExploreReachGroup, ExploreScope } from '~/types/explore'
import { normalizeExploreScope } from '~/types/explore'

definePageMeta({ ssr: false })

const { apiBase } = useRuntimeConfig().public
const router = useRouter()
const route = useRoute()
let pendingFocusSlug: string | null = (route.query.focus as string) || null
const { isAuthenticated, getToken } = useAuth()
const db = useDashboards()

// ── Route-driven handle ───────────────────────────────────────────────────────
// handle is truthy when browsing /explore/{handle}; falsy = my runs (/explore)
const handle = computed(() => (route.params.handle as string | undefined) || undefined)

// Current user's handle — used by the list for reference-vs-own add dispatch,
// and as the map-click view-URL fallback when a run has no author_handle
// (e.g. /me/runs/map/all features). Fetched once when authenticated.
const myHandle = ref<string | null>(null)
async function loadMyHandle() {
  const token = await getToken()
  if (!token) return
  const res = await fetch(`${apiBase}/api/v1/me/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => null)
  if (!res?.ok) return
  const data = await res.json().catch(() => null)
  myHandle.value = data?.handle ?? null
}

// ── Scopes (web#335) ─────────────────────────────────────────────────────────
// 'mine' and 'community' live in the rail; Gauges still opens the legacy
// search modal until its slice moves it in.
const scope = ref<ExploreScope>('mine')

// Add-target shared by every scope's add path; the chip self-inits from the
// active dashboard and self-repairs (same contract as the modal chip).
const selectedDashboardId = ref<string | null>(null)

const communitySearch = useCommunitySearch()
const exploreAdd = useExploreAdd({ dashboardId: selectedDashboardId, myHandle })

// Community selection (map fly-to now; detail card arrives in a later slice)
const selectedRunSlug = ref<string | null>(null)

function setScope(s: ExploreScope) {
  if (scope.value === s) return
  scope.value = s
  hoveredSlug.value = null
  selectedRunSlug.value = null
  // Keep the scope in the URL for refresh/back/deep links; drop consumed
  // legacy keys so ?discover=true can't re-fire on the next mount.
  const q: Record<string, any> = { ...route.query }
  delete q.discover
  delete q.scope
  router.replace({ query: s === 'mine' ? q : { ...q, scope: s } })
  if (s === 'community' && !communitySearch.loadedOnce.value) {
    communitySearch.reload()
  }
}

function onScopeSelect(s: ExploreScope) {
  if (s === 'gauges') {
    // Interim: the Gauges scope still lives in the legacy modal.
    searchModalInitialTab.value = 'gauges'
    searchModalOpen.value = true
    return
  }
  setScope(s)
}

function onCommunitySelect(run: { slug: string }) {
  selectedRunSlug.value = run.slug
  mapRef.value?.flyToSlug(run.slug)
  listVisible.value = false
}

// ── Search box: one input, scope-owned state ─────────────────────────────────
const searchPlaceholder = computed(() => {
  if (handle.value) return 'Search runs, rivers…'
  if (scope.value === 'community') return 'Search all runs by name, river, paddler…'
  return 'Filter your runs…'
})
const searchText = computed({
  get: () => (!handle.value && scope.value === 'community') ? communitySearch.query.value : query.value,
  set: (v: string) => {
    if (!handle.value && scope.value === 'community') communitySearch.query.value = v
    else query.value = v
  },
})
function onSearchInput() {
  if (!handle.value && scope.value === 'community') communitySearch.onQueryInput()
}

// ── Map mode pill ─────────────────────────────────────────────────────────────
const modePill = computed(() => {
  if (handle.value) {
    return { dotClass: 'bg-primary-500', label: `@${handle.value} · ${allReaches.value.length} runs` }
  }
  if (scope.value === 'community') {
    return { dotClass: 'bg-green-500', label: `Community · ${allReaches.value.length} on map` }
  }
  return { dotClass: 'bg-primary-500', label: `My runs · ${allReaches.value.length} on map` }
})

// ── New reach / import / search modals ───────────────────────────────────────
const importModalOpen       = ref(false)
const searchModalOpen       = ref(false)
const searchModalInitialTab = ref<'mine' | 'discover' | 'community' | 'gauges'>('mine')

// ── Demo banner ───────────────────────────────────────────────────────────────
const showDemoBanner = ref(false)

// ── Sharing banner ────────────────────────────────────────────────────────────
const showSharingBanner = ref(false)

function dismissSharingBanner() {
  showSharingBanner.value = false
  localStorage.setItem('sharing-banner-dismissed', 'true')
}

onMounted(async () => {
  showDemoBanner.value = localStorage.getItem('demo-banner-dismissed') !== 'true'

  // Back-compat: ?browse=handle (old links) → canonical /explore/{handle}.
  // Run before the logged-out redirect so old links resolve to the intended user.
  if (route.query.browse) {
    const browseTarget = (route.query.browse as string).replace(/^@/, '').toLowerCase()
    router.replace(`/explore/${browseTarget}`)
    return
  }

  // Resolve auth authoritatively. The Supabase user ref (isAuthenticated) may not
  // be hydrated yet at mount, so don't trust it for the destructive redirect below;
  // getToken() awaits getSession() and reflects the real session state.
  const token = await getToken()
  const authed = !!token

  if (!authed && !handle.value) {
    // Logged-out on bare /explore → show official runs. (At /explore/h2oflows
    // handle is truthy, so this branch can't fire again — no redirect loop.)
    router.replace('/explore/h2oflows')
    return
  }

  if (authed) {
    db.load()
    loadMyHandle()
    mapToken.value = token
    if (localStorage.getItem('sharing-banner-dismissed') !== 'true') {
      showSharingBanner.value = true
    }
  }

  // wizard + scope deep links (only relevant on bare /explore, i.e. my-runs mode)
  if (!handle.value) {
    if (route.query.import === 'true') {
      importModalOpen.value = true
      router.replace({ query: {} })
    } else if (route.query.discover === 'true') {
      // Legacy deep link for the old modal's community tab → the real scope
      // (setScope strips the consumed ?discover key).
      setScope('community')
    } else if (route.query.scope) {
      const s = normalizeExploreScope(route.query.scope)
      if (s === 'gauges') {
        // Interim: Gauges still lives in the legacy modal.
        searchModalInitialTab.value = 'gauges'
        searchModalOpen.value = true
        router.replace({ query: {} })
      } else if (s) {
        setScope(s)
      } else {
        router.replace({ query: {} })
      }
    }
  }
})

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

// Auth header for my-runs and community (authed callers see past the anon
// special-only narrowing); browse-handle needs none. RunsMap re-fetches only
// when the Authorization header string changes — once, at token resolution.
const mapSourceHeaders = computed((): Record<string, string> => {
  if (handle.value) return {}
  return mapToken.value ? { Authorization: `Bearer ${mapToken.value}` } : {}
})

// ── Map source URL ────────────────────────────────────────────────────────────
// Community swaps the pin feed to MapCommunity, whose URL is debounced inside
// useCommunitySearch (one settled search = one map fetch — typing never
// storms RunsMap's sourceUrl watch).
const mapSourceUrl = computed((): string | null => {
  if (handle.value) {
    return `${apiBase}/api/v1/users/${encodeURIComponent(handle.value)}/runs/map/all`
  }
  if (!mapToken.value) return null
  if (scope.value === 'community') return communitySearch.mapUrl.value
  return `${apiBase}/api/v1/me/runs/map/all`
})

// ── Reach list ────────────────────────────────────────────────────────────────
const query = ref('')

// ── Sort mode (N.6) ───────────────────────────────────────────────────────
const sortMode = ref<'river' | 'upvotes'>('river')

// Reset sort mode when handle changes
watch(handle, () => { sortMode.value = 'river' })

// Upstream → downstream within a river group (issue #397). Tier rules and
// their reasoning live in utils/riverPosition.ts, shared with the dashboard
// and /my/runs so the surfaces can't disagree about the same data (#403).
function sortReachesByRiverPosition(reaches: ReachListItem[]): ReachListItem[] {
  return sortByRiverPosition(reaches, r => ({
    sequence: r.river_sequence ?? null,
    elevationFt: r.put_in_elevation_ft,
    lng: r.put_in_lng,
  }))
}

const filteredSidebarGroups = computed((): ExploreReachGroup[] => {
  const q = query.value.trim().toLowerCase()
  const items = q.length >= 2
    ? sidebarReaches.value.filter(r =>
        r.name.toLowerCase().includes(q) ||
        (r.river_name?.toLowerCase().includes(q) ?? false)
      )
    : sidebarReaches.value

  if (sortMode.value === 'upvotes') {
    const sorted = [...items].sort((a, b) => (b.upvote_count ?? 0) - (a.upvote_count ?? 0))
    return [{ name: '__flat__', reaches: sorted }]
  }

  const grouped = new Map<string, ReachListItem[]>()
  for (const r of items) {
    const key = r.river_name ?? 'No River'
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(r)
  }
  return [...grouped.entries()]
    .sort(([a], [b]) => a === 'No River' ? 1 : b === 'No River' ? -1 : a.localeCompare(b))
    .map(([name, reaches]) => ({ name, reaches: sortReachesByRiverPosition(reaches) }))
})

// count shown in sidebar badge: filtered total when search active, else full sidebar
const sidebarCount = computed(() => {
  if (query.value.trim().length >= 2) {
    return filteredSidebarGroups.value.reduce((sum, g) => sum + g.reaches.length, 0)
  }
  return sidebarReaches.value.length
})

const showReachList = computed(() => {
  if (!isAuthenticated.value && !handle.value) return false
  if (sidebarReaches.value.length === 0) return false
  if (query.value.length >= 2 && filteredSidebarGroups.value.length === 0) return false
  return true
})

// ── Map interaction ───────────────────────────────────────────────────────────
const mapRef      = ref<{ flyToSlug: (slug: string) => void; reloadSource: () => Promise<void> } | null>(null)
const hoveredSlug = ref<string | null>(null)
const mapReaches  = ref<ReachListItem[]>([])   // viewport-filtered (from map moveend)
const allReaches  = ref<ReachListItem[]>([])   // all loaded from source (not viewport-filtered)

// ── Zoom & Filter toggle ──────────────────────────────────────────────────────
const zoomFilter = ref(false)
// auto-enable when source loads >100 runs
watch(allReaches, (reaches) => {
  if (reaches.length > 100) zoomFilter.value = true
})

// sidebar source: all loaded OR viewport-filtered based on toggle
const sidebarReaches = computed((): ReachListItem[] =>
  zoomFilter.value ? mapReaches.value : allReaches.value
)

function onRowSelect(slug: string) {
  mapRef.value?.flyToSlug(slug)
  listVisible.value = false
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

// ── Channel stats (N.3) — computed from allReaches ────────────────────────
const channelStats = computed(() => {
  const runs = allReaches.value
  const runCount = runs.length
  const rivers = new Set(runs.map(r => r.river_name).filter((n): n is string => !!n))
  const totalUpvotes = runs.reduce((sum, r) => sum + (r.upvote_count ?? 0), 0)
  return { runCount, riverCount: rivers.size, totalUpvotes }
})

// Patch upvote state back into allReaches + mapReaches
function patchReachUpvote(slug: string, count: number | null, upvoted: boolean | null) {
  const patch = (arr: ReachListItem[]) => {
    const r = arr.find(x => x.slug === slug)
    if (!r) return
    if (count !== null) r.upvote_count = count
    if (upvoted !== null) r.user_upvoted = upvoted
  }
  patch(allReaches.value)
  patch(mapReaches.value)
}

function onMapHover(slug: string | null) {
  hoveredSlug.value = slug
}

// ── Map click → navigate straight to run detail ───────────────────────────────
function onReachClick(payload: ReachClickPayload) {
  // When browsing a handle, use that handle for the run URL.
  // Otherwise use the run's own authorHandle if available, else the current
  // user's own handle (falling back to 'h2oflows' if it hasn't resolved yet).
  const viewUrl = handle.value
    ? `/runs/${handle.value}/${payload.slug}`
    : payload.authorHandle
      ? `/runs/${payload.authorHandle}/${payload.slug}`
      : `/runs/${myHandle.value ?? 'h2oflows'}/${payload.slug}`

  navigateTo(viewUrl)
}

async function reloadMap() {
  await initMapToken()
  await mapRef.value?.reloadSource()
}

// ── Mobile list/map toggle ────────────────────────────────────────────────────
const listVisible = ref(false)
</script>

<style scoped>
/* Push MapLibre zoom controls below the mode label pill */
:deep(.maplibregl-ctrl-top-right) {
  top: 44px;
}
</style>
