<template>
  <div class="pb-20">
    <!-- Step 1: pick anchor -->
    <template v-if="!anchorSnap && !anchorSnapping">
      <div class="mb-3 rounded-lg bg-primary-50 dark:bg-primary-950/60 border border-primary-200 dark:border-primary-800 px-3 py-2.5 text-xs text-primary-800 dark:text-primary-200">
        <span class="font-medium">Click river closest to put-in.</span> We'll snap to the nearest NHD flowline. Look at the river name — if it picks an incorrect nearby tributary or creek, try adjusting your click to a more accurate position along the river you're aiming for.
      </div>
    </template>
    <template v-else-if="anchorSnapping">
      <div class="mb-3 rounded-lg bg-primary-50 dark:bg-primary-950/60 border border-primary-200 dark:border-primary-800 px-3 py-2 text-xs text-primary-700 dark:text-primary-300 animate-pulse">
        Snapping to NHD…
      </div>
    </template>
    <template v-else-if="anchorSnap">
      <div class="mb-3 flex items-center gap-3 px-3 py-2 rounded-lg bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 text-xs">
        <span class="w-2.5 h-2.5 rounded-full bg-primary-600 shrink-0" />
        <span class="flex-1 font-medium text-primary-800 dark:text-primary-200">
          <template v-if="anchorSnap.name">{{ anchorSnap.name }}</template>
          <template v-else>ComID {{ anchorSnap.comid }}</template>
        </span>
        <UButton size="xs" variant="ghost" color="neutral" @click="resetToPickMode">Pick another point</UButton>
        <UButton size="xs" variant="ghost" color="error" @click="reset">Clear</UButton>
      </div>
    </template>

    <!-- Step 2: guide text for take-out selection -->
    <div v-if="upComID && !downComID && !gaugeSelectMode" class="mb-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 px-3 py-2 text-xs text-neutral-600 dark:text-neutral-300">
      Put-in set — now click the <strong>take-out</strong> flowline segment on the map.
      <span class="block mt-1 text-neutral-400 dark:text-neutral-500">Look at the river name — if it picks an incorrect nearby tributary or creek, try adjusting your click to a more accurate position along the river you're aiming for. Don't worry if it's off, we're just drawing the line. The actual put-in access point can be added later via the map editor or KML upload.</span>
    </div>

    <!-- ComID + gauge slot selector -->
    <div v-if="tributaries" class="flex items-center gap-2 mb-3 text-xs flex-wrap">
      <span class="text-neutral-500 shrink-0">Click for:</span>
      <button
        class="flex items-center gap-1.5 px-2 py-1 rounded-md border transition-colors"
        :class="comIDSlot === 'up' && !comIDPairLocked && !gaugeSelectMode ? 'border-green-500 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 font-medium' : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'"
        @click="comIDSlot = 'up'; comIDPairLocked = false; gaugeSelectMode = false"
      >
        <span class="w-2 h-2 rounded-full bg-green-500 shrink-0" />
        Put-in<template v-if="upComID"> · <span class="font-mono">{{ upComID }}</span></template>
      </button>
      <button
        class="flex items-center gap-1.5 px-2 py-1 rounded-md border transition-colors"
        :class="comIDSlot === 'down' && !comIDPairLocked && !gaugeSelectMode ? 'border-red-500 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 font-medium' : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'"
        @click="comIDSlot = 'down'; comIDPairLocked = false; gaugeSelectMode = false"
      >
        <span class="w-2 h-2 rounded-full bg-red-500 shrink-0" />
        Take-out<template v-if="downComID"> · <span class="font-mono">{{ downComID }}</span></template>
      </button>
      <button
        class="flex items-center gap-1.5 px-2 py-1 rounded-md border transition-colors"
        :class="gaugeSelectMode ? 'border-amber-500 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-medium' : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'"
        @click="gaugeSelectMode = !gaugeSelectMode; if (!gaugeSelectMode) pendingGauge = null"
      >
        <span class="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
        <template v-if="gaugeSelectMode">Cancel gauge</template>
        <template v-else-if="pendingGauge">Gauge · <span class="font-mono">{{ pendingGauge.externalId }}</span></template>
        <template v-else>Gauge <span class="text-neutral-400 font-normal">(optional)</span></template>
      </button>
    </div>

    <!-- Pending gauge card -->
    <div v-if="pendingGauge" class="flex items-center gap-2 px-3 py-2 mb-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs">
      <span class="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
      <span class="flex-1 truncate font-medium text-amber-800 dark:text-amber-200">{{ pendingGauge.name || pendingGauge.externalId }}</span>
      <span class="font-mono text-amber-600 dark:text-amber-400 shrink-0 uppercase">{{ pendingGauge.source }} {{ pendingGauge.externalId }}</span>
      <button class="text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 shrink-0 px-1" @click="pendingGauge = null">✕</button>
    </div>

    <!-- Map -->
    <ClientOnly>
      <NHDExplorerMap
        :upstream-flowlines="tributaries"
        :downstream-flowlines="downstreamFlowlines"
        :upstream-gauges="nearbyGauges"
        :pick-mode="pickMode"
        :comid-select-mode="!!anchorSnap && !pickMode && !gaugeSelectMode && !comIDPairLocked"
        :comid-select-slot="comIDSlot"
        :selected-up-comid="upComID"
        :selected-down-comid="downComID"
        :put-in-pin="putInPin"
        :take-out-pin="takeOutPin"
        :preview-centerline="previewCenterline"
        :gauge-select-mode="gaugeSelectMode"
        :disable-auto-fit="disableAutoFit"
        @pick="onAnchorPick"
        @comid-select="onComIDSelect"
        @gauge-select="onGaugeSelect"
      />
    </ClientOnly>
    <p v-if="downstreamLoading" class="text-xs text-primary-500 dark:text-primary-400 mt-1 animate-pulse">Loading downstream mainstem…</p>

    <!-- Centerline status -->
    <div v-if="upComID && downComID" class="flex items-center gap-2 mt-1">
      <span v-if="previewLoading" class="text-xs text-primary-500 animate-pulse">Computing centerline…</span>
      <span v-else-if="previewCenterline" class="text-xs text-primary-600 dark:text-primary-400">Dashed line shows trimmed run</span>
      <span v-if="riverNameFetching" class="text-xs text-neutral-400 animate-pulse">Looking up river…</span>
    </div>

    <!-- River name auto-detected -->
    <div v-if="upComID && downComID && form.riverName && !riverNameFetching" class="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200">
      <svg class="w-3.5 h-3.5 shrink-0 text-emerald-500" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
      <span>Looks like <strong>{{ form.riverName }}</strong><template v-if="gnisId"> · GNIS {{ gnisId }}</template></span>
    </div>

    <!-- Dupe warning — geometry overlap detected (V21); blocks submit until dismissed -->
    <div v-if="dupeRuns.length > 0 && !dupeDismissed" class="mt-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-3 space-y-2">
      <div class="flex items-start justify-between gap-2">
        <p class="text-xs font-medium text-amber-800 dark:text-amber-200">Similar run{{ dupeRuns.length !== 1 ? 's' : '' }} already exist on this section:</p>
      </div>
      <div v-for="run in dupeRuns.slice(0, 3)" :key="run.id" class="flex items-center gap-2 text-xs">
        <svg v-if="run.is_official" class="w-3 h-3 text-primary-500 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        <span class="w-2 h-2 rounded-full bg-neutral-400 shrink-0" v-else />
        <span class="font-medium text-amber-800 dark:text-amber-200 truncate flex-1">{{ run.name }}</span>
        <span class="text-amber-600 dark:text-amber-400 shrink-0">{{ run.is_official ? 'H2OFlows' : (run.author_handle ? `@${run.author_handle}` : '') }}</span>
        <!-- "Edit existing" for own runs; "View" for others -->
        <NuxtLink
          v-if="!run.is_official && !run.author_handle"
          :to="`/my/runs/${run.slug}`"
          class="shrink-0 text-[10px] px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30"
          target="_blank"
        >Edit</NuxtLink>
        <NuxtLink
          v-else
          :to="`/runs/${run.author_handle ?? 'h2oflows'}/${run.slug}`"
          class="shrink-0 text-[10px] px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30"
          target="_blank"
        >View</NuxtLink>
      </div>
      <div class="flex items-center gap-2 pt-1">
        <p class="text-xs text-amber-700 dark:text-amber-300 flex-1">Modify an existing run or create a new one with different flow lines.</p>
        <button class="shrink-0 text-xs px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-900/60 font-medium" @click="dupeDismissed = true">Create anyway</button>
      </div>
    </div>

    <!-- Name conflict warning (V22) -->
    <div v-if="nameConflictSlug && !nameConflictDismissed" class="mt-3 rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/40 px-4 py-3 space-y-2">
      <p class="text-xs font-medium text-orange-800 dark:text-orange-200">You already have a run with this name.</p>
      <div class="flex items-center gap-2">
        <NuxtLink :to="`/my/runs/${nameConflictSlug}`" target="_blank" class="text-xs px-2 py-1 rounded border border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/30">Edit existing</NuxtLink>
        <button class="text-xs px-2 py-1 rounded border border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/30 font-medium" @click="nameConflictDismissed = true; submit()">Save anyway</button>
      </div>
    </div>

    <!-- Reach form — shown once both ComIDs selected -->
    <div v-if="upComID && downComID" class="mt-4 space-y-3 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 bg-white dark:bg-neutral-900">
      <h3 class="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Run details</h3>

      <!-- River name (editable; NHD auto-fills but user can override) -->
      <div>
        <label class="block text-xs text-neutral-500 mb-1">River name <span class="text-neutral-300">(optional — auto-detected from NHD)</span></label>
        <input
          v-model="form.riverName"
          class="w-full rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2 py-1.5 text-sm"
          placeholder="e.g. Arkansas River"
        />
      </div>

      <!-- Reach name -->
      <div>
        <label class="block text-xs text-neutral-500 mb-1">Short name <span class="text-red-400">*</span></label>
        <input v-model="form.name" class="w-full rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2 py-1.5 text-sm" placeholder="e.g. Foxton" />
      </div>

      <div>
        <label class="block text-xs text-neutral-500 mb-1">Full name <span class="text-neutral-400 font-normal">(optional)</span></label>
        <input v-model="form.longName" class="w-full rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2 py-1.5 text-sm" placeholder="e.g. Buffalo Creek to South Platte Hotel" />
      </div>

      <!-- Notes -->
      <div>
        <label class="block text-xs text-neutral-500 mb-1">Notes <span class="text-neutral-300">(optional)</span></label>
        <textarea
          v-model="form.note"
          rows="2"
          class="w-full rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2 py-1.5 text-sm resize-y"
          placeholder="Beta, access notes, hazards…"
        />
      </div>

      <!-- Class / Difficulty -->
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs text-neutral-500 mb-1">Class min <span class="text-neutral-300">(optional)</span></label>
          <input v-model.number="form.classMin" type="number" min="1" max="6" step="0.5" class="w-full rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2 py-1.5 text-sm" placeholder="3" />
        </div>
        <div>
          <label class="block text-xs text-neutral-500 mb-1">Class max <span class="text-neutral-300">(optional)</span></label>
          <input v-model.number="form.classMax" type="number" min="1" max="6" step="0.5" class="w-full rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-2 py-1.5 text-sm" placeholder="5" />
        </div>
      </div>

      <!-- Flow bands -->
      <FlowBandEditor v-model="form.flowBands" />

      <div v-if="submitError" class="text-xs text-red-500">{{ submitError }}</div>

      <!-- Admin-only: publish as the official h2oflows curator account -->
      <label v-if="isDataAdmin" class="flex items-center gap-2 rounded-md border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 px-3 py-2 text-xs text-amber-800 dark:text-amber-200 cursor-pointer">
        <input v-model="authorAsH2oflows" type="checkbox" class="rounded border-amber-400" />
        <span>Author as <strong>h2oflows</strong> (official curator content — public)</span>
      </label>

      <div class="flex gap-2 justify-end pt-1">
        <UButton size="sm" variant="ghost" color="neutral" @click="emit('cancel')">Cancel</UButton>
        <UButton size="sm" :disabled="!form.name.trim() || (dupeRuns.length > 0 && !dupeDismissed)" :loading="saving" @click="submit">{{ (isDataAdmin && authorAsH2oflows) ? 'Save as h2oflows' : 'Save Run' }}</UButton>
      </div>
    </div>

    <!-- Error from anchor snap -->
    <p v-if="snapError" class="text-xs text-red-500 mt-2">{{ snapError }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { FlowBands } from '~/utils/flowBand'

const emit = defineEmits<{
  created: [slug: string, asH2oflows: boolean]
  cancel:  []
}>()

const { getToken, isDataAdmin } = useAuth()
const { apiBase }  = useRuntimeConfig().public

// Admin-only: author this run as the official h2oflows curator account.
const authorAsH2oflows = ref(false)

const pickMode            = ref(false)
const anchorSnapping      = ref(false)
const anchorSnap          = ref<{ comid: string; name: string } | null>(null)
const tributaries         = ref<object | null>(null)
const downstreamFlowlines = ref<object | null>(null)
const downstreamLoading   = ref(false)
const comIDSlot           = ref<'up' | 'down'>('up')
const upComID             = ref<string | null>(null)
const downComID           = ref<string | null>(null)
const startLat            = ref<number | null>(null)
const startLng            = ref<number | null>(null)
const endLat              = ref<number | null>(null)
const endLng              = ref<number | null>(null)
const riverNameFetching   = ref(false)
const gnisId              = ref('')
const snapError           = ref('')
const submitError         = ref('')
const saving              = ref(false)
const previewCenterline   = ref<object | null>(null)
const previewLoading      = ref(false)
const previewGeoJSON      = ref<object | null>(null)

const comIDPairLocked = ref(false)

// Dupe detection (V21 geometry, V22 name)
interface ClusterRun { id: string; slug: string; name: string; author_handle: string | null; is_official: boolean; class_min: number | null; class_max: number | null; rank_score: number }
const dupeRuns          = ref<ClusterRun[]>([])
const dupeDismissed     = ref(false)
const nameConflictSlug  = ref<string | null>(null)
const nameConflictDismissed = ref(false)

async function checkDupes() {
  if (!startLat.value || !startLng.value || !endLat.value || !endLng.value) return
  dupeDismissed.value = false
  dupeRuns.value = []
  try {
    const res = await fetch(`${apiBase}/api/v1/user-runs/dupe-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        put_in_lat: startLat.value, put_in_lng: startLng.value,
        take_out_lat: endLat.value, take_out_lng: endLng.value,
        up_comid: upComID.value ?? '',
      }),
    })
    if (res.ok) {
      const data = await res.json()
      dupeRuns.value = data.runs ?? []
    }
  } catch { /* non-fatal */ }
}

// Gauge selection
const gaugeSelectMode = ref(false)
const nearbyGauges    = ref<object | null>(null)
const pendingGauge    = ref<{ externalId: string; source: string; name: string; lat: number; lng: number } | null>(null)

// Prevent zoom-out when tributaries load after anchor snap.
// Only auto-fit when both ComIDs are set (reach extent known).
const disableAutoFit = computed(() => !!anchorSnap.value && !(upComID.value && downComID.value))

const form = ref({
  name:      '',
  longName:  '',
  riverName: '',
  note:      '',
  classMin:  null as number | null,
  classMax:  null as number | null,
  flowBands: { base_label: 'Too Low', base_color: 'red-3', thresholds: [] } as FlowBands,
})

const putInPin = computed(() =>
  startLat.value != null && startLng.value != null
    ? { lat: startLat.value, lng: startLng.value, label: 'Put-in' }
    : null
)
const takeOutPin = computed(() =>
  endLat.value != null && endLng.value != null
    ? { lat: endLat.value, lng: endLng.value, label: 'Take-out' }
    : null
)

onMounted(() => { pickMode.value = true })

function resetToPickMode() {
  pickMode.value         = true
  anchorSnap.value       = null
  tributaries.value      = null
  downstreamFlowlines.value = null
  nearbyGauges.value     = null
  gaugeSelectMode.value  = false
  pendingGauge.value     = null
  upComID.value = null; downComID.value = null
  startLat.value = null; startLng.value = null
  endLat.value = null;   endLng.value   = null
  previewCenterline.value = null
  previewGeoJSON.value    = null
  comIDSlot.value = 'up'
  comIDPairLocked.value = false
}

function reset() {
  resetToPickMode()
  anchorSnapping.value = false
  downstreamLoading.value = false
  riverNameFetching.value = false
  gnisId.value      = ''
  snapError.value   = ''
  submitError.value = ''
  saving.value      = false
  previewLoading.value = false
  form.value = {
    name: '', longName: '', riverName: '', note: '',
    classMin: null, classMax: null,
    flowBands: { base_label: 'Too Low', base_color: 'red-3', thresholds: [] },
  }
}

watch(upComID, async (comid) => {
  downstreamFlowlines.value = null
  if (!comid) return
  downstreamLoading.value = true
  try {
    const token = await getToken()
    const res = await fetch(`${apiBase}/api/v1/nldi/downstream?comid=${comid}&distance=800`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (res.ok) downstreamFlowlines.value = (await res.json()).downstream_flowlines
  } catch { /* non-fatal */ }
  finally { downstreamLoading.value = false }
})

watch([upComID, downComID], async ([up, down]) => {
  if (!up || !down) return
  fetchPreviewCenterline()
  fetchRiverName()
})

async function fetchNearbyGauges(lat: number, lng: number, comid?: string) {
  try {
    const token = await getToken()
    const comidParam = comid ? `&comid=${comid}` : ''
    const res = await fetch(
      `${apiBase}/api/v1/nldi/nearby-gauges?lat=${lat}&lng=${lng}&distance=100${comidParam}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    )
    if (res.ok) nearbyGauges.value = await res.json()
  } catch { /* non-fatal */ }
}

async function onAnchorPick(lat: number, lng: number) {
  pickMode.value       = false
  anchorSnapping.value = true
  anchorSnap.value     = null
  tributaries.value    = null
  snapError.value      = ''
  try {
    const token = await getToken()
    const res = await fetch(`${apiBase}/api/v1/nldi/upstream-tributaries?lat=${lat}&lng=${lng}&distance=50`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) { snapError.value = `Snap failed: HTTP ${res.status}`; return }
    const data = await res.json()
    anchorSnap.value  = { comid: data.snap.comid, name: data.snap.name ?? '' }
    tributaries.value = data.tributaries
    if (data.snap.name) {
      form.value.riverName = data.snap.name
    }
    // One-click put-in: anchor snap IS the put-in point
    upComID.value    = data.snap.comid
    startLat.value   = lat
    startLng.value   = lng
    comIDSlot.value  = 'down'
    // Fetch nearby gauges immediately so they're ready on the map.
    fetchNearbyGauges(lat, lng, data.snap.comid)
  } catch (e: any) {
    snapError.value = e.message ?? 'Snap failed'
  } finally {
    anchorSnapping.value = false
  }
}

function onComIDSelect(comid: string, lat: number, lng: number) {
  if (comIDSlot.value === 'up') {
    upComID.value = comid
    startLat.value = lat; startLng.value = lng
    comIDSlot.value = 'down'
  } else {
    downComID.value = comid
    endLat.value = lat; endLng.value = lng
    // Lock to prevent accidental flowline clicks while user hunts for gauge.
    comIDPairLocked.value = true
    checkDupes()
  }
}

function onGaugeSelect(externalId: string, source: string, name: string, lat: number, lng: number) {
  gaugeSelectMode.value = false
  pendingGauge.value    = { externalId, source, name, lat, lng }
}

async function fetchRiverName() {
  const comid = upComID.value ?? anchorSnap.value?.comid
  if (!comid) return
  riverNameFetching.value = true
  try {
    const token = await getToken()
    const lat = startLat.value
    const lng = startLng.value
    const coordParams = lat != null && lng != null ? `&lat=${lat}&lng=${lng}` : ''
    const res = await fetch(`${apiBase}/api/v1/nldi/river-name?comid=${comid}${coordParams}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) return
    const data = await res.json()
    if (data.river_name) form.value.riverName = data.river_name
    if (data.gnis_id) gnisId.value = data.gnis_id
  } catch { /* non-fatal */ }
  finally { riverNameFetching.value = false }
}

async function fetchPreviewCenterline() {
  if (!upComID.value || !downComID.value) return
  previewLoading.value    = true
  previewCenterline.value = null
  previewGeoJSON.value    = null
  try {
    const token = await getToken()
    let url = `${apiBase}/api/v1/nldi/preview-centerline?up_comid=${upComID.value}&down_comid=${downComID.value}`
    if (startLat.value != null && startLng.value != null && endLat.value != null && endLng.value != null)
      url += `&start_lat=${startLat.value}&start_lng=${startLng.value}&end_lat=${endLat.value}&end_lng=${endLng.value}`
    const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    if (res.ok) {
      const data = await res.json()
      previewCenterline.value = data.geojson
      previewGeoJSON.value    = data.geojson
    }
  } catch { /* non-fatal */ }
  finally { previewLoading.value = false }
}

async function submit() {
  if (!form.value.name.trim() || !upComID.value || !downComID.value) return
  saving.value      = true
  submitError.value = ''
  try {
    const token = await getToken()
    const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }

    // V22: name uniqueness check against own runs
    if (!nameConflictDismissed.value) {
      try {
        const existing = await fetch(`${apiBase}/api/v1/me/reaches`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (existing.ok) {
          const runs: Array<{ slug: string; name: string; long_name: string | null }> = await existing.json()
          const nameLower = form.value.name.trim().toLowerCase()
          const longNameLower = form.value.longName.trim().toLowerCase()
          const conflict = runs.find(r =>
            r.name.toLowerCase() === nameLower ||
            (longNameLower && r.long_name?.toLowerCase() === longNameLower)
          )
          if (conflict) {
            nameConflictSlug.value = conflict.slug
            saving.value = false
            return
          }
        }
      } catch { /* non-fatal — don't block if check fails */ }
    }

    const body: Record<string, any> = {
      name:       form.value.name.trim(),
      up_comid:   upComID.value,
      down_comid: downComID.value,
      put_in:    { lat: startLat.value!, lng: startLng.value! },
      take_out:  { lat: endLat.value!,   lng: endLng.value!   },
    }
    if (form.value.longName.trim())  body.long_name  = form.value.longName.trim()
    if (form.value.riverName.trim()) body.river_name = form.value.riverName.trim()
    if (gnisId.value)                body.gnis_id    = gnisId.value
    if (form.value.note.trim())      body.note       = form.value.note.trim()
    if (form.value.classMin != null) body.class_min  = form.value.classMin
    if (form.value.classMax != null) body.class_max  = form.value.classMax
    body.flow_bands = form.value.flowBands

    // Admins may author official h2oflows curator content via ?as=h2oflows
    // (server validates data_admin role; ignored otherwise). Must ride along on
    // every create-flow call so the follow-ups resolve the sentinel-owned run.
    const authoredAsH2oflows = isDataAdmin.value && authorAsH2oflows.value
    const asQuery = authoredAsH2oflows ? '?as=h2oflows' : ''

    const res = await fetch(`${apiBase}/api/v1/me/reaches${asQuery}`, {
      method: 'POST', headers, body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
    const slug: string = data.slug

    // Store centerline.
    if (previewGeoJSON.value) {
      await fetch(`${apiBase}/api/v1/me/runs/${slug}/centerline${asQuery}`, {
        method: 'POST', headers,
        body: JSON.stringify({ geojson: previewGeoJSON.value }),
      }).catch(() => { /* non-fatal */ })
    }

    // Attach gauge if selected — resolve external_id+source → UUID via search.
    if (pendingGauge.value) {
      const { externalId, source } = pendingGauge.value
      const searchRes = await fetch(`${apiBase}/api/v1/gauges/search?q=${encodeURIComponent(externalId)}&limit=10`)
      const searchData = await searchRes.json()
      const feature = (searchData.features ?? []).find(
        (f: any) => f.properties.external_id === externalId && f.properties.source === source
      )
      if (feature) {
        await fetch(`${apiBase}/api/v1/me/runs/${slug}/gauge${asQuery}`, {
          method: 'PUT', headers,
          body: JSON.stringify({ gauge_id: feature.properties.id }),
        }).catch(() => { /* non-fatal */ })
      }
    }

    emit('created', slug, authoredAsH2oflows)
  } catch (e: any) {
    submitError.value = e.message ?? 'Failed to create reach.'
  } finally {
    saving.value = false
  }
}
</script>
