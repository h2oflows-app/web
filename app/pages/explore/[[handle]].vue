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
            <RunUserHandlePicker />
          </template>
        </div>

        <!-- Search + mobile map toggle (all modes) -->
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
            Filter to view
          </label>
          <span class="text-xs text-neutral-400 tabular-nums">{{ sidebarCount }} runs</span>
        </div>

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
              <!-- Add to dashboard: use isOtherUsersRun to decide reference vs own-add -->
              <div
                v-if="isAuthenticated && reach.id && isOtherUsersRun(reach.author_handle ?? handle ?? undefined)"
                class="browse-ref-anchor shrink-0 relative"
                @click.stop
              >
                <!-- Reference-add (another user's run) -->
                <button
                  class="p-1 rounded transition-colors"
                  :class="addedRefIds.has(reach.slug) ? 'text-primary-500' : 'text-neutral-400 dark:text-neutral-500 hover:text-primary-500 dark:hover:text-primary-400'"
                  :disabled="addingRefId === reach.slug"
                  aria-label="Add to dashboard"
                  @click="db.dashboards.value.length <= 1 ? addBrowseReference(reach, db.dashboards.value[0]?.id ?? null) : (browseRefDropdownId = browseRefDropdownId === reach.slug ? null : reach.slug)"
                >
                  <span v-if="addingRefId === reach.slug" class="w-4 h-4 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin inline-block"/>
                  <svg v-else-if="addedRefIds.has(reach.slug)" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
                  <svg v-else class="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="10" cy="10" r="8"/><line x1="10" y1="6" x2="10" y2="14"/><line x1="6" y1="10" x2="14" y2="10"/></svg>
                </button>
                <div
                  v-if="browseRefDropdownId === reach.slug"
                  class="absolute right-0 top-full mt-1 z-40 min-w-40 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg overflow-hidden"
                >
                  <p class="px-3 pt-2 pb-1 text-[10px] text-neutral-400 uppercase tracking-wide">Add to dashboard</p>
                  <button
                    v-for="dashboard in db.dashboards.value"
                    :key="dashboard.id"
                    class="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300"
                    @click="addBrowseReference(reach, dashboard.id)"
                  >{{ dashboard.name }}</button>
                </div>
              </div>
              <!-- Own runs: membership picker -->
              <div
                v-else-if="isAuthenticated && !isOtherUsersRun(reach.author_handle ?? handle ?? undefined)"
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
              <!-- Edit (mine) / View (browsing) link -->
              <NuxtLink
                :to="handle ? `/runs/${handle}/${reach.slug}` : `/my/runs/${reach.slug}`"
                class="shrink-0 p-0.5 rounded text-neutral-300 dark:text-neutral-600 hover:text-primary-500 dark:hover:text-primary-400 transition-opacity opacity-60 sm:opacity-0 sm:group-hover:opacity-100 hover:opacity-100"
                :aria-label="handle ? 'View run' : 'Edit run'"
                @click.stop
              >
                <!-- Pencil for edit (mine), external-link for browse -->
                <svg v-if="!handle" class="w-3 h-3" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M13 4l3 3-9 9-4 1 1-4 9-9z"/>
                </svg>
                <svg v-else class="w-3 h-3" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
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

          <!-- Map click popup: Add to dashboard / View run -->
          <Transition name="popup">
            <div
              v-if="popupRun"
              class="absolute z-30 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg px-4 py-3 min-w-52 max-w-72"
              :style="popupStyle"
            >
              <div class="flex items-start justify-between gap-2 mb-2">
                <p class="text-sm font-semibold text-neutral-800 dark:text-neutral-200 truncate flex-1">{{ popupRun.name }}</p>
                <button class="shrink-0 text-neutral-300 hover:text-neutral-500 dark:text-neutral-600 dark:hover:text-neutral-400" @click="dismissPopup">
                  <svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
                </button>
              </div>
              <div class="flex items-center gap-2">
                <!-- Add to dashboard -->
                <div class="relative flex-1 popup-ref-anchor">
                  <button
                    class="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium transition-colors"
                    @click="db.dashboards.value.length <= 1 ? addPopupRunToDashboard(db.dashboards.value[0]?.id ?? null) : (popupDropdownOpen = !popupDropdownOpen)"
                  >
                    <svg class="w-3 h-3" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="10" cy="10" r="8"/><line x1="10" y1="6" x2="10" y2="14"/><line x1="6" y1="10" x2="14" y2="10"/></svg>
                    Add +
                  </button>
                  <div
                    v-if="popupDropdownOpen && db.dashboards.value.length > 1"
                    class="absolute left-0 top-full mt-1 z-40 min-w-40 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg overflow-hidden"
                  >
                    <button
                      v-for="d in db.dashboards.value"
                      :key="d.id"
                      class="w-full px-3 py-2 text-xs text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                      @click="addPopupRunToDashboard(d.id)"
                    >{{ d.name }}</button>
                  </div>
                </div>
                <!-- View run detail -->
                <NuxtLink
                  :to="popupRun.viewUrl"
                  class="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                  @click="dismissPopup"
                >
                  View →
                </NuxtLink>
              </div>
            </div>
          </Transition>

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
const { addReachToWatchlist, addUserReachToWatchlist, addReferenceToWatchlist } = useWatchlistSync()

// ── Route-driven handle ───────────────────────────────────────────────────────
// handle is truthy when browsing /explore/{handle}; falsy = my runs (/explore)
const handle = computed(() => (route.params.handle as string | undefined) || undefined)

// Current user's handle — used to decide reference (other user's run) vs slug-add
// (own run). Fetched once when authenticated.
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
// A run owned by someone other than the current user → add by reference, not fork.
function isOtherUsersRun(ownerHandle: string | null | undefined): boolean {
  if (!ownerHandle) return false
  if (!myHandle.value) return true   // unknown self → never fork another's run
  return ownerHandle.toLowerCase() !== myHandle.value.toLowerCase()
}

// ── New reach / import / search modals ───────────────────────────────────────
const importModalOpen       = ref(false)
const searchModalOpen       = ref(false)
const searchModalInitialTab = ref<'mine' | 'discover'>('mine')

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

// ── Browse mode: reference-add per run ────────────────────────────────────────
const browseRefDropdownId = ref<string | null>(null)
const addingRefId         = ref<string | null>(null)
const addedRefIds         = ref<Set<string>>(new Set())

async function addBrowseReference(reach: ReachListItem, dashId: string | null) {
  addingRefId.value = reach.slug
  browseRefDropdownId.value = null
  try {
    // Browse lists one user's runs (handle). Another user's run → reference
    // (keeps their ownership, read-only). Own run → slug add (editable).
    if (reach.id && isOtherUsersRun(reach.author_handle ?? handle.value)) {
      await addReferenceToWatchlist(reach.id, dashId)
    } else {
      await addReachToWatchlist(reach.slug, dashId)
    }
    addedRefIds.value = new Set([...addedRefIds.value, reach.slug])
    setTimeout(() => {
      addedRefIds.value = new Set([...addedRefIds.value].filter(x => x !== reach.slug))
    }, 3000)
  } finally {
    addingRefId.value = null
  }
}

function onDocClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (dropdownSlug.value && !target.closest('.dashboard-dropdown-anchor')) dropdownSlug.value = null
  if (browseRefDropdownId.value && !target.closest('.browse-ref-anchor')) browseRefDropdownId.value = null
  if (popupDropdownOpen.value && !target.closest('.popup-ref-anchor')) popupDropdownOpen.value = false
}

onMounted(async () => {
  showDemoBanner.value = localStorage.getItem('demo-banner-dismissed') !== 'true'
  document.addEventListener('click', onDocClick)

  if (isAuthenticated.value) {
    db.load()
    loadMyHandle()
    await initMapToken()
    if (localStorage.getItem('sharing-banner-dismissed') !== 'true') {
      showSharingBanner.value = true
    }
  } else if (!handle.value) {
    // Logged-out user on bare /explore — redirect to /explore/h2oflows once
    // auth state is resolved. Guard against loop by checking we're not already there.
    router.replace('/explore/h2oflows')
    return
  }

  // wizard paths (only relevant on bare /explore, i.e. my-runs mode)
  if (!handle.value) {
    if (route.query.import === 'true') {
      importModalOpen.value = true
      router.replace({ query: {} })
    } else if (route.query.discover === 'true') {
      searchModalInitialTab.value = 'discover'
      searchModalOpen.value = true
      router.replace({ query: {} })
    }
  }

  // Back-compat: ?browse=handle query param → redirect to /explore/{handle}
  if (route.query.browse) {
    const browseTarget = (route.query.browse as string).replace(/^@/, '').toLowerCase()
    router.replace(`/explore/${browseTarget}`)
    return
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

// Include auth header only for my-runs (no handle); public user runs need no auth
const mapSourceHeaders = computed((): Record<string, string> => {
  if (handle.value) return {}
  return mapToken.value ? { Authorization: `Bearer ${mapToken.value}` } : {}
})

// ── Map source URL ────────────────────────────────────────────────────────────
const mapSourceUrl = computed((): string | null => {
  if (handle.value) {
    return `${apiBase}/api/v1/users/${encodeURIComponent(handle.value)}/runs/map/all`
  }
  if (!mapToken.value) return null
  return `${apiBase}/api/v1/me/runs/map/all`
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
const mapZoom     = ref(4)

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

// ── Map click popup ───────────────────────────────────────────────────────────
interface PopupRun { slug: string; name: string; id: string | null; authorHandle: string | null; viewUrl: string; point?: { x: number; y: number } }
const popupRun = ref<PopupRun | null>(null)
// Popup's own dashboard-picker state — kept separate from the sidebar's
// slug-keyed browseRefDropdownId so opening it here doesn't also open the
// matching sidebar row's dropdown.
const popupDropdownOpen = ref(false)

const popupStyle = computed((): Record<string, string> => {
  const pt = popupRun.value?.point
  if (!pt) return { top: '12px', left: '50%', transform: 'translateX(-50%)' }
  return {
    left: `${Math.max(8, pt.x - 100)}px`,
    top:  `${Math.max(8, pt.y - 148)}px`,
  }
})

function onReachClick(payload: ReachClickPayload) {
  // When browsing a handle, use that handle for the run URL.
  // Otherwise use the run's own authorHandle if available, else my-runs path.
  const viewUrl = handle.value
    ? `/runs/${handle.value}/${payload.slug}`
    : payload.authorHandle
      ? `/runs/${payload.authorHandle}/${payload.slug}`
      : `/my/runs/${payload.slug}`

  if (!isAuthenticated.value) {
    navigateTo(viewUrl)
    return
  }

  // Show popup with add/view options
  popupDropdownOpen.value = false
  popupRun.value = {
    slug:         payload.slug,
    name:         payload.name ?? payload.slug,
    id:           payload.id ?? null,
    authorHandle: payload.authorHandle ?? (handle.value ?? null),
    viewUrl,
    point:        payload.point,
  }
}

function dismissPopup() { popupRun.value = null; popupDropdownOpen.value = false }

async function addPopupRunToDashboard(dashId: string | null) {
  if (!popupRun.value) return
  const p = popupRun.value
  popupRun.value = null
  popupDropdownOpen.value = false
  // Another user's run → reference; own run → slug add.
  if (p.id && isOtherUsersRun(p.authorHandle)) {
    await addReferenceToWatchlist(p.id, dashId)
  } else {
    await addReachToWatchlist(p.slug, dashId)
  }
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
      if (item.reach_slug === r.slug && item.dashboard_id) {
        ids.add(item.dashboard_id)
      }
    }
    membershipDashboardIds.value = ids
  } finally {
    membershipLoading.value = false
  }
}

async function toggleDashboardForUserReach(r: ReachListItem, dashboardId: string) {
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
    // Use gauge-linked path when run has a gauge so it appears in river.reaches
    if (r.gauge_id) {
      await addUserReachToWatchlist(r.gauge_id, r.slug, dashboardId)
    } else {
      await addReachToWatchlist(r.slug, dashboardId)
    }
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
