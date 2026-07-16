<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-950">
    <AppHeader />

    <main class="max-w-5xl mx-auto px-4 py-6 space-y-6">

      <!-- Not authorized -->
      <div v-if="!isDataAdmin && authReady" class="mt-20 flex flex-col items-center gap-3 text-center">
        <svg class="w-10 h-10 text-neutral-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <h2 class="text-lg font-semibold">Access restricted</h2>
        <p class="text-sm text-neutral-500">You need data admin or site admin permissions to view this page.</p>
      </div>

      <!-- Loading auth -->
      <div v-else-if="!authReady" class="mt-20 flex justify-center">
        <div class="w-6 h-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
      </div>

      <!-- Admin UI -->
      <template v-else>
        <div class="flex items-center justify-between">
          <h1 class="text-xl font-bold text-neutral-900 dark:text-white">Admin</h1>
        </div>

        <!-- Tabs -->
        <div class="flex gap-1 border-b border-neutral-200 dark:border-neutral-800 overflow-x-auto">
          <button
            v-for="tab in visibleTabs" :key="tab.key"
            class="shrink-0 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors"
            :class="activeTab === tab.key
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'"
            @click="activateTab(tab.key)"
          >{{ tab.label }}</button>
        </div>

        <!-- Users & Roles tab -->
        <div v-if="activeTab === 'users'" class="grid grid-cols-1 md:grid-cols-[312px_1fr] gap-4 items-start">
          <AdminUserRail v-model:selection="usersSelection" @new-special-user="newSpecialUserOpen = true" />

          <div class="min-w-0">
            <SpecialUserDetail
              v-if="usersSelection?.kind === 'special' && selectedSpecialUser"
              :special-user="selectedSpecialUser"
              @add-member="openAddMember"
              @deleted="onSpecialUserDeleted"
            />
            <RoleDetail
              v-else-if="usersSelection?.kind === 'role' && selectedRole"
              :role="selectedRole"
              @add-member="openAddMember"
            />
            <UserDetail
              v-else-if="usersSelection?.kind === 'user'"
              :owner-id="usersSelection.ownerId"
            />
            <div v-else-if="specialUsersLoading" class="rounded-lg border border-neutral-200 dark:border-neutral-700 p-10 text-center text-sm text-neutral-400">
              Loading…
            </div>
            <div v-else class="rounded-lg border border-dashed border-neutral-200 dark:border-neutral-700 p-10 text-center text-sm text-neutral-400">
              Select a role or user from the list.
            </div>
          </div>
        </div>

        <!-- Gauges tab -->
        <div v-if="activeTab === 'gauges'">
          <!-- Summary row -->
          <div v-if="gaugeSummary" class="flex flex-wrap gap-3 mb-3 text-sm">
            <span class="text-neutral-500">{{ gaugeSummary.total }} gauges</span>
            <span v-if="gaugeSummary.unreachable" class="text-red-500 font-medium">{{ gaugeSummary.unreachable }} offline</span>
            <span v-if="gaugeSummary.stale" class="text-amber-500 font-medium">{{ gaugeSummary.stale }} stale</span>
            <span v-if="gaugeSummary.degraded" class="text-neutral-400">{{ gaugeSummary.degraded }} degraded</span>
            <span class="text-neutral-400">{{ gaugeSummary.healthy }} healthy</span>
          </div>

          <!-- Filters -->
          <div class="flex flex-wrap items-center gap-2 mb-3">
            <UInput v-model="gaugeSearch" icon="i-heroicons-magnifying-glass" placeholder="Search name or ID…" size="sm" class="w-48" @input="debounceGaugeLoad" />
            <div class="flex rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 text-xs">
              <button v-for="f in gaugeHealthFilters" :key="f.value"
                class="px-2.5 py-1.5 transition-colors"
                :class="gaugeHealthFilter === f.value ? 'bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200' : 'text-neutral-400 hover:text-neutral-600'"
                @click="gaugeHealthFilter = f.value; loadAdminGauges()"
              >{{ f.label }}</button>
            </div>
            <label class="flex items-center gap-1.5 text-xs text-neutral-500 cursor-pointer select-none">
              <input type="checkbox" v-model="gaugeShowRetired" class="rounded" @change="loadAdminGauges()" />
              Show retired
            </label>
          </div>

          <!-- Table -->
          <div v-if="gaugesLoading" class="space-y-1.5">
            <div v-for="i in 8" :key="i" class="h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
          </div>
          <div v-else-if="adminGauges.length === 0" class="px-4 py-10 text-center text-sm text-neutral-400">
            No gauges match filters
          </div>
          <div v-else class="rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
            <table class="w-full text-xs">
              <thead class="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 dark:text-neutral-400">
                <tr>
                  <th class="text-left px-3 py-2 font-medium">Gauge</th>
                  <th class="text-left px-3 py-2 font-medium hidden sm:table-cell">Source</th>
                  <th class="text-left px-3 py-2 font-medium">Health</th>
                  <th class="text-right px-3 py-2 font-medium hidden md:table-cell">Last reading</th>
                  <th class="text-right px-3 py-2 font-medium hidden md:table-cell">Fails</th>
                  <th class="text-right px-3 py-2 font-medium hidden lg:table-cell">Last CFS</th>
                  <th class="text-right px-3 py-2 font-medium hidden sm:table-cell">Reaches</th>
                  <th class="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800 bg-white dark:bg-neutral-900">
                <tr v-for="g in adminGauges" :key="g.id" class="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                  <td class="px-3 py-2">
                    <p class="font-medium text-neutral-800 dark:text-neutral-100 truncate max-w-50">{{ g.name || g.external_id }}</p>
                    <a
                      v-if="gaugeSourceUrl(g.source, g.external_id)"
                      :href="gaugeSourceUrl(g.source, g.external_id)!"
                      target="_blank"
                      rel="noopener"
                      class="text-neutral-400 font-mono hover:underline hover:text-primary-500 transition-colors"
                      @click.stop
                    >{{ g.external_id }}</a>
                    <p v-else class="text-neutral-400 font-mono">{{ g.external_id }}</p>
                  </td>
                  <td class="px-3 py-2 hidden sm:table-cell text-neutral-500 uppercase font-mono">{{ g.source }}</td>
                  <td class="px-3 py-2">
                    <span :class="['inline-flex items-center rounded-full px-1.5 py-0.5 font-medium', gaugeHealthClass(g.poll_health)]">
                      {{ g.poll_health }}
                    </span>
                    <p v-if="g.status !== 'active'" class="text-neutral-400 mt-0.5">{{ g.status }}</p>
                  </td>
                  <td class="px-3 py-2 text-right hidden md:table-cell text-neutral-500">
                    {{ g.last_reading_at ? relativeDate(g.last_reading_at) : '—' }}
                  </td>
                  <td class="px-3 py-2 text-right hidden md:table-cell" :class="g.consecutive_poll_failures > 0 ? 'text-amber-500' : 'text-neutral-400'">
                    {{ g.consecutive_poll_failures || '—' }}
                  </td>
                  <td class="px-3 py-2 text-right hidden lg:table-cell tabular-nums">
                    <span v-if="g.last_reading_cfs != null" class="text-neutral-700 dark:text-neutral-300">
                      {{ g.last_reading_cfs.toLocaleString() }}
                    </span>
                    <span v-else-if="g.consecutive_poll_failures > 0" class="text-amber-500" title="Poll failures — no current reading">err</span>
                    <em v-else class="text-neutral-400 not-italic">no data</em>
                  </td>
                  <td class="px-3 py-2 text-right hidden sm:table-cell text-neutral-500">{{ g.reach_count }}</td>
                  <td class="px-3 py-2">
                    <div class="flex items-center justify-end gap-1">
                      <UButton size="xs" variant="ghost" color="neutral" :loading="gaugePollId === g.id" title="Force poll" @click="adminPollGauge(g.id)">
                        <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M13.5 8A5.5 5.5 0 1 1 10 3.07"/><path d="M10 2v3h3"/>
                        </svg>
                      </UButton>
                      <UButton v-if="g.status !== 'retired'" size="xs" variant="ghost" color="neutral" title="Retire gauge" @click="adminRetireGauge(g.id)">
                        <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M2 8h12M8 2l6 6-6 6"/>
                        </svg>
                      </UButton>
                      <UButton v-if="g.status === 'retired' || g.status === 'inactive'" size="xs" variant="ghost" color="primary" title="Reactivate" @click="adminReactivateGauge(g.id)">
                        <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-8.68"/>
                        </svg>
                      </UButton>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
            <!-- Pagination -->
            <div v-if="gaugeTotal > gaugeLimit" class="flex items-center justify-between px-3 py-2 border-t border-neutral-100 dark:border-neutral-800 text-xs text-neutral-500">
              <span>{{ gaugeOffset + 1 }}–{{ Math.min(gaugeOffset + gaugeLimit, gaugeTotal) }} of {{ gaugeTotal }}</span>
              <div class="flex gap-1">
                <UButton size="xs" variant="outline" color="neutral" :disabled="gaugeOffset === 0" @click="gaugeOffset -= gaugeLimit; loadAdminGauges()">Prev</UButton>
                <UButton size="xs" variant="outline" color="neutral" :disabled="gaugeOffset + gaugeLimit >= gaugeTotal" @click="gaugeOffset += gaugeLimit; loadAdminGauges()">Next</UButton>
              </div>
            </div>
          </div>
        </div>

        <!-- Flags tab -->
        <div v-if="activeTab === 'flags'">
          <div class="flex items-center justify-between mb-4">
            <p class="text-sm text-neutral-500">Open abuse reports</p>
            <button class="text-xs text-neutral-400 hover:text-neutral-600 transition-colors" @click="loadFlags">Refresh</button>
          </div>

          <div v-if="flagsLoading" class="space-y-2">
            <div v-for="i in 3" :key="i" class="h-14 rounded-lg bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
          </div>

          <div v-else-if="flags.length === 0" class="py-10 text-center text-sm text-neutral-400">
            No open flags.
          </div>

          <div v-else class="divide-y divide-neutral-100 dark:divide-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
            <div
              v-for="flag in flags"
              :key="flag.id"
              class="flex items-start gap-3 px-4 py-3 bg-white dark:bg-neutral-900"
            >
              <div class="flex-1 min-w-0 space-y-0.5">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-xs font-medium text-neutral-700 dark:text-neutral-300 truncate">
                    {{ flag.target_name || flag.target_id.slice(0, 8) }}
                  </span>
                  <span class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide"
                    :class="flag.target_type === 'run'
                      ? 'bg-primary-100 dark:bg-primary-950 text-primary-600 dark:text-primary-400'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'"
                  >{{ flag.target_type }}</span>
                  <span class="text-[10px] text-neutral-400 uppercase tracking-wide">{{ flag.reason }}</span>
                </div>
                <p class="text-xs text-neutral-400">
                  @{{ flag.reporter_handle }}
                  <span class="text-neutral-300 dark:text-neutral-600 mx-1">·</span>
                  {{ new Date(flag.created_at).toLocaleDateString() }}
                </p>
                <p v-if="flag.note" class="text-xs text-neutral-500 italic">{{ flag.note }}</p>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <NuxtLink
                  v-if="flag.target_slug"
                  :to="flag.target_type === 'run' ? `/runs/u/${flag.target_id}` : `/reports/${flag.target_id}`"
                  target="_blank"
                  class="p-1.5 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                  title="View"
                >
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </NuxtLink>
                <button
                  class="px-2 py-1 rounded text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 transition-colors"
                  title="Dismiss — no action needed"
                  @click="resolveFlag(flag.id, 'dismiss')"
                >Dismiss</button>
                <button
                  class="px-2 py-1 rounded text-xs text-red-500 hover:text-red-700 border border-red-200 dark:border-red-900 hover:border-red-400 transition-colors"
                  title="Remove content"
                  @click="resolveFlag(flag.id, 'action')"
                >Remove</button>
              </div>
            </div>
          </div>
        </div>
      </template>
    </main>

    <!-- New special user modal -->
    <NewSpecialUserModal v-model:open="newSpecialUserOpen" @created="onSpecialUserCreated" />

    <!-- Add member modal (shared: special-user members + role members) -->
    <AddMemberModal v-model:open="addMemberOpen" :role-name="addMemberRoleName" :exclude-ids="addMemberExcludeIds" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAdminUsersRoles, type AdminSelection, type SpecialUser, type Role } from '~/composables/useAdminUsersRoles'

definePageMeta({ ssr: false })

const { isAdmin, isDataAdmin, loadAdminRoles, getToken } = useAuth()
const { apiBase } = useRuntimeConfig().public

// Auth readiness — wait for roles to load before showing gated UI
const authReady = ref(false)
onMounted(async () => {
  await loadAdminRoles()
  authReady.value = true
  if (isDataAdmin.value) applyDefaultTab()
})

// Hard-refresh race: Supabase restores the session asynchronously, so
// user.value may be null when onMounted runs. Once isDataAdmin flips to
// true we trigger the default-tab load if it hasn't happened yet.
watch(isDataAdmin, (val) => {
  if (val && authReady.value) applyDefaultTab()
})

function relativeDate(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const m = Math.floor(ms / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
const activeTab = ref('gauges')
let defaultTabApplied = false

function applyDefaultTab() {
  if (defaultTabApplied) return
  defaultTabApplied = true
  activateTab(isAdmin.value ? 'users' : 'gauges')
}

function activateTab(key: string) {
  activeTab.value = key
  // Always refresh Users & Roles on tab entry: the composable state is
  // module-scoped and survives soft navigation — including a loaded-but-
  // failed state — so gating on specialUsersLoaded left the tab empty after
  // a client-side nav until a hard refresh reset module state.
  if (key === 'users') loadUsersRolesTab()
  if (key === 'gauges' && adminGauges.value.length === 0) loadAdminGauges()
  if (key === 'flags') loadFlags()
}

const visibleTabs = computed(() => {
  const tabs: { key: string; label: string }[] = []
  if (isAdmin.value) tabs.push({ key: 'users', label: 'Users & Roles' })
  tabs.push({ key: 'gauges', label: 'Gauges' })
  tabs.push({ key: 'flags', label: openFlagCount.value > 0 ? `Flags (${openFlagCount.value})` : 'Flags' })
  return tabs
})

// ── Users & Roles ──────────────────────────────────────────────────────────────
const {
  specialUsers, specialUsersLoading, loadSpecialUsers,
  roles, loadRoles,
} = useAdminUsersRoles()

const usersSelection = ref<AdminSelection | null>(null)

const selectedSpecialUser = computed<SpecialUser | null>(() => {
  if (usersSelection.value?.kind !== 'special') return null
  const sel = usersSelection.value
  return specialUsers.value.find(u => u.id === sel.id) ?? null
})

const selectedRole = computed<Role | null>(() => {
  if (usersSelection.value?.kind !== 'role') return null
  const sel = usersSelection.value
  return roles.value.find(r => r.name === sel.name) ?? null
})

async function loadUsersRolesTab() {
  await Promise.all([loadSpecialUsers(), loadRoles()])
}

// No default selection — the tab opens as a plain list of roles & users
// (auto-selecting h2oflows dropped an unexplained info card on the user; the
// list-first view matches the tab's name). Detail renders on click.

function onSpecialUserDeleted() {
  usersSelection.value = null
}

const newSpecialUserOpen = ref(false)
function onSpecialUserCreated(id: string) {
  newSpecialUserOpen.value = false
  usersSelection.value = { kind: 'special', id }
}

const addMemberOpen = ref(false)
const addMemberRoleName = ref('')
const addMemberExcludeIds = ref<string[]>([])
function openAddMember(roleName: string, excludeIds: string[]) {
  addMemberRoleName.value = roleName
  addMemberExcludeIds.value = excludeIds
  addMemberOpen.value = true
}

// ── Admin gauges ──────────────────────────────────────────────────────────────

interface AdminGauge {
  id: string
  external_id: string
  source: string
  name: string
  status: string
  auto_managed: boolean
  poll_health: string
  consecutive_poll_failures: number
  last_reading_at: string | null
  last_poll_success_at: string | null
  last_poll_failure_at: string | null
  seasonal_start_mmdd: string | null
  seasonal_end_mmdd: string | null
  state_abbr: string | null
  reach_count: number
  last_reading_cfs: number | null
}

interface GaugeSummary { healthy: number; degraded: number; stale: number; unreachable: number; total: number }

const adminGauges    = ref<AdminGauge[]>([])
const gaugeSummary   = ref<GaugeSummary | null>(null)
const gaugesLoading  = ref(false)
const gaugeTotal     = ref(0)
const gaugeLimit     = ref(50)
const gaugeOffset    = ref(0)
const gaugeSearch    = ref('')
const gaugeShowRetired  = ref(false)
const gaugeHealthFilter = ref('')
const gaugePollId    = ref<string | null>(null)

const gaugeHealthFilters = [
  { label: 'All',         value: '' },
  { label: 'Stale',       value: 'stale' },
  { label: 'Offline',     value: 'unreachable' },
  { label: 'Healthy',     value: 'healthy' },
]

let gaugeSearchTimer: ReturnType<typeof setTimeout> | null = null
function debounceGaugeLoad() {
  if (gaugeSearchTimer) clearTimeout(gaugeSearchTimer)
  gaugeSearchTimer = setTimeout(() => { gaugeOffset.value = 0; loadAdminGauges() }, 300)
}

async function loadAdminGauges() {
  gaugesLoading.value = true
  try {
    const token = await getToken()
    const params = new URLSearchParams({
      limit: String(gaugeLimit.value),
      offset: String(gaugeOffset.value),
    })
    if (gaugeSearch.value) params.set('q', gaugeSearch.value)
    if (gaugeHealthFilter.value) params.set('poll_health', gaugeHealthFilter.value)
    if (gaugeShowRetired.value) params.set('show_retired', 'true')
    const res = await fetch(`${apiBase}/api/v1/admin/gauges?${params}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (res.ok) {
      const data = await res.json()
      adminGauges.value  = data.gauges ?? []
      gaugeTotal.value   = data.total ?? 0
      gaugeSummary.value = data.summary ?? null
    }
  } finally {
    gaugesLoading.value = false
  }
}

async function adminPollGauge(id: string) {
  gaugePollId.value = id
  try {
    const token = await getToken()
    await fetch(`${apiBase}/api/v1/admin/gauges/${id}/poll`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    await loadAdminGauges()
  } finally {
    gaugePollId.value = null
  }
}

async function adminRetireGauge(id: string) {
  const token = await getToken()
  await fetch(`${apiBase}/api/v1/admin/gauges/${id}/retire`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  await loadAdminGauges()
}

async function adminReactivateGauge(id: string) {
  const token = await getToken()
  await fetch(`${apiBase}/api/v1/admin/gauges/${id}/reactivate`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  await loadAdminGauges()
}

function gaugeHealthClass(h: string): string {
  if (h === 'unreachable') return 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
  if (h === 'stale')       return 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
  if (h === 'degraded')    return 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
  return 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
}

// Load gauges when tab activates
watch(activeTab, (tab) => {
  if (tab === 'gauges' && adminGauges.value.length === 0) loadAdminGauges()
})

// ── Abuse Flags ───────────────────────────────────────────────────────────────
interface AbuseFlag {
  id: string; target_type: string; target_id: string
  reporter_id: string; reporter_handle: string
  reason: string; note?: string; created_at: string
  target_name?: string; target_slug?: string
}

const flags = ref<AbuseFlag[]>([])
const flagsLoading = ref(false)
const openFlagCount = computed(() => flags.value.length)

async function loadFlags() {
  flagsLoading.value = true
  try {
    const token = await getToken()
    const res = await fetch(`${apiBase}/api/v1/admin/moderation/queue`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) return
    const data = await res.json()
    flags.value = data.flags ?? []
  } finally {
    flagsLoading.value = false
  }
}

async function resolveFlag(flagId: string, action: 'dismiss' | 'action') {
  const token = await getToken()
  const path = action === 'dismiss' ? 'dismiss' : 'action'
  await fetch(`${apiBase}/api/v1/admin/moderation/flags/${flagId}/${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  flags.value = flags.value.filter(f => f.id !== flagId)
}
</script>
