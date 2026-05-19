import { ref, type Ref } from 'vue'

interface ActivePointer { id: number; x: number; y: number }

interface Options {
  /** Width of the canvas — used for centering reset/zoom origin */
  width: Ref<number>
  height: Ref<number>
  minScale?: number
  maxScale?: number
  /** SVG element ref — required for pinch coordinate conversion */
  svgEl: Ref<SVGSVGElement | null>
}

/**
 * Pan + zoom + pinch state for SVG dendrograms.
 *
 * Lifted from BasinTree to share across that page-level usage and the
 * DashboardBasinMap modal so both get the same zoom controls.
 */
export function useDendrogramZoom({ width, height, minScale = 0.25, maxScale = 4, svgEl }: Options) {
  const scale = ref(1)
  const tx = ref(0)
  const ty = ref(0)
  const isPanning = ref(false)
  const pointers = ref<ActivePointer[]>([])
  let lastPinchDist = 0

  function clampScale(s: number) {
    return Math.min(maxScale, Math.max(minScale, s))
  }

  function zoomBy(factor: number, cx?: number, cy?: number) {
    const newScale = clampScale(scale.value * factor)
    const ratio = newScale / scale.value
    const ox = cx ?? width.value / 2
    const oy = cy ?? height.value / 2
    tx.value = ox - ratio * (ox - tx.value)
    ty.value = oy - ratio * (oy - ty.value)
    scale.value = newScale
  }

  function zoomReset() {
    scale.value = 1
    tx.value = 0
    ty.value = 0
  }

  function pinchDist() {
    if (pointers.value.length < 2) return 0
    return Math.hypot(
      pointers.value[0]!.x - pointers.value[1]!.x,
      pointers.value[0]!.y - pointers.value[1]!.y,
    )
  }
  function midpoint(a: ActivePointer, b: ActivePointer) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  }

  function onPointerDown(e: PointerEvent) {
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    pointers.value = [...pointers.value, { id: e.pointerId, x: e.clientX, y: e.clientY }]
    if (pointers.value.length === 1) isPanning.value = true
    if (pointers.value.length === 2) {
      lastPinchDist = pinchDist()
    }
  }

  function onPointerMove(e: PointerEvent) {
    const idx = pointers.value.findIndex(p => p.id === e.pointerId)
    if (idx === -1) return
    const prev = pointers.value[idx]!

    if (pointers.value.length === 1 && isPanning.value) {
      tx.value += e.clientX - prev.x
      ty.value += e.clientY - prev.y
    } else if (pointers.value.length === 2) {
      const updated = [...pointers.value]
      updated[idx] = { id: e.pointerId, x: e.clientX, y: e.clientY }
      const newDist = Math.hypot(
        updated[0]!.x - updated[1]!.x,
        updated[0]!.y - updated[1]!.y,
      )
      if (lastPinchDist > 0 && svgEl.value) {
        const mid = midpoint(updated[0]!, updated[1]!)
        const rect = svgEl.value.getBoundingClientRect()
        zoomBy(newDist / lastPinchDist, mid.x - rect.left, mid.y - rect.top)
      }
      lastPinchDist = newDist
    }

    pointers.value = pointers.value.map(p =>
      p.id === e.pointerId ? { ...p, x: e.clientX, y: e.clientY } : p,
    )
  }

  function onPointerUp(e: PointerEvent) {
    pointers.value = pointers.value.filter(p => p.id !== e.pointerId)
    if (pointers.value.length < 2) lastPinchDist = 0
    if (pointers.value.length === 0) isPanning.value = false
  }

  return {
    scale,
    tx,
    ty,
    isPanning,
    zoomBy,
    zoomReset,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  }
}
