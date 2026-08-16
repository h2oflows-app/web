<template>
  <div class="flex-1 overflow-y-auto px-3 pb-3 space-y-3">
    <!-- Custom gauges section -->
    <div class="space-y-1">
      <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wide px-1 pt-1">My Custom Gauges</p>
      <input
        v-model="customFilter"
        type="search"
        placeholder="Filter custom gauges…"
        class="w-full text-sm bg-neutral-100 dark:bg-neutral-900 rounded-md px-3 py-2 text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
      />
      <div v-if="customGaugesLoading" class="space-y-2 py-1">
        <div v-for="i in 3" :key="i" class="flex items-center gap-3 px-2 py-2">
          <div class="flex-1 h-4 rounded bg-neutral-100 dark:bg-neutral-800 animate-pulse"/>
          <div class="h-7 w-16 rounded bg-neutral-100 dark:bg-neutral-800 animate-pulse"/>
        </div>
      </div>
      <div v-else-if="customGauges.length === 0" class="text-xs text-neutral-400 px-1 py-2">
        No custom gauges yet.
        <NuxtLink to="/my/gauges/new" class="text-primary-500 hover:underline">Create one →</NuxtLink>
      </div>
      <ul v-else class="divide-y divide-neutral-100 dark:divide-neutral-800">
        <li
          v-for="cg in filteredCustomGauges"
          :key="cg.id"
          class="flex items-center gap-3 py-2 px-2 hover:bg-primary-50 dark:hover:bg-primary-950/30 rounded-lg transition-colors"
        >
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{{ cg.name }}</p>
            <p v-if="cg.last_value_cfs != null" class="text-xs text-neutral-400">
              {{ Math.round(cg.last_value_cfs).toLocaleString() }} {{ cg.unit }}
            </p>
          </div>
          <button
            class="shrink-0 px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
            :class="addedCustomIds.has(cg.id) ? 'bg-green-600 text-white' : 'bg-primary-600 hover:bg-primary-700 text-white'"
            :disabled="addingCustomId === cg.id || addedCustomIds.has(cg.id)"
            @click="addCustomGauge(cg)"
          >
            <span v-if="addingCustomId === cg.id" class="flex items-center gap-1">
              <span class="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
              Adding…
            </span>
            <span v-else-if="addedCustomIds.has(cg.id)">Added ✓</span>
            <span v-else>Add</span>
          </button>
        </li>
      </ul>
    </div>

    <!-- Third-Party gauge search -->
    <div class="space-y-1.5 pt-1 border-t border-neutral-100 dark:border-neutral-800">
      <p class="text-xs font-semibold text-neutral-400 uppercase tracking-wide px-1">Third-Party Gauges</p>
      <div class="flex gap-2">
        <select
          v-model="gaugeState"
          class="shrink-0 text-xs rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 px-2 py-1.5"
          @change="onGaugeInput"
        >
          <option value="" disabled>State…</option>
          <option v-for="s in US_STATES" :key="s.code" :value="s.code">{{ s.code }} — {{ s.name }}</option>
        </select>
        <input
          v-model="gaugeQuery"
          type="search"
          placeholder="Station name or ID…"
          class="flex-1 text-sm bg-neutral-100 dark:bg-neutral-900 rounded-md px-3 py-1.5 text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
          @input="onGaugeInput"
        />
      </div>
      <p v-if="gaugeState === 'CO'" class="text-[10px] text-neutral-400 px-1">USGS + Colorado DWR (search by name or station abbreviation).</p>
      <p v-else-if="gaugeState" class="text-[10px] text-neutral-400 px-1">USGS for {{ gaugeState }}. Select CO to also include Colorado DWR.</p>
      <p v-else class="text-[10px] text-amber-500 px-1">Select a state to search.</p>
      <div v-if="gaugeLoading" class="space-y-2 py-1">
        <div v-for="i in 3" :key="i" class="flex items-center gap-3 px-2 py-2">
          <div class="flex-1 h-4 rounded bg-neutral-100 dark:bg-neutral-800 animate-pulse"/>
          <div class="h-7 w-16 rounded bg-neutral-100 dark:bg-neutral-800 animate-pulse"/>
        </div>
      </div>
      <div v-else-if="gaugeQuery.trim() && gaugeResults.length === 0 && !gaugeLoading" class="text-xs text-neutral-400 px-1 py-2">
        No gauges found for "{{ gaugeQuery }}"{{ gaugeState ? ` in ${gaugeState}` : '' }}.
      </div>
      <ul v-else-if="gaugeResults.length > 0" class="divide-y divide-neutral-100 dark:divide-neutral-800">
        <li
          v-for="g in gaugeResults"
          :key="`${g.source}:${g.external_id}`"
          class="flex items-center gap-3 py-2 px-2 hover:bg-primary-50 dark:hover:bg-primary-950/30 rounded-lg transition-colors"
        >
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{{ g.name }}</p>
            <p class="text-xs text-neutral-400 font-mono">{{ g.source.toUpperCase() }} · {{ g.external_id }}</p>
          </div>
          <button
            class="shrink-0 px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
            :class="addedGaugeKeys.has(`${g.source}:${g.external_id}`) ? 'bg-green-600 text-white' : 'bg-primary-600 hover:bg-primary-700 text-white'"
            :disabled="addingGaugeId === `${g.source}:${g.external_id}` || addedGaugeKeys.has(`${g.source}:${g.external_id}`)"
            @click="addGaugeResult(g)"
          >
            <span v-if="addingGaugeId === `${g.source}:${g.external_id}`" class="flex items-center gap-1">
              <span class="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
              Adding…
            </span>
            <span v-else-if="addedGaugeKeys.has(`${g.source}:${g.external_id}`)">Added ✓</span>
            <span v-else>Add</span>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// Gauges scope (web#335): the GaugeSearchModal Gauges tab, wholesale — custom
// gauges (client-side filter) + USGS/CO-DWR external search (state+query both
// required, 350ms debounce). List-only: RunsMap renders LineStrings, so gauge
// point-pins are a follow-up; the page clears the map while this scope is
// active. Fix-in-port: custom add goes through addCustomGaugeToWatchlist,
// feedback is res.ok-gated, "Create one →" points at the gauge wizard (the
// modal linked the run wizard), logged-out adds bounce through login.
const props = defineProps<{ dashboardId: string | null }>()

const emit = defineEmits<{ (e: 'added'): void }>()

const { apiBase } = useRuntimeConfig().public
const { getToken } = useAuth()
const { addCustomGaugeToWatchlist } = useWatchlistSync()
const toast = useToast()
const route = useRoute()

const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' },
]

interface GaugeResult { name: string; external_id: string; source: string; lat: number | null; lng: number | null }
interface CustomGaugeSummary { id: string; slug: string; name: string; description: string | null; unit: string; last_value_cfs: number | null }

const gaugeQuery       = ref('')
const gaugeState       = ref('')
const gaugeResults     = ref<GaugeResult[]>([])
const gaugeLoading     = ref(false)
const addingGaugeId    = ref<string | null>(null)
const addedGaugeKeys   = ref<Set<string>>(new Set())
const customGauges     = ref<CustomGaugeSummary[]>([])
const customGaugesLoading = ref(false)
const addingCustomId   = ref<string | null>(null)
const addedCustomIds   = ref<Set<string>>(new Set())
const customFilter     = ref('')

async function requireToken(): Promise<string | null> {
  const token = await getToken()
  if (!token) {
    navigateTo(`/login?redirect=${encodeURIComponent(route.fullPath)}`)
    return null
  }
  return token
}

function failToast() {
  toast.add({ title: 'Could not add — try again', color: 'error', duration: 3000 })
}

let gaugeDebounce: ReturnType<typeof setTimeout> | null = null
function onGaugeInput() {
  if (gaugeDebounce) clearTimeout(gaugeDebounce)
  gaugeDebounce = setTimeout(searchGauges, 350)
}

async function searchGauges() {
  const q = gaugeQuery.value.trim()
  if (!q || !gaugeState.value) { gaugeResults.value = []; return }
  gaugeLoading.value = true
  try {
    const params = new URLSearchParams({ q })
    params.set('state', gaugeState.value)
    const res = await fetch(`${apiBase}/api/v1/gauges/search-external?${params}`)
    if (!res.ok) return
    gaugeResults.value = await res.json() ?? []
  } catch { /* non-fatal */ } finally {
    gaugeLoading.value = false
  }
}

async function loadCustomGauges() {
  customGaugesLoading.value = true
  try {
    const token = await getToken()
    if (!token) return
    const res = await fetch(`${apiBase}/api/v1/me/custom-gauges`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const data = await res.json()
      customGauges.value = data.items ?? []
    }
  } catch { /* non-fatal */ } finally {
    customGaugesLoading.value = false
  }
}
onMounted(loadCustomGauges)

const filteredCustomGauges = computed(() => {
  const q = customFilter.value.trim().toLowerCase()
  if (!q) return customGauges.value
  return customGauges.value.filter(cg => cg.name.toLowerCase().includes(q))
})

async function addCustomGauge(cg: CustomGaugeSummary) {
  if (!(await requireToken())) return
  addingCustomId.value = cg.id
  try {
    const ok = await addCustomGaugeToWatchlist(cg.id, props.dashboardId)
    if (!ok) { failToast(); return }
    addedCustomIds.value = new Set([...addedCustomIds.value, cg.id])
    emit('added')
    setTimeout(() => {
      addedCustomIds.value = new Set([...addedCustomIds.value].filter(id => id !== cg.id))
    }, 3000)
  } finally {
    addingCustomId.value = null
  }
}

async function addGaugeResult(g: GaugeResult) {
  const token = await requireToken()
  if (!token) return
  const key = `${g.source}:${g.external_id}`
  addingGaugeId.value = key
  try {
    const res = await fetch(`${apiBase}/api/v1/me/gauges/add-external`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        external_id: g.external_id,
        source: g.source,
        name: g.name,
        lat: g.lat,
        lng: g.lng,
        dashboard_id: props.dashboardId,
      }),
    }).catch(() => null)
    if (!res?.ok) { failToast(); return }
    addedGaugeKeys.value = new Set([...addedGaugeKeys.value, key])
    emit('added')
    setTimeout(() => {
      addedGaugeKeys.value = new Set([...addedGaugeKeys.value].filter(k => k !== key))
    }, 3000)
  } finally {
    addingGaugeId.value = null
  }
}
</script>
