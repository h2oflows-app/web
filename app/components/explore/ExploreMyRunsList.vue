<template>
  <!-- Backdrop: consumes the click that closes the dashboard dropdown so it doesn't hit reach rows -->
  <div v-if="dropdownSlug !== null" class="fixed inset-0 z-30" @click.stop="dropdownSlug = null" />

  <div class="flex-1 overflow-y-auto">
    <div v-for="group in groups" :key="group.name">
      <!-- River header (collapsible) -->
      <button
        v-if="group.name !== '__flat__'"
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
        @mouseenter="emit('hover', reach.slug)"
        @mouseleave="emit('hover', null)"
        @click="emit('select', reach.slug)"
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
        <!-- Add to dashboard: use reachIsOthers to decide reference vs own-add -->
        <div
          v-if="isAuthenticated && reach.id && reachIsOthers(reach.author_handle)"
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
          v-else-if="isAuthenticated && !reachIsOthers(reach.author_handle)"
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
        <!-- Upvote button (browse mode: interactive; MY mode: count only) -->
        <template v-if="reach.id">
          <RunUpvoteButton
            v-if="handle"
            :run-id="reach.id"
            :count="reach.upvote_count ?? 0"
            :upvoted="reach.user_upvoted ?? false"
            size="sm"
            @click.stop
            @update:count="(c) => emit('patchUpvote', { slug: reach.slug, count: c, upvoted: null })"
            @update:upvoted="(u) => emit('patchUpvote', { slug: reach.slug, count: null, upvoted: u })"
          />
          <span
            v-else-if="(reach.upvote_count ?? 0) > 0"
            class="text-xs text-neutral-300 dark:text-neutral-600 shrink-0 tabular-nums"
            title="Upvotes"
          >▲{{ reach.upvote_count }}</span>
        </template>
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
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import type { ReachListItem } from '~/components/map/RunsMap.vue'
import type { ExploreReachGroup } from '~/types/explore'

// The river-grouped run list from /explore, extracted 1:1 (web#335 PR 2).
// Self-contained: membership picker, browse reference-add, and their
// dropdown/backdrop plumbing live here; the page only supplies the grouped
// rows and reacts to hover/select.
const props = defineProps<{
  groups: ExploreReachGroup[]
  // Browse-mode handle (/explore/{handle}); undefined = my-runs mode.
  handle?: string
  // Current user's handle — reference-vs-own add dispatch (see reachIsOthers).
  myHandle: string | null
  hoveredSlug: string | null
}>()

const emit = defineEmits<{
  (e: 'hover', slug: string | null): void
  (e: 'select', slug: string): void
  (e: 'patchUpvote', p: { slug: string; count: number | null; upvoted: boolean | null }): void
}>()

const { bandSolid } = useFlowBandPalette()
const { apiBase } = useRuntimeConfig().public
const { isAuthenticated, getToken } = useAuth()
const db = useDashboards()
const { addReachToWatchlist, addUserReachToWatchlist, addReferenceToWatchlist } = useWatchlistSync()

// A run owned by someone other than the current user → add by reference, not fork.
function isOtherUsersRun(ownerHandle: string | null | undefined): boolean {
  if (!ownerHandle) return false
  if (!props.myHandle) return true   // unknown self → never fork another's run
  return ownerHandle.toLowerCase() !== props.myHandle.toLowerCase()
}
// On bare /explore (my runs) every listed run is the current user's, so it's never
// "someone else's". Only when browsing /explore/{handle} can a run belong to another
// user. Gating on handle also avoids a wrong add-button flash before myHandle
// resolves on the my-runs view.
function reachIsOthers(ownerHandle: string | null | undefined): boolean {
  if (!props.handle) return false
  return isOtherUsersRun(ownerHandle ?? props.handle)
}

// ── Collapsible river groups ──────────────────────────────────────────────────
const collapsedRivers = ref(new Set<string>())

function toggleRiverCollapse(name: string) {
  const next = new Set(collapsedRivers.value)
  if (next.has(name)) next.delete(name)
  else                next.add(name)
  collapsedRivers.value = next
}

// ── Hover sync: map → row scroll-into-view ────────────────────────────────────
const reachRefs = new Map<string, HTMLElement>()
function setReachRef(slug: string, el: HTMLElement | null) {
  if (el) reachRefs.set(slug, el)
  else    reachRefs.delete(slug)
}
watch(() => props.hoveredSlug, (slug) => {
  if (slug) {
    nextTick(() => {
      reachRefs.get(slug)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }
})

// ── Own-run membership picker ─────────────────────────────────────────────────
const dropdownSlug           = ref<string | null>(null)
const membershipDashboardIds = ref<Set<string>>(new Set())
const membershipLoading      = ref(false)

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
        // The dashboard hides trashed runs by run ID; this previously deleted
        // by slug and never matched, so re-adding a trashed run looked like a
        // no-op (web#335 fix-in-port). Slug delete kept to clear legacy debris.
        let changed = false
        if (r.id && set.delete(r.id)) changed = true
        if (set.delete(r.slug)) changed = true
        if (changed) localStorage.setItem(key, JSON.stringify([...set]))
      } catch {}
    }
  }
}

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
    if (reach.id && reachIsOthers(reach.author_handle)) {
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
}
onMounted(() => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))
</script>
