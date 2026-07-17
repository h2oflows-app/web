<template>
  <div class="absolute inset-0">
    <div ref="container" class="w-full h-full" />
    <div v-if="!mapReady" class="absolute inset-0 flex items-center justify-center text-sm text-muted pointer-events-none">
      Loading map…
    </div>

    <!-- Placing banner — a feature type is armed, awaiting a map tap (#312). -->
    <div
      v-if="store.placingType"
      class="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium text-white shadow-lg whitespace-nowrap"
      style="background: rgba(15,23,42,0.9); backdrop-filter: blur(4px)"
    >
      <span class="w-2 h-2 rounded-full shrink-0" :style="{ background: placingColor }" />
      <span>Tap the map to place — {{ placingLabel }}</span>
      <button
        class="ml-1 px-1.5 py-0.5 rounded bg-white/15 hover:bg-white/25 text-[10px] font-semibold transition-colors"
        @click="store.cancelPlacing()"
      >Esc</button>
    </div>

    <!-- Drag hint — while a feature form is open its pin is draggable. -->
    <div
      v-else-if="store.featureMode === 'form' && editingFeature"
      class="absolute top-16 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-full text-xs font-medium text-white shadow-lg whitespace-nowrap pointer-events-none"
      style="background: rgba(15,23,42,0.85); backdrop-filter: blur(4px)"
    >
      Drag the pin to move it
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import nearestPointOnLine from '@turf/nearest-point-on-line'
import length from '@turf/length'
import distance from '@turf/distance'
import { useRunWizardStore } from '~/stores/runWizard'
import type { WizardGauge, RunFeature } from '~/stores/runWizard'
import { useNHDSnap } from '~/composables/useNHDSnap'
import { useAuth } from '~/composables/useAuth'
import { flattenFlowlineCoords, buildLine, snapToLine, sliceMiles } from '~/composables/useFlowlineSnap'
import { useThemeStore } from '~/stores/theme'
import { featureListPin } from '~/utils/featureIcons'
import { featureTypeMeta, isRiverFeatureType, type RunFeatureType } from '~/utils/runFeatureTypes'
import { THEMES } from '../../../../app.config'

const store = useRunWizardStore()
const { getToken } = useAuth()
const config = useRuntimeConfig()
const toast = useToast()
const themeStore = useThemeStore()

const nldiBase = `${config.public.apiBase}/api/v1/nldi`

// Theme primary hex for the "primary"-intent map lines (downstream highlight + run line).
// MapLibre paint can't resolve CSS vars/oklch, so use the theme's primarySwatch hex.
function primaryHex(): string {
  return THEMES.find(t => t.id === themeStore.themeId)?.primarySwatch ?? '#3b82f6'
}

const snap = useNHDSnap({ nldiBase, getToken })

// Sync snap state back to store
watch(snap.riverNameSuggestion, v => { if (v) store.riverName = v })
watch(snap.gnisId, v => { if (v) store.gnisId = v })
watch(snap.upComID, v => { store.upComID = v })
watch(snap.downComID, v => { store.downComID = v })
watch(snap.previewCenterline, v => { store.previewCenterline = v })

// Re-tint the primary-intent lines when the theme changes (downstream highlight + run line).
watch(() => themeStore.themeId, () => {
  if (!map) return
  const hex = primaryHex()
  for (const id of ['wizard-downstream-line', 'wizard-centerline-line']) {
    if (map.getLayer(id)) map.setPaintProperty(id, 'line-color', hex)
  }
})

const container = ref<HTMLDivElement>()
const mapReady = ref(false)

let map: maplibregl.Map | null = null
let putInMarker: maplibregl.Marker | null = null
let takeOutMarker: maplibregl.Marker | null = null

// Track last snapped coords
let putInLngLat: [number, number] | null = null
let takeOutLngLat: [number, number] | null = null

// Debounce timer for gauge-step viewport-driven loading
let gaugeViewportTimer: ReturnType<typeof setTimeout> | null = null

// ── Run features editor (#312) ────────────────────────────────────────────────
// One HTML marker per feature, keyed by feature id. Suppress the edit-click that
// fires at the end of a drag.
const featureMarkers = new Map<string, maplibregl.Marker>()
let featureDragId: string | null = null

// The run's associated gauge, shown on the details/edit screen (amber dot —
// same visual language as the gauge-step dots). Editing the gauge itself
// still happens via the gauge step ("Change gauge").
let runGaugeMarker: maplibregl.Marker | null = null
function syncRunGaugeMarker() {
  if (!map || !mapReady.value) return
  const g = store.gauge
  const show = store.step === 'details' && g && g.lat !== 0 && g.lng !== 0
  if (!show) {
    runGaugeMarker?.remove()
    runGaugeMarker = null
    return
  }
  if (runGaugeMarker) {
    runGaugeMarker.setLngLat([g!.lng, g!.lat])
    return
  }
  const { marker } = makeStaticMarker('#f59e0b', g!.name || 'Gauge')
  marker.setLngLat([g!.lng, g!.lat]).addTo(map)
  runGaugeMarker = marker
}

const editingFeature = computed<RunFeature | null>(() =>
  store.features.find(f => f.id === store.editingFeatureId) ?? null,
)
const editingIsRiver = computed(() => !!editingFeature.value && isRiverFeatureType(editingFeature.value.type))
const placingLabel = computed(() => store.placingType ? featureTypeMeta(store.placingType).label : '')
const placingColor = computed(() => store.placingType ? featureTypeMeta(store.placingType).color : '#3b82f6')
const placingIsRiver = computed(() => !!store.placingType && isRiverFeatureType(store.placingType))

function empty(): GeoJSON.FeatureCollection {
  return { type: 'FeatureCollection', features: [] }
}

// Inject marker keyframes once into <head>
function ensureMarkerStyles() {
  if (document.getElementById('wizard-marker-style')) return
  const s = document.createElement('style')
  s.id = 'wizard-marker-style'
  s.textContent = [
    // Pulse ring for put-in marker
    `@keyframes pulseRing{0%{transform:scale(1);opacity:0.5}70%{transform:scale(1.6);opacity:0}100%{transform:scale(1.6);opacity:0}}`,
    // One-shot drop-in pop for all markers (scale+opacity; no transform so MapLibre wrapper is untouched)
    `@keyframes wizardMarkerDrop{0%{scale:0.55;opacity:0}65%{scale:1.1;opacity:1}100%{scale:1;opacity:1}}`,
    // Reduced-motion: skip drop animation entirely
    `@media(prefers-reduced-motion:reduce){.wiz-marker-drop{animation:none!important}}`,
  ].join('')
  document.head.appendChild(s)
}

function makeStaticMarker(color: string, label: string, animate = false): { el: HTMLElement; marker: maplibregl.Marker } {
  ensureMarkerStyles()

  const el = document.createElement('div')
  el.style.cssText = [
    `width:22px;height:22px;border-radius:50%;`,
    `background:${color};border:3px solid #fff;`,
    `box-shadow:0 2px 8px rgba(0,0,0,0.4);cursor:default;`,
    `transition:scale 0.15s ease;`, // scale NOT transform (MapLibre repositions via transform)
  ].join('')
  el.title = label

  // One-shot drop-in on first placement
  if (animate) {
    el.classList.add('wiz-marker-drop')
    el.style.animation = 'wizardMarkerDrop 0.38s cubic-bezier(0.22,1,0.36,1) both'
  }

  // Pulse ring for put-in
  if (color === '#22c55e') {
    el.style.position = 'relative'
    const ring = document.createElement('div')
    ring.style.cssText = `
      position:absolute;inset:-6px;border-radius:50%;
      border:2px solid ${color};opacity:0.5;
      animation:pulseRing 1.8s ease-out infinite;
    `
    el.appendChild(ring)
  }

  const marker = new maplibregl.Marker({ element: el })
  return { el, marker }
}

// Feature pins place EXACTLY where tapped — no flowline snapping. Product
// call (#314 follow-up): the NHD line can be off, and features like campsites
// legitimately sit off-water; the sat/street basemap is the user's reference.
// (Snapping against the flattened downstream network also projected pins onto
// artificial segment joins, landing them nowhere near the river.)
// Build a feature pin element: teardrop/triangle from featureIcons, name label
// above rapids/surf waves, selected halo when the feature is open in the form.
function makeFeaturePinEl(f: RunFeature): HTMLElement {
  ensureMarkerStyles()
  const wrap = document.createElement('div')
  // NO position here: MapLibre's .maplibregl-marker class is position:absolute
  // and positions the pin via a transform relative to the map container.
  // An inline position:relative overrode that, dropping each pin into normal
  // flow so extra pins stacked/drifted with zoom. The label/halo children are
  // position:absolute and anchor to this (absolutely-positioned) wrapper fine.
  wrap.style.cssText = 'cursor:pointer;transition:scale 0.15s ease;'

  const pin = document.createElement('div')
  pin.innerHTML = featureListPin({
    type: f.type,
    isRapid: f.type === 'rapid',
    isSurf: f.type === 'surf',
    isHazard: f.type === 'hazard',
  })
  pin.style.cssText = 'width:28px;height:36px;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.35));'
  const svg = pin.querySelector('svg')
  if (svg) { svg.style.width = '28px'; svg.style.height = '36px'; svg.style.display = 'block' }
  wrap.appendChild(pin)

  // Selected halo when this feature's form is open.
  if (store.editingFeatureId === f.id) {
    const halo = document.createElement('div')
    halo.style.cssText =
      'position:absolute;left:50%;bottom:2px;width:34px;height:34px;transform:translateX(-50%);' +
      'border-radius:50%;background:rgba(37,99,235,0.18);box-shadow:0 0 0 2px rgba(37,99,235,0.55);' +
      'pointer-events:none;'
    wrap.insertBefore(halo, pin)
  }

  // Name label above rapid / surf-wave pins (haloed so it reads over any basemap).
  if ((f.type === 'rapid' || f.type === 'surf') && f.name.trim()) {
    const label = document.createElement('div')
    label.textContent = f.name.trim()
    label.style.cssText =
      'position:absolute;bottom:38px;left:50%;transform:translateX(-50%);white-space:nowrap;' +
      "font:700 10px Inter,ui-sans-serif,system-ui,sans-serif;color:#14395e;pointer-events:none;" +
      'text-shadow:0 0 3px #fff,0 0 3px #fff,0 0 2px #fff,0 0 2px #fff;'
    wrap.appendChild(label)
  }
  return wrap
}

// Render the edit-mode geometry (put-in/take-out markers + trimmed run
// centerline) from prefilled store state. IDEMPOTENT — reuses markers and can
// run any number of times. Driven both from map load AND from a reactive
// watcher, because on client-side navigation the map often finishes loading
// BEFORE loadEditRun populates the store, so a load-only render silently
// missed the flow line (feature pins escaped this via their own watchers).
let editGeometryFitDone = false
function renderEditGeometry() {
  if (!map || !mapReady.value) return
  if (store.mode !== 'edit' || !store.putIn || !store.takeOut) return

  putInLngLat = [store.putIn.lng, store.putIn.lat]
  if (putInMarker) putInMarker.setLngLat(putInLngLat)
  else {
    const { marker } = makeStaticMarker('#22c55e', 'Put-in')
    marker.setLngLat(putInLngLat).addTo(map)
    putInMarker = marker
  }

  takeOutLngLat = [store.takeOut.lng, store.takeOut.lat]
  if (takeOutMarker) takeOutMarker.setLngLat(takeOutLngLat)
  else {
    const { marker } = makeStaticMarker('#ef4444', 'Take-out')
    marker.setLngLat(takeOutLngLat).addTo(map)
    takeOutMarker = marker
  }

  if (store.previewCenterline) {
    const geom = store.previewCenterline as any
    setSource('wizard-centerline', {
      type: 'FeatureCollection',
      features: [geom.type === 'Feature' ? geom : { type: 'Feature', geometry: geom, properties: {} }],
    })
  }

  updateGaugeLayers()

  // Fit to the run extent once (initial edit load). Flow-line reset does its
  // own fit during the take-out step, so don't re-fit on return to details.
  if (!editGeometryFitDone) {
    editGeometryFitDone = true
    const bounds = [putInLngLat, takeOutLngLat].reduce(
      (b, c) => b.extend(c),
      new maplibregl.LngLatBounds(putInLngLat, putInLngLat),
    )
    map.fitBounds(bounds, { padding: 80, maxZoom: 14 })
  }
}

// Reconcile HTML markers with store.features. Only active in the details step
// (create + edit feature editor); markers are removed otherwise.
function syncFeatureMarkers() {
  if (!map || !mapReady.value) return
  const active = store.step === 'details'
  const wantIds = new Set(active ? store.features.map(f => f.id) : [])

  // Remove markers whose feature is gone (or we left the details step).
  for (const [id, m] of featureMarkers) {
    if (!wantIds.has(id)) { m.remove(); featureMarkers.delete(id) }
  }
  if (!active) return

  const draggable = store.featureMode !== 'off'
  const placing = store.placingType != null

  for (const f of store.features) {
    // Rebuild the element each pass so icon/label/halo stay in sync with state.
    const el = makeFeaturePinEl(f)
    // While placing, let taps fall through to the map so a new pin can drop on top.
    el.style.pointerEvents = placing ? 'none' : 'auto'

    el.addEventListener('click', (ev) => {
      ev.stopPropagation()
      if (store.placingType) return          // placing takes precedence
      if (featureDragId === f.id) { featureDragId = null; return } // suppress post-drag click
      store.editFeature(f.id)
    })

    let m = featureMarkers.get(f.id)
    if (m) {
      // Replace the element in place (maplibre has no setElement; recreate marker).
      m.remove()
    }
    m = new maplibregl.Marker({ element: el, anchor: 'bottom', draggable })
      .setLngLat([f.lng, f.lat])
      .addTo(map)
    m.on('dragstart', () => { featureDragId = f.id })
    m.on('dragend', () => {
      const p = m!.getLngLat()
      store.moveFeature(f.id, p.lng, p.lat)
    })
    featureMarkers.set(f.id, m)
  }
}

// Placing-mode map tap → drop a new feature (snapped for river types).
function placeFeatureAt(lngLat: maplibregl.LngLat) {
  const type = store.placingType
  if (!type) return
  store.placeFeature(type, lngLat.lng, lngLat.lat)
}

function setBasemapLayers(val: 'street' | 'topo' | 'satellite') {
  if (!map) return
  const LAYER_IDS: Record<string, string> = { street: 'street-tiles', topo: 'topo-tiles', satellite: 'esri-tiles' }
  for (const [key, id] of Object.entries(LAYER_IDS)) {
    map.setLayoutProperty(id, 'visibility', key === val ? 'visible' : 'none')
  }
}

function setSource(id: string, data: GeoJSON.GeoJSON | null) {
  if (!map) return
  const src = map.getSource(id) as maplibregl.GeoJSONSource | undefined
  src?.setData(data ?? empty())
}

function updateFlowlineLayers() {
  if (!mapReady.value) return
  const step = store.step

  if (step === 'putin') {
    // Draw upstream tributaries as blue lines if put-in is placed
    setSource('wizard-upstream', snap.tributaries.value ?? empty())
    setSource('wizard-downstream', empty())
    setSource('wizard-upstream-dashed', empty())
  } else if (step === 'takeout') {
    // In takeout step: upstream = dashed muted, downstream = primary highlight
    setSource('wizard-upstream-dashed', snap.tributaries.value ?? empty())
    setSource('wizard-upstream', empty())
    setSource('wizard-downstream', snap.downstreamFlowlines.value ?? empty())
  }
}

function fitToPutInTakeOut() {
  if (!map || !putInLngLat) return
  const coords: [number, number][] = [putInLngLat]

  if (takeOutLngLat) {
    // Already placed — fit to actual take-out position
    coords.push(takeOutLngLat)
  } else {
    // Not yet placed — fit to the ~3-mile default position so the view is tight
    const downCoords = flattenFlowlineCoords(snap.downstreamFlowlines.value)
    const downLine = buildLine(downCoords)
    const defaultPos = defaultTakeOutPosition(downLine, putInLngLat)
    if (defaultPos) {
      coords.push(defaultPos)
    } else if (downCoords.length > 0) {
      const last = downCoords[downCoords.length - 1]!
      coords.push([last[0] as number, last[1] as number])
    }
  }

  if (coords.length < 2) return
  const bounds = coords.reduce(
    (b, c) => b.extend(c as [number, number]),
    new maplibregl.LngLatBounds(coords[0], coords[0])
  )
  map.fitBounds(bounds, { padding: 80, maxZoom: 14 })
}

/**
 * Click handler for the put-in step. Snaps to nearest NHD flowline,
 * places (or moves) the green marker, reveals flowlines + gauge dots.
 */
async function pickPutIn(lngLat: maplibregl.LngLat) {
  const lat = lngLat.lat
  const lng = lngLat.lng

  await snap.onAnchorPick(lat, lng)

  if (snap.startLat.value == null || snap.startLng.value == null) return

  const snappedLng = snap.startLng.value
  const snappedLat = snap.startLat.value
  putInLngLat = [snappedLng, snappedLat]

  // Place or move the non-draggable green marker at the snapped point
  if (putInMarker) {
    putInMarker.setLngLat(putInLngLat)
  } else {
    const { marker } = makeStaticMarker('#22c55e', 'Put-in', true)
    marker.setLngLat(putInLngLat).addTo(map!)
    putInMarker = marker
  }

  // Reveal flowlines and gauge dots
  updateFlowlineLayers()
  updateGaugeLayers()

  // Mark geometry as changed in edit mode
  if (store.mode === 'edit') {
    store.geometryDirty = true
    // Hide the saved centerline — user is repinning
    setSource('wizard-centerline', empty())
  }
}

/**
 * Click handler for the take-out step. Snaps to the downstream flowline,
 * moves the red marker, recomputes comid + distance.
 */
function pickTakeOut(lngLat: maplibregl.LngLat) {
  const downCoords = flattenFlowlineCoords(snap.downstreamFlowlines.value)
  const downLine = buildLine(downCoords)
  if (!downLine) return

  const snapped = snapToLine(downLine, [lngLat.lng, lngLat.lat])
  takeOutLngLat = snapped

  if (takeOutMarker) {
    takeOutMarker.setLngLat(snapped)
  }

  // Recompute distance
  if (putInLngLat) {
    store.distanceMi = sliceMiles(downLine, putInLngLat, snapped)
  }

  // Resolve downstream COMID at the new take-out point
  const comid = findDownstreamComID(snapped)
  if (comid) {
    const comidChanged = comid !== snap.downComID.value
    snap.onComIDSelect(comid, snapped[1], snapped[0])
    // When the COMID is unchanged the [upComID,downComID] watcher won't refetch
    // the trimmed centerline — do it directly so the run line follows the take-out
    // within a single COMID. (On change, the watcher already handles it.)
    if (!comidChanged) void snap.fetchPreviewCenterline()
  }

  // Mark geometry as changed in edit mode
  if (store.mode === 'edit') {
    store.geometryDirty = true
  }
}

/**
 * Find the downstream flowline feature whose geometry is nearest to a given [lng, lat] point.
 * Returns the feature's nhdplus_comid, or null if no downstream flowlines are loaded.
 */
function findDownstreamComID(lngLat: [number, number]): string | null {
  const fc = snap.downstreamFlowlines.value
  if (!fc || fc.features.length === 0) return null

  let bestComid: string | null = null
  let bestDist = Infinity

  for (const feature of fc.features) {
    const geom = feature.geometry
    if (!geom) continue
    // Build a line for this individual feature
    let coords: number[][] = []
    if (geom.type === 'LineString') coords = geom.coordinates
    else if (geom.type === 'MultiLineString') {
      for (const ring of geom.coordinates) coords.push(...ring)
    }
    if (coords.length < 2) continue
    const featureLine = buildLine(coords)
    if (!featureLine) continue
    const nearest = nearestPointOnLine(featureLine, lngLat)
    const dist = nearest.properties?.dist ?? Infinity
    if (dist < bestDist) {
      bestDist = dist
      bestComid = feature.properties?.nhdplus_comid ?? null
    }
  }

  return bestComid
}

/**
 * Find the [lng, lat] point that is approximately targetMiles downstream of putInLngLat
 * along the given downLine, clamped to a fraction of the total if too short.
 * Returns null if the line is invalid.
 */
function defaultTakeOutPosition(
  downLine: GeoJSON.Feature<GeoJSON.LineString> | null,
  putInPt: [number, number],
  targetMiles = 3,
): [number, number] | null {
  if (!downLine) return null

  // Find where the put-in sits along the down line (in km)
  const putInOnLine = nearestPointOnLine(downLine, putInPt)
  const putInLocation = (putInOnLine.properties?.location ?? 0) as number // km from line start

  // Total length of the downstream line in km
  const totalKm = length(downLine, { units: 'kilometers' })
  const targetKm = targetMiles * 1.60934 // ~3 miles in km

  // Remaining downstream from put-in
  const remainingKm = totalKm - putInLocation
  // Target advance from put-in; clamp to 60% of remaining if too short
  const advanceKm = remainingKm < targetKm
    ? remainingKm * 0.6
    : targetKm

  const targetLocation = putInLocation + advanceKm

  // Walk coords to find the point at targetLocation along the line
  const coords = downLine.geometry.coordinates
  let accumulated = 0
  for (let i = 1; i < coords.length; i++) {
    const a = coords[i - 1]!
    const b = coords[i]!
    const segLine = buildLine([a, b])
    const segLen = segLine ? length(segLine, { units: 'kilometers' }) : 0
    if (accumulated + segLen >= targetLocation) {
      // Interpolate within this segment
      const t = segLen > 0 ? (targetLocation - accumulated) / segLen : 0
      const lng = (a[0] ?? 0) + t * ((b[0] ?? 0) - (a[0] ?? 0))
      const lat = (a[1] ?? 0) + t * ((b[1] ?? 0) - (a[1] ?? 0))
      return [lng, lat]
    }
    accumulated += segLen
  }

  // Fallback: last coord
  const last = coords[coords.length - 1]!
  return [last[0] ?? 0, last[1] ?? 0]
}

function placeTakeOutMarker() {
  if (!map) return
  if (takeOutMarker) { takeOutMarker.remove(); takeOutMarker = null }

  const downCoords = flattenFlowlineCoords(snap.downstreamFlowlines.value)
  if (downCoords.length === 0) return

  const downLine = buildLine(downCoords)

  // Default: place ~3 miles downstream of the put-in (not at the far end of 800-unit load)
  const defaultPos = putInLngLat
    ? defaultTakeOutPosition(downLine, putInLngLat)
    : null
  const fallbackLast = downCoords[downCoords.length - 1]!
  takeOutLngLat = defaultPos ?? [fallbackLast[0] as number, fallbackLast[1] as number]

  const { marker } = makeStaticMarker('#ef4444', 'Take-out', true)
  marker.setLngLat(takeOutLngLat).addTo(map)
  takeOutMarker = marker

  // Resolve downstream COMID for initial placement
  const initComid = findDownstreamComID(takeOutLngLat)
  if (initComid) {
    snap.onComIDSelect(initComid, takeOutLngLat[1], takeOutLngLat[0])
  }

  // Compute initial distance
  if (putInLngLat && downLine) {
    store.distanceMi = sliceMiles(downLine, putInLngLat, takeOutLngLat)
  }
}

/**
 * Viewport-driven gauge loading for the gauge step.
 * Fetches gauges for the current map view and merges (deduped) into store.nearbyGauges.
 */
async function fetchGaugesForViewport() {
  if (!map || store.step !== 'gauge') return

  const center = map.getCenter()
  const bounds = map.getBounds()

  // Derive radius from viewport: half the diagonal of the bounding box, capped at 100 miles
  const ne = bounds.getNorthEast()
  const sw = bounds.getSouthWest()
  const diagonalMi = distance([sw.lng, sw.lat], [ne.lng, ne.lat], { units: 'miles' })
  const radiusMi = Math.min(Math.ceil(diagonalMi / 2), 100)

  const token = await getToken()
  if (!token) return

  try {
    const res = await fetch(
      `${nldiBase}/nearby-gauges?lat=${center.lat}&lng=${center.lng}&distance=${radiusMi}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    if (!res.ok) return
    const fc = await res.json() as { type: string; features: any[] }
    if (!fc?.features?.length) return

    const putIn = store.putIn
    const newGauges: WizardGauge[] = fc.features
      .filter((f: any) => f.geometry?.type === 'Point')
      .map((f: any) => {
        const coords = f.geometry.coordinates as [number, number]
        const g: WizardGauge = {
          externalId: f.properties?.identifier ?? '',
          source: f.properties?.source ?? '',
          name: f.properties?.name ?? '',
          lat: coords[1],
          lng: coords[0],
          distanceMi: undefined,
        }
        if (putIn) {
          const d = distance([putIn.lng, putIn.lat], [g.lng, g.lat], { units: 'miles' })
          g.distanceMi = Math.round(d * 10) / 10
        }
        return g
      })

    // Merge deduped by source|externalId
    const existing = new Map(store.nearbyGauges.map(g => [`${g.source}|${g.externalId}`, g]))
    for (const g of newGauges) {
      const key = `${g.source}|${g.externalId}`
      if (!existing.has(key)) {
        existing.set(key, g)
      }
    }
    store.nearbyGauges = Array.from(existing.values())
      .sort((a, b) => (a.distanceMi ?? 9999) - (b.distanceMi ?? 9999))

    updateGaugeLayers()
  } catch { /* non-fatal */ }
}

/**
 * Moveend handler — only active on the gauge step.
 * Debounces viewport-driven gauge loading.
 */
function onMoveEnd() {
  if (store.step !== 'gauge') return
  if (gaugeViewportTimer) clearTimeout(gaugeViewportTimer)
  gaugeViewportTimer = setTimeout(() => {
    void fetchGaugesForViewport()
  }, 600)
}

function addSources() {
  if (!map) return
  const sources = ['wizard-upstream', 'wizard-upstream-dashed', 'wizard-downstream', 'wizard-gauges', 'wizard-centerline']
  for (const id of sources) {
    map.addSource(id, { type: 'geojson', data: empty() })
  }
}

function addLayers() {
  if (!map) return

  // Upstream tributaries — blue (put-in step)
  map.addLayer({
    id: 'wizard-upstream-line',
    type: 'line',
    source: 'wizard-upstream',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#60a5fa', 'line-width': 2.5, 'line-opacity': 0.8 },
  })

  // Upstream dashed muted (takeout step — upstream of put-in)
  map.addLayer({
    id: 'wizard-upstream-dashed-line',
    type: 'line',
    source: 'wizard-upstream-dashed',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': '#cbd5e1',
      'line-width': 2,
      'line-opacity': 0.6,
      'line-dasharray': [3, 3],
    },
  })

  // Downstream highlight — primary color (takeout step)
  map.addLayer({
    id: 'wizard-downstream-line',
    type: 'line',
    source: 'wizard-downstream',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': primaryHex(),
      'line-width': 6,
      'line-opacity': 0.55,
    },
  })

  // Existing run centerline (edit mode — shows saved geometry)
  map.addLayer({
    id: 'wizard-centerline-line',
    type: 'line',
    source: 'wizard-centerline',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': primaryHex(),
      'line-width': 4,
      'line-opacity': 0.75,
    },
  })

  // Gauge circles — amber, visible from put-in step onward
  map.addLayer({
    id: 'wizard-gauges-circle',
    type: 'circle',
    source: 'wizard-gauges',
    filter: ['==', ['geometry-type'], 'Point'],
    layout: { visibility: 'none' },
    paint: {
      'circle-radius': [
        'case',
        ['==', ['get', 'selected'], true], 10,
        6,
      ],
      'circle-color': '#f59e0b',
      'circle-stroke-color': '#fff',
      'circle-stroke-width': [
        'case',
        ['==', ['get', 'selected'], true], 3,
        1.5,
      ],
    },
  })

  // Gauge circle click — only selects when on the gauge step
  map.on('click', 'wizard-gauges-circle', (e) => {
    if (store.step !== 'gauge') return
    const f = e.features?.[0]
    if (!f || !map) return
    const p = f.properties ?? {}
    const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number]
    const selectedGauge = {
      externalId: p.identifier ?? '',
      source: p.source ?? '',
      name: p.name ?? '',
      lat: coords[1],
      lng: coords[0],
      distanceMi: typeof p.distanceMi === 'number' ? p.distanceMi : undefined,
    }
    store.gauge = selectedGauge
    // Mark gauge as changed if different from loaded gauge in edit mode
    if (store.mode === 'edit') {
      const loaded = store.loadedGauge
      const changed = !loaded
        || loaded.externalId !== selectedGauge.externalId
        || loaded.source !== selectedGauge.source
      if (changed) store.gaugeDirty = true
    }
    updateGaugeLayers()

    // Show popup matching NHDExplorerMap style
    new maplibregl.Popup({ closeButton: false, maxWidth: '220px' })
      .setLngLat(coords)
      .setHTML(`<div style="font-size:12px;line-height:1.5">
        <b>${p.name || p.identifier || 'Gauge'}</b>
        <div style="color:#6b7280;margin-top:2px">${p.identifier ?? ''}</div>
      </div>`)
      .addTo(map)
  })

  map.on('mouseenter', 'wizard-gauges-circle', () => {
    if (map && store.step === 'gauge') map.getCanvas().style.cursor = 'pointer'
  })
  map.on('mouseleave', 'wizard-gauges-circle', () => {
    if (map) map.getCanvas().style.cursor = store.step === 'putin' || store.step === 'takeout' ? 'crosshair' : ''
  })
}

function updateGaugeLayers() {
  if (!map || !mapReady.value) return
  // Show gauge dots on put-in, takeout, and gauge steps (when a put-in has been placed)
  const hasPutIn = putInLngLat != null
  const showStep = store.step === 'putin' || store.step === 'takeout' || store.step === 'gauge'
  const shouldShow = hasPutIn && showStep

  map.setLayoutProperty('wizard-gauges-circle', 'visibility', shouldShow ? 'visible' : 'none')

  if (!shouldShow) return

  // Build a feature collection from nearbyGauges, marking the selected one
  const selectedId = store.gauge?.externalId ?? null
  const fc: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: store.nearbyGauges.map(g => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [g.lng, g.lat] },
      properties: {
        identifier: g.externalId,
        source: g.source,
        name: g.name,
        distanceMi: g.distanceMi ?? null,
        selected: g.externalId === selectedId,
      },
    })),
  }
  setSource('wizard-gauges', fc)
}

function fitToGaugeStep() {
  if (!map || !putInLngLat) return
  // If we have gauges, fit to put-in + nearest gauge so both are visible
  const nearest = store.nearbyGauges[0]
  if (!nearest) return

  const coords: [number, number][] = [putInLngLat, [nearest.lng, nearest.lat]]
  // Also include takeout if set
  if (takeOutLngLat) coords.push(takeOutLngLat)

  const bounds = coords.reduce(
    (b, c) => b.extend(c),
    new maplibregl.LngLatBounds(coords[0]!, coords[0]!)
  )
  map.fitBounds(bounds, { padding: 100, maxZoom: 13 })
}

function setCursorForStep(step: string) {
  if (!map) return
  const canvas = map.getCanvas()
  // Crosshair while placing anchors (put-in/take-out) or arming a feature pin.
  if (step === 'putin' || step === 'takeout' || store.placingType) {
    canvas.style.cursor = 'crosshair'
  } else {
    canvas.style.cursor = ''
  }
}

function initMap() {
  if (!container.value || map) return

  map = new maplibregl.Map({
    container: container.value,
    style: {
      version: 8,
      glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
      sources: {
        street: {
          type: 'raster',
          tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'],
          tileSize: 256,
          attribution: 'Tiles © Esri',
          maxzoom: 18,
        },
        topo: {
          type: 'raster',
          tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/USA_Topo_Maps/MapServer/tile/{z}/{y}/{x}'],
          tileSize: 256,
          attribution: 'Tiles © Esri — USGS, NPS',
          maxzoom: 15,
        },
        esri: {
          type: 'raster',
          tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
          tileSize: 256,
          attribution: 'Tiles © Esri',
          maxzoom: 18,
        },
      },
      layers: [
        { id: 'street-tiles', type: 'raster', source: 'street', layout: { visibility: 'visible' } },
        { id: 'topo-tiles',   type: 'raster', source: 'topo',   layout: { visibility: 'none' } },
        { id: 'esri-tiles',   type: 'raster', source: 'esri',   layout: { visibility: 'none' } },
      ],
    },
    center: [-106.0, 39.5],
    zoom: 9,
    attributionControl: false,
    fadeDuration: 0,
  })

  map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

  map.on('load', () => {
    if (!map) return
    map.resize()
    mapReady.value = true
    addSources()
    addLayers()
    setCursorForStep(store.step)
    syncFeatureMarkers()   // render any prefilled features (edit mode)
    syncRunGaugeMarker()   // render the run's associated gauge (edit mode)
    renderEditGeometry()   // put-in/take-out + centerline + fit (edit mode)
  })

  // Map click handler: routes to put-in / take-out pick, or (details step) drops
  // a feature pin when a type is armed for placing (#312).
  map.on('click', (e) => {
    if (!mapReady.value) return
    if (store.step === 'putin') {
      void pickPutIn(e.lngLat)
    } else if (store.step === 'takeout') {
      pickTakeOut(e.lngLat)
    } else if (store.step === 'details' && store.placingType) {
      placeFeatureAt(e.lngLat)
    }
  })

  // Moveend handler: only does gauge-viewport loading (not put-in snap)
  map.on('moveend', onMoveEnd)

  map.on('error', (e: any) => console.warn('[RunWizardMap]', e.error?.message ?? e))
}

// React to store.basemap changes
watch(() => store.basemap, setBasemapLayers)

// ── Feature editor reactivity (#312) ──────────────────────────────────────────
watch(() => store.step, () => { if (mapReady.value) syncFeatureMarkers() })
watch(() => store.features, () => { if (mapReady.value) syncFeatureMarkers() }, { deep: true })
watch(() => store.featureMode, () => { if (mapReady.value) syncFeatureMarkers() })
watch(() => store.editingFeatureId, (id) => {
  if (!mapReady.value) return
  syncFeatureMarkers()
  // Zoom to the feature being edited so it's actually on screen. Skip a fresh
  // draft (we're already at the tap point). Pad the side/bottom the sheet or
  // desktop panel covers so the pin centers in the visible map area.
  const f = editingFeature.value
  if (!map || !f || id === store.draftFeatureId || f.lng == null || f.lat == null) return
  const wide = typeof window !== 'undefined' && window.innerWidth >= 768
  const padding = wide
    ? { top: 0, bottom: 0, left: 0, right: 420 }
    : { top: 0, left: 0, right: 0, bottom: Math.round((typeof window !== 'undefined' ? window.innerHeight : 0) * 0.42) }
  map.easeTo({ center: [f.lng, f.lat], zoom: Math.max(map.getZoom(), 14.5), duration: 500, padding })
})
watch(() => store.placingType, () => {
  if (!mapReady.value) return
  setCursorForStep(store.step)
  syncFeatureMarkers()   // toggle pin pointer-events for placing
})

// When gauge selection changes from the panel, refresh map highlight
watch(() => store.gauge, () => {
  if (!mapReady.value) return
  if (store.step === 'gauge' || store.step === 'putin' || store.step === 'takeout') {
    updateGaugeLayers()
  }
  syncRunGaugeMarker()
})

// React to snap data changes — update flowline layers
watch([snap.tributaries, snap.downstreamFlowlines], () => {
  if (mapReady.value) updateFlowlineLayers()
}, { deep: true })

// When a new centerline is computed (after repin in edit mode), update the centerline layer
watch(snap.previewCenterline, (cl) => {
  if (!mapReady.value || !cl) return
  const geom = cl as any
  const fc: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: [
      geom.type === 'Feature'
        ? geom
        : { type: 'Feature', geometry: geom, properties: {} },
    ],
  }
  setSource('wizard-centerline', fc)
})

// When snap.gauges changes (populated after put-in snap), map features → store.nearbyGauges
watch(snap.gauges, (fc) => {
  if (!fc || !fc.features.length) {
    store.nearbyGauges = []
    return
  }
  const putIn = store.putIn
  const gauges: WizardGauge[] = fc.features
    .filter((f: any) => f.geometry?.type === 'Point')
    .map((f: any) => {
      const coords = f.geometry.coordinates as [number, number]
      const g: WizardGauge = {
        externalId: f.properties?.identifier ?? '',
        source: f.properties?.source ?? '',
        name: f.properties?.name ?? '',
        lat: coords[1],
        lng: coords[0],
        distanceMi: undefined,
      }
      if (putIn) {
        const d = distance([putIn.lng, putIn.lat], [g.lng, g.lat], { units: 'miles' })
        g.distanceMi = Math.round(d * 10) / 10
      }
      return g
    })
    .sort((a, b) => (a.distanceMi ?? 9999) - (b.distanceMi ?? 9999))

  store.nearbyGauges = gauges

  // If no gauge selected yet, pre-select nearest
  if (!store.gauge && gauges.length > 0) {
    store.gauge = gauges[0]!
  }

  // Refresh map layer — gauges are visible from put-in onward
  if (mapReady.value) {
    updateGaugeLayers()
  }
}, { deep: true })

// Edit-mode geometry is populated by loadEditRun AFTER the component mounts;
// on client-side nav that often lands after map load. Re-render whenever the
// prefilled geometry appears (or changes), but only on the edit screen so it
// doesn't fight the put-in/take-out pick handlers during a flow-line reset.
watch(
  [() => store.putIn, () => store.takeOut, () => store.previewCenterline],
  () => {
    if (mapReady.value && store.mode === 'edit' && store.step === 'details') renderEditGeometry()
  },
)

// React to step changes
watch(() => store.step, async (step) => {
  if (!mapReady.value) return

  setCursorForStep(step)

  if (step === 'takeout') {
    updateFlowlineLayers()
    // Place take-out marker after downstream flowlines arrive
    await nextTick()
    placeTakeOutMarker()
    fitToPutInTakeOut()
  } else if (step === 'putin') {
    // Redo: clear take-out marker
    takeOutMarker?.remove()
    takeOutMarker = null
    takeOutLngLat = null
    updateFlowlineLayers()
    updateGaugeLayers()
  } else if (step === 'gauge') {
    updateGaugeLayers()
    await nextTick()
    fitToGaugeStep()
  } else {
    // details / saved — clear the working flowline layers (upstream tribs +
    // full downstream network) so only the trimmed run centerline shows, then
    // (re)draw the trimmed run centerline + markers from store state. Covers
    // both the initial edit-screen entry and the return from a flow-line reset.
    setSource('wizard-downstream', empty())
    setSource('wizard-upstream', empty())
    setSource('wizard-upstream-dashed', empty())
    renderEditGeometry()
    updateGaugeLayers()
    syncRunGaugeMarker()
  }
})

function confirmPutIn() {
  if (!putInLngLat) {
    toast.add({ title: 'Tap the river to place your put-in', duration: 3000 })
    return
  }
  store.putIn = {
    lng: putInLngLat[0],
    lat: putInLngLat[1],
    comid: snap.upComID.value ?? '',
  }
  store.upComID = snap.upComID.value
  toast.add({ title: 'Click the river downstream to place your take-out', duration: 3000 })
  store.goTakeOut()
}

function confirmTakeOut() {
  if (!takeOutLngLat) return
  store.takeOut = {
    lng: takeOutLngLat[0],
    lat: takeOutLngLat[1],
    comid: snap.downComID.value ?? snap.upComID.value ?? '',
  }
  // Edit mode (flow-line reset): return straight to the edit screen — the
  // gauge is unchanged and has its own "Change gauge" affordance there.
  if (store.mode === 'edit') {
    store.finishFlowLineReset()
    toast.add({ title: 'Flow line updated — save to keep it.', duration: 3000 })
    store.goDetails()
    return
  }
  toast.add({ title: 'Run line set.', duration: 2000 })
  store.goGauge()
}

defineExpose({ confirmPutIn, confirmTakeOut })

// Esc cancels feature placing mode (#312).
function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && store.placingType) store.cancelPlacing()
}

onMounted(async () => {
  window.addEventListener('keydown', onKeyDown)
  await nextTick()
  await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(r)))
  initMap()
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
  if (gaugeViewportTimer) clearTimeout(gaugeViewportTimer)
  putInMarker?.remove()
  takeOutMarker?.remove()
  runGaugeMarker?.remove()
  runGaugeMarker = null
  for (const m of featureMarkers.values()) m.remove()
  featureMarkers.clear()
  map?.remove()
  map = null
  putInMarker = null
  takeOutMarker = null
})
</script>

<style scoped>
/* Push the zoom control below the app bar (basemap toggle lives top-right) */
:deep(.maplibregl-ctrl-top-right) {
  margin-top: 60px;
}
</style>
