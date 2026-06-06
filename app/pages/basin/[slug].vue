<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-950">
    <AppHeader />

    <main class="max-w-5xl mx-auto px-4 py-6 space-y-6">

      <!-- Header -->
      <div class="flex items-center gap-3">
        <button class="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors" @click="router.back()">
          <svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clip-rule="evenodd" />
          </svg>
        </button>
        <div>
          <h1 class="text-2xl font-bold text-neutral-900 dark:text-white">
            {{ displayName ? `${displayName} Basin` : slug }}
          </h1>
          <p class="text-sm text-neutral-500 mt-0.5">
            {{ fetchDone ? `${mapData.length} run${mapData.length === 1 ? '' : 's'}` : 'Loading…' }}
          </p>
        </div>
      </div>

      <!-- NLDI unavailable banner -->
      <div
        v-if="nldiError"
        class="flex items-start gap-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-800 dark:text-amber-300"
      >
        <svg class="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
        </svg>
        <span>{{ nldiError }}</span>
        <button class="ml-auto shrink-0 text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 transition-colors" @click="nldiError = null">
          <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/></svg>
        </button>
      </div>

      <!-- Basin Map -->
      <section>
        <ClientOnly>
          <BasinMap
            ref="basinMapRef"
            :reaches="mapData"
            :network="networkData"
            :watched-gauge-ids="watchedGaugeIds"
            :fetch-done="fetchDone"
            :network-loading="networkLoading"
            @select="selectedSlug = $event"
          />
        </ClientOnly>
      </section>

      <!-- Reach list -->
      <section class="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 divide-y divide-neutral-100 dark:divide-neutral-800 overflow-hidden">
        <div
          v-for="reach in mapData"
          :key="reach.slug"
          class="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer"
          @click="basinMapRef?.flyToReach(reach.slug)"
        >
          <span
            class="w-2 h-2 rounded-full shrink-0"
            :style="{ background: classColor(reach.class_max ?? 0) }"
          />
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-neutral-800 dark:text-neutral-100 truncate">
              {{ reach.common_name ?? reach.name }}
            </p>
            <p v-if="reach.river_name" class="text-xs text-neutral-400 truncate">{{ reach.river_name }}</p>
          </div>
          <span class="text-xs font-mono text-neutral-400 shrink-0">{{ classRange(reach.class_min, reach.class_max) || '—' }}</span>
          <span
            v-if="reach.flow_status !== 'unknown'"
            class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold shrink-0"
            :class="bandBadgeClass(null, reach.flow_status)"
          >{{ flowBandLabel(null, reach.flow_status) }}</span>
        </div>
        <div v-if="!fetchDone" class="px-4 py-6 text-center text-sm text-neutral-400">
          Loading runs…
        </div>
        <div v-else-if="mapData.length === 0" class="px-4 py-6 text-center text-sm text-neutral-400">
          No runs found for this basin yet.
        </div>
      </section>

      <!-- D3 River Tree -->
      <section v-if="mapData.length > 0" class="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4">
        <div class="flex items-center gap-2 mb-3">
          <svg class="w-4 h-4 text-neutral-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="8" cy="3" r="1.5"/><circle cx="4" cy="13" r="1.5"/><circle cx="12" cy="13" r="1.5"/>
            <line x1="8" y1="4.5" x2="8" y2="7"/><path d="M8 7 Q4 9 4 11.5"/><path d="M8 7 Q12 9 12 11.5"/>
          </svg>
          <h2 class="text-sm font-semibold text-neutral-500 uppercase tracking-wide">Basin Tree</h2>
        </div>
        <ClientOnly>
          <BasinTree
            :reaches="mapData"
            :basin-name="displayName ?? slug"
            :selected-slug="selectedSlug"
            @select="onTreeSelect"
          />
        </ClientOnly>
      </section>

    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from '#app'
import { useWatchlistStore } from '~/stores/watchlist'
import { cleanBasinName, slugifyBasin } from '~/utils/basin'
import { classColor, classRange } from '~/utils/classRating'
import { flowBandLabel } from '~/utils/flowBand'
import type { BasinReach, BasinNetwork } from '~/components/basin/BasinMap.vue'

definePageMeta({ ssr: false })

const { bandBadgeClass } = useFlowBandPalette()

const route  = useRoute()
const router = useRouter()
const slug   = route.params.slug as string
const store  = useWatchlistStore()
const { apiBase } = useRuntimeConfig().public
const { isAuthenticated, getToken } = useAuth()

const userReachSlugs = ref<string[]>([])
const userBasinName  = ref<string | null>(null)

const mapData        = ref<BasinReach[]>([])
const networkData    = ref<BasinNetwork | null>(null)
const networkLoading = ref(false)
const nldiError      = ref<string | null>(null)
const selectedSlug   = ref<string | null>(null)
const fetchDone      = ref(false)
const basinMapRef    = ref<{ flyToReach: (s: string) => void } | null>(null)

function onTreeSelect(s: string) {
  selectedSlug.value = s
  basinMapRef.value?.flyToReach(s)
}

function gaugeBasinSlug(g: ReturnType<typeof store.gauges>[number]): string | null {
  const name = cleanBasinName(g.contextReachBasinGroup)
    ?? cleanBasinName(g.watershedName)
    ?? cleanBasinName(g.basinName)
    ?? cleanBasinName(g.contextReachRiverName)
    ?? cleanBasinName(g.riverName)
    ?? 'Other'
  return slugifyBasin(name)
}

const basinGauges = computed(() =>
  store.gauges.filter(g => gaugeBasinSlug(g) === slug)
)

const displayName = computed<string | null>(() => {
  if (userBasinName.value) return userBasinName.value
  const g = basinGauges.value[0]
  if (!g) return null
  return cleanBasinName(g.contextReachBasinGroup)
    ?? cleanBasinName(g.watershedName)
    ?? cleanBasinName(g.basinName)
    ?? cleanBasinName(g.contextReachRiverName)
    ?? cleanBasinName(g.riverName)
    ?? null
})

const watchedGaugeIds = computed<Set<string>>(
  () => new Set(store.gauges.map(g => g.externalId).filter(Boolean))
)

// Slugs from gauge contexts + user_reaches — passed as a hint to the API.
// The API also scans all user_reaches by basin slug server-side (PR #79),
// so this list doesn't need to be exhaustive.
const reachSlugs = computed<string[]>(() => {
  const seen = new Set<string>()
  const out: string[] = []
  for (const g of basinGauges.value) {
    if (g.contextReachSlug && !seen.has(g.contextReachSlug)) {
      seen.add(g.contextReachSlug)
      out.push(g.contextReachSlug)
    }
  }
  for (const s of userReachSlugs.value) {
    if (!seen.has(s)) { seen.add(s); out.push(s) }
  }
  return out
})

async function fetchMapData(params: URLSearchParams) {
  const res = await fetch(`${apiBase}/api/v1/reaches/basin/${slug}/map?${params}`)
  if (!res.ok) return
  const body = await res.json()
  mapData.value = body.reaches ?? []
}

async function fetchNetworkData(params: URLSearchParams) {
  networkLoading.value = true
  try {
    const res = await fetch(`${apiBase}/api/v1/reaches/basin/${slug}/network?${params}`)
    if (!res.ok) return
    const body = await res.json()
    networkData.value = { tributaries: body.tributaries, gauges: body.gauges }
    if (!body.nldi_available && body.nldi_error) {
      nldiError.value = body.nldi_error
    }
  } finally {
    networkLoading.value = false
  }
}

let fetchController: AbortController | null = null

async function fetchAll() {
  fetchController?.abort()
  fetchController = new AbortController()
  fetchDone.value = false

  const params = new URLSearchParams()
  if (reachSlugs.value.length > 0) {
    params.set('slugs', reachSlugs.value.join(','))
  }
  try {
    await Promise.all([fetchMapData(params), fetchNetworkData(params)])
  } catch (e) {
    console.warn('[basin page] fetch:', e)
  } finally {
    fetchDone.value = true
  }
}

// 1. Initial fetch on mount — captures gauge-context slugs (synchronous from store).
//    Always runs even if reachSlugs is empty: the API's basin-slug scan returns
//    all user_reaches for authenticated callers regardless of slug list.
onMounted(() => { fetchAll() })

// 2. Re-fetch when user_reaches arrive from the async /api/v1/me/runs call.
//    This adds any user_reach slugs not already in reachSlugs so the API
//    can resolve them via the explicit slug list as well as the basin scan.
watch(userReachSlugs, (slugs) => {
  if (slugs.length > 0) fetchAll()
})

// 3. Load user_reaches for this basin from the me/runs list.
onMounted(async () => {
  if (!isAuthenticated.value) return
  const token = await getToken()
  if (!token) return
  const res = await fetch(`${apiBase}/api/v1/me/runs`, {
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => null)
  if (!res?.ok) return
  const runs: { slug: string; basin_group: string | null }[] = await res.json() ?? []
  const inBasin = runs.filter(r => {
    const g = cleanBasinName(r.basin_group)
    return g ? slugifyBasin(g) === slug : false
  })
  userReachSlugs.value = inBasin.map(r => r.slug)
  if (inBasin.length > 0 && !userBasinName.value) {
    userBasinName.value = cleanBasinName(inBasin[0].basin_group) ?? null
  }
})
</script>
