<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-950">
    <AppHeader />

    <main class="max-w-3xl mx-auto px-4 py-6 space-y-5">

      <!-- Auth gate -->
      <div v-if="!isAuthenticated && authReady" class="mt-20 flex flex-col items-center gap-3 text-center">
        <svg class="w-10 h-10 text-neutral-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
        <h2 class="text-lg font-semibold">Sign in to view your runs</h2>
        <NuxtLink to="/login" class="text-sm text-primary-600 dark:text-primary-400 hover:underline">Sign in</NuxtLink>
      </div>

      <div v-else-if="!authReady" class="mt-20 flex justify-center">
        <div class="w-6 h-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
      </div>

      <template v-else>
        <div class="flex items-center justify-between">
          <h1 class="text-xl font-bold text-neutral-900 dark:text-white">My Runs</h1>
          <div class="reach-picker-anchor relative">
            <UButton icon="i-heroicons-plus" size="sm" @click="reachPickerOpen = !reachPickerOpen">New Run</UButton>
            <div
              v-if="reachPickerOpen"
              class="absolute right-0 top-full mt-1 z-40 w-64 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg overflow-hidden"
            >
              <button
                class="w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                @click="reachPickerOpen = false; router.push('/my/runs/new')"
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
        </div>

        <RunImportModal v-model:open="importModalOpen" @imported="load" />

        <!-- Loading -->
        <div v-if="loading" class="space-y-2">
          <div v-for="i in 4" :key="i" class="h-12 rounded-lg bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
        </div>

        <!-- Error -->
        <div v-else-if="error" class="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-600 dark:text-red-400">
          {{ error }}
        </div>

        <!-- Empty state -->
        <div v-else-if="reaches.length === 0" class="mt-10 flex flex-col items-center gap-3 text-center text-neutral-400">
          <svg class="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M3 6h18M3 12h18M3 18h18" stroke-linecap="round"/>
          </svg>
          <p class="text-sm">No runs yet. Create your first custom run.</p>
        </div>

        <!-- Grouped accordion -->
        <div v-else class="divide-y divide-neutral-100 dark:divide-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
          <template v-for="stateGroup in groupedByStateBasin" :key="stateGroup.state">

            <!-- State header -->
            <div class="px-4 py-1.5 bg-neutral-100 dark:bg-neutral-800/80 border-t border-neutral-200 dark:border-neutral-700 first:border-t-0">
              <p class="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                {{ stateGroup.state === '—' ? 'No state' : stateGroup.state }}
              </p>
            </div>

            <template v-for="basinGroup in stateGroup.basins" :key="basinGroup.basin + stateGroup.state">

              <!-- Basin sub-header -->
              <div class="px-6 py-1 bg-neutral-50 dark:bg-neutral-900/60 border-t border-neutral-100 dark:border-neutral-800">
                <p class="text-xs text-neutral-400 dark:text-neutral-500">{{ basinGroup.basin === '—' ? 'No basin' : basinGroup.basin }}</p>
              </div>

              <template v-for="riverGroup in basinGroup.rivers" :key="riverGroup.riverKey + stateGroup.state">

                <!-- River row (clickable header) -->
                <div
                  class="flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors"
                  @click="toggleRiver(riverGroup.riverKey)"
                >
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-neutral-900 dark:text-white truncate">{{ riverGroup.riverName }}</p>
                    <p class="text-xs text-neutral-400">{{ riverGroup.runs.length }} run{{ riverGroup.runs.length !== 1 ? 's' : '' }}</p>
                  </div>
                  <svg
                    class="w-4 h-4 text-neutral-400 shrink-0 transition-transform"
                    :class="isExpanded(riverGroup.riverKey) ? 'rotate-90' : ''"
                    viewBox="0 0 20 20" fill="currentColor"
                  >
                    <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd"/>
                  </svg>
                </div>

                <!-- Expanded run rows -->
                <div v-if="isExpanded(riverGroup.riverKey)" class="bg-neutral-50 dark:bg-neutral-950 border-t border-neutral-100 dark:border-neutral-800">
                  <div class="divide-y divide-neutral-100 dark:divide-neutral-800">
                    <div
                      v-for="run in riverGroup.runs"
                      :key="run.id"
                      class="flex items-center gap-3 px-6 py-2.5 bg-white dark:bg-neutral-900/60 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 cursor-pointer transition-colors"
                      @click="run.author_handle ? router.push(`/runs/${run.author_handle}/${run.slug}`) : null"
                    >
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-neutral-900 dark:text-white truncate">{{ run.name }}</p>
                        <div class="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span v-if="run.class_max != null" class="text-xs text-neutral-400">Class {{ classLabel(run.class_max) }}</span>
                          <span v-if="run.current_cfs != null" class="text-xs font-mono text-neutral-500">{{ run.current_cfs.toLocaleString() }} cfs</span>
                          <span
                            v-if="run.flow_band"
                            class="text-xs font-medium px-1.5 py-0.5 rounded-full"
                            :class="bandBadgeClass(run.flow_band)"
                          >{{ flowBandLabel(run.flow_band) }}</span>
                          <span v-if="run.is_private" class="text-xs px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-400">Private</span>
                          <span class="text-xs font-mono text-neutral-300 dark:text-neutral-600">{{ run.slug }}</span>
                        </div>
                      </div>
                      <div class="flex items-center gap-2 shrink-0" @click.stop>
                        <NuxtLink
                          :to="`/my/runs/${run.slug}`"
                          class="text-xs text-primary-500 hover:underline px-2 py-1"
                        >Edit</NuxtLink>
                        <button
                          class="text-xs text-red-400 hover:text-red-600 px-2 py-1 transition-colors"
                          @click="confirmDelete(run)"
                        >Delete</button>
                      </div>
                    </div>
                  </div>
                </div>

              </template>
            </template>
          </template>

          <div v-if="groupedByStateBasin.length === 0 && !loading" class="px-4 py-8 text-center text-sm text-neutral-400">
            No runs yet.
          </div>
        </div>

        <!-- Delete confirm dialog -->
        <div v-if="pendingDelete" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" @click.self="pendingDelete = null">
          <div class="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 class="text-base font-semibold text-neutral-900 dark:text-white mb-2">Delete run?</h3>
            <p class="text-sm text-neutral-500 mb-5">
              "<span class="font-medium text-neutral-700 dark:text-neutral-300">{{ pendingDelete.name }}</span>" will be permanently deleted.
            </p>
            <div class="flex justify-end gap-3">
              <button class="px-4 py-1.5 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors" @click="pendingDelete = null">Cancel</button>
              <button class="px-4 py-1.5 text-sm rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors" :disabled="deleting" @click="deleteRun">
                {{ deleting ? 'Deleting…' : 'Delete' }}
              </button>
            </div>
          </div>
        </div>

      </template>
    </main>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { flowBandLabel } from '~/utils/flowBand'

const { bandBadgeClass } = useFlowBandPalette()

const { isAuthenticated, getToken } = useAuth()
const { apiBase } = useRuntimeConfig().public
const router = useRouter()

const authReady = ref(false)
const loading   = ref(false)
const error     = ref('')

const reachPickerOpen = ref(false)
const importModalOpen = ref(false)

function onDocClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (reachPickerOpen.value && !target.closest('.reach-picker-anchor')) reachPickerOpen.value = false
}

interface UserReach {
  id:           string
  slug:         string
  name:         string
  river_name:   string | null
  state_abbr:   string | null
  basin_group:  string | null
  class_max:    number | null
  current_cfs:  number | null
  flow_band:    string | null
  note:         string | null
  is_private:   boolean
  author_handle: string | null
}

const reaches = ref<UserReach[]>([])

// ── Grouping ──────────────────────────────────────────────────────────────────

interface RiverGroup {
  riverKey:  string
  riverName: string
  runs:      UserReach[]
}
interface BasinGroup {
  basin:  string
  rivers: RiverGroup[]
}
interface StateGroup {
  state:  string
  basins: BasinGroup[]
}

const groupedByStateBasin = computed((): StateGroup[] => {
  const stateMap = new Map<string, Map<string, Map<string, UserReach[]>>>()

  for (const r of reaches.value) {
    const state  = r.state_abbr  ?? '—'
    const basin  = r.basin_group ?? '—'
    const river  = r.river_name  ?? '(No river)'

    if (!stateMap.has(state)) stateMap.set(state, new Map())
    const basinMap = stateMap.get(state)!
    if (!basinMap.has(basin)) basinMap.set(basin, new Map())
    const riverMap = basinMap.get(basin)!
    if (!riverMap.has(river)) riverMap.set(river, [])
    riverMap.get(river)!.push(r)
  }

  const result: StateGroup[] = []
  for (const [state, basinMap] of stateMap) {
    const basins: BasinGroup[] = []
    for (const [basin, riverMap] of basinMap) {
      const rivers: RiverGroup[] = []
      for (const [riverName, runs] of riverMap) {
        rivers.push({ riverKey: `${state}::${basin}::${riverName}`, riverName, runs })
      }
      basins.push({ basin, rivers })
    }
    result.push({ state, basins })
  }

  // Sort: states alphabetically (— last), basins alphabetically (— last)
  result.sort((a, b) => {
    if (a.state === '—') return 1
    if (b.state === '—') return -1
    return a.state.localeCompare(b.state)
  })
  for (const sg of result) {
    sg.basins.sort((a, b) => {
      if (a.basin === '—') return 1
      if (b.basin === '—') return -1
      return a.basin.localeCompare(b.basin)
    })
  }

  return result
})

// ── Expand/collapse ───────────────────────────────────────────────────────────

const expandedKeys = ref<Set<string>>(new Set())

function isExpanded(key: string) { return expandedKeys.value.has(key) }
function toggleRiver(key: string) {
  const next = new Set(expandedKeys.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expandedKeys.value = next
}

// ── Class label ───────────────────────────────────────────────────────────────

const romanMap: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI' }
function classLabel(v: number | null): string {
  if (v == null) return '?'
  const floor = Math.floor(v)
  const base  = romanMap[floor] ?? String(floor)
  return v % 1 >= 0.5 ? `${base}+` : base
}

// ── Delete ────────────────────────────────────────────────────────────────────

const pendingDelete = ref<UserReach | null>(null)
const deleting = ref(false)

function confirmDelete(run: UserReach) { pendingDelete.value = run }

async function deleteRun() {
  if (!pendingDelete.value) return
  deleting.value = true
  try {
    const token = await getToken()
    const res = await fetch(`${apiBase}/api/v1/me/runs/${pendingDelete.value.slug}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (res.ok) {
      reaches.value = reaches.value.filter(r => r.id !== pendingDelete.value!.id)
      pendingDelete.value = null
    }
  } finally {
    deleting.value = false
  }
}

// ── Load ──────────────────────────────────────────────────────────────────────

async function load() {
  loading.value = true
  error.value   = ''
  try {
    const token = await getToken()
    const res = await fetch(`${apiBase}/api/v1/me/reaches`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (res.status === 401) { error.value = 'Sign in to view your runs.'; return }
    if (!res.ok) throw new Error(`${res.status}`)
    reaches.value = await res.json()
  } catch (e: any) {
    error.value = e.message ?? 'Failed to load runs.'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  if (isAuthenticated.value) loading.value = true
  authReady.value = true
  document.addEventListener('click', onDocClick)
  if (isAuthenticated.value) await load()
})

onUnmounted(() => document.removeEventListener('click', onDocClick))
</script>
