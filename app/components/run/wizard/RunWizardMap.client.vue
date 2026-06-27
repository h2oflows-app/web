<template>
  <div class="absolute inset-0">
    <div ref="container" class="w-full h-full" />
    <div v-if="!mapReady" class="absolute inset-0 flex items-center justify-center text-sm text-muted pointer-events-none">
      Loading map…
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import nearestPointOnLine from '@turf/nearest-point-on-line'
import length from '@turf/length'
import { useRunWizardStore } from '~/stores/runWizard'
import { useNHDSnap } from '~/composables/useNHDSnap'
import { useAuth } from '~/composables/useAuth'
import { flattenFlowlineCoords, buildLine, snapToLine, sliceMiles } from '~/composables/useFlowlineSnap'

const store = useRunWizardStore()
const { getToken } = useAuth()
const config = useRuntimeConfig()
const toast = useToast()

const nldiBase = `${config.public.apiBase}/api/v1/nldi`

const snap = useNHDSnap({ nldiBase, getToken })

// Sync snap state back to store
watch(snap.riverNameSuggestion, v => { if (v) store.riverName = v })
watch(snap.gnisId, v => { if (v) store.gnisId = v })
watch(snap.upComID, v => { store.upComID = v })
watch(snap.downComID, v => { store.downComID = v })
watch(snap.previewCenterline, v => { store.previewCenterline = v })

const container = ref<HTMLDivElement>()
const mapReady = ref(false)

let map: maplibregl.Map | null = null
let putInMarker: maplibregl.Marker | null = null
let takeOutMarker: maplibregl.Marker | null = null

// Track last snapped coords for drag constraint
let putInLngLat: [number, number] | null = null
let takeOutLngLat: [number, number] | null = null

// Debounce anchor pick on moveend
let moveendTimer: ReturnType<typeof setTimeout> | null = null

function empty(): GeoJSON.FeatureCollection {
  return { type: 'FeatureCollection', features: [] }
}

function makeDraggableMarker(color: string, label: string): { el: HTMLElement; marker: maplibregl.Marker } {
  const el = document.createElement('div')
  el.style.cssText = [
    `width:22px;height:22px;border-radius:50%;`,
    `background:${color};border:3px solid #fff;`,
    `box-shadow:0 2px 8px rgba(0,0,0,0.4);cursor:grab;`,
    `transition:scale 0.15s ease;`, // scale NOT transform (MapLibre repositions via transform)
  ].join('')
  el.title = label

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
    // Inject keyframes once
    if (!document.getElementById('wizard-pulse-style')) {
      const s = document.createElement('style')
      s.id = 'wizard-pulse-style'
      s.textContent = `@keyframes pulseRing{0%{transform:scale(1);opacity:0.5}70%{transform:scale(1.6);opacity:0}100%{transform:scale(1.6);opacity:0}}`
      document.head.appendChild(s)
    }
  }

  const marker = new maplibregl.Marker({ element: el, draggable: true })
  return { el, marker }
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
    // Draw upstream tributaries as blue lines
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

function placePutInMarker() {
  if (!map) return
  if (putInMarker) { putInMarker.remove(); putInMarker = null }

  const center = map.getCenter()
  putInLngLat = [center.lng, center.lat]

  const { marker } = makeDraggableMarker('#22c55e', 'Put-in')
  marker.setLngLat(putInLngLat).addTo(map)
  putInMarker = marker

  marker.on('drag', () => {
    const ll = marker.getLngLat()
    // Snap to combined upstream + downstream line
    const upCoords = flattenFlowlineCoords(snap.tributaries.value)
    const downCoords = flattenFlowlineCoords(snap.downstreamFlowlines.value)
    const allCoords = [...upCoords, ...downCoords]
    const line = buildLine(allCoords)
    const snapped = snapToLine(line, [ll.lng, ll.lat])
    putInLngLat = snapped
    marker.setLngLat(snapped)
  })

  marker.on('dragend', () => {
    // If dragged far from current flowline, re-snap to NHD at new location
    if (!putInLngLat) return
    const upCoords = flattenFlowlineCoords(snap.tributaries.value)
    if (upCoords.length === 0) {
      // No flowline yet — trigger a fresh anchor pick
      void snap.onAnchorPick(putInLngLat[1], putInLngLat[0])
    }
  })
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

  const { marker } = makeDraggableMarker('#ef4444', 'Take-out')
  marker.setLngLat(takeOutLngLat).addTo(map)
  takeOutMarker = marker

  // Pre-compute put-in's location along the down line for lower-fence use
  let putInLineLocation = 0
  if (downLine && putInLngLat) {
    const putInOnLine = nearestPointOnLine(downLine, putInLngLat)
    putInLineLocation = (putInOnLine.properties?.location ?? 0) as number
  }

  marker.on('drag', () => {
    const ll = marker.getLngLat()
    let snapped = snapToLine(downLine, [ll.lng, ll.lat])

    // Lower-fence: prevent take-out from going upstream of put-in
    if (downLine && putInLngLat) {
      const snappedOnLine = nearestPointOnLine(downLine, snapped)
      const snappedLocation = (snappedOnLine.properties?.location ?? 0) as number
      if (snappedLocation <= putInLineLocation) {
        // Clamp to just downstream of put-in — use the put-in snapped point itself as minimum
        const putInSnapped = nearestPointOnLine(downLine, putInLngLat)
        const c = putInSnapped.geometry.coordinates
        snapped = [c[0] ?? putInLngLat[0], c[1] ?? putInLngLat[1]]
      }
    }

    takeOutLngLat = snapped
    marker.setLngLat(snapped)

    // Update live distance (on every drag frame)
    if (putInLngLat) {
      store.distanceMi = sliceMiles(downLine, putInLngLat, snapped)
    }
  })

  marker.on('dragend', () => {
    if (!takeOutLngLat) return
    // Resolve downstream COMID at dragend (not every frame)
    const comid = findDownstreamComID(takeOutLngLat)
    if (comid) {
      // comidSlot is 'down' (set by onAnchorPick) — routes to down slot
      snap.onComIDSelect(comid, takeOutLngLat[1], takeOutLngLat[0])
    }
  })

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

// Debounced eager anchor pick on moveend (put-in step only)
function onMoveEnd() {
  if (store.step !== 'putin') return
  if (moveendTimer) clearTimeout(moveendTimer)
  moveendTimer = setTimeout(async () => {
    if (!map || store.step !== 'putin') return
    const center = map.getCenter()
    await snap.onAnchorPick(center.lat, center.lng)
    // After snap, update put-in marker position to snapped location
    if (snap.startLat.value != null && snap.startLng.value != null && putInMarker) {
      putInLngLat = [snap.startLng.value, snap.startLat.value]
      putInMarker.setLngLat(putInLngLat)
    }
    updateFlowlineLayers()
  }, 800)
}

function addSources() {
  if (!map) return
  const sources = ['wizard-upstream', 'wizard-upstream-dashed', 'wizard-downstream']
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
      'line-color': '#2563eb',
      'line-width': 6,
      'line-opacity': 0.55,
    },
  })
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
    placePutInMarker()
    // Trigger first snap eagerly
    const center = map.getCenter()
    void snap.onAnchorPick(center.lat, center.lng).then(() => {
      updateFlowlineLayers()
    })
  })

  map.on('moveend', onMoveEnd)
  map.on('error', (e: any) => console.warn('[RunWizardMap]', e.error?.message ?? e))
}

// React to store.basemap changes
watch(() => store.basemap, setBasemapLayers)

// React to snap data changes — update flowline layers
watch([snap.tributaries, snap.downstreamFlowlines], () => {
  if (mapReady.value) updateFlowlineLayers()
}, { deep: true })

// React to step changes
watch(() => store.step, async (step) => {
  if (!mapReady.value) return

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
  }
})

function confirmPutIn() {
  if (!putInLngLat) return
  store.putIn = {
    lng: putInLngLat[0],
    lat: putInLngLat[1],
    comid: snap.upComID.value ?? '',
  }
  store.upComID = snap.upComID.value
  toast.add({ title: 'Drag the take-out downstream · pinch or scroll to zoom', timeout: 3000 })
  store.goTakeOut()
}

function confirmTakeOut() {
  if (!takeOutLngLat) return
  store.takeOut = {
    lng: takeOutLngLat[0],
    lat: takeOutLngLat[1],
    comid: snap.downComID.value ?? snap.upComID.value ?? '',
  }
  toast.add({ title: 'Run line set.', timeout: 2000 })
  store.goGauge()
}

defineExpose({ confirmPutIn, confirmTakeOut })

onMounted(async () => {
  await nextTick()
  await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(r)))
  initMap()
})

onUnmounted(() => {
  if (moveendTimer) clearTimeout(moveendTimer)
  putInMarker?.remove()
  takeOutMarker?.remove()
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
