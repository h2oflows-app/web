// Detent math for the explore mobile bottom sheet (web#335). Pure functions,
// no DOM — testable via the esbuild harness. Positions are translateY offsets
// in px from the fully-expanded position (0 = expanded, larger = lower).

export type DetentName = 'expanded' | 'peek' | 'hidden'

export interface Detents {
  expanded: number
  peek: number
  hidden: number
}

/** Clamp a drag offset to the sheet's travel range (with slight overdrag give). */
export function clampOffset(y: number, detents: Detents, give = 24): number {
  const min = detents.expanded - give
  const max = detents.hidden + give
  return Math.min(max, Math.max(min, y))
}

/** Nearest detent to a resting offset. */
export function nearestDetent(y: number, detents: Detents): DetentName {
  let best: DetentName = 'expanded'
  let bestDist = Infinity
  for (const name of ['expanded', 'peek', 'hidden'] as const) {
    const d = Math.abs(y - detents[name])
    if (d < bestDist) { best = name; bestDist = d }
  }
  return best
}

/**
 * Snap target after a drag ends. A decisive flick (|velocity| above
 * threshold, px/ms) moves one detent in the flick direction from the nearest
 * detent to the CURRENT position; otherwise the sheet settles on the nearest.
 */
export function snapTarget(y: number, velocity: number, detents: Detents, flickThreshold = 0.5): DetentName {
  const order: DetentName[] = ['expanded', 'peek', 'hidden']
  const near = nearestDetent(y, detents)
  if (Math.abs(velocity) < flickThreshold) return near
  const idx = order.indexOf(near)
  if (velocity > 0) return order[Math.min(order.length - 1, idx + 1)]!  // downward flick
  return order[Math.max(0, idx - 1)]!                                   // upward flick
}
