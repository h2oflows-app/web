/**
 * featureIcons.ts
 *
 * Returns inline SVG HTML strings for feature type icons.
 * Used in the reach map sidebar and the features tabbed panel.
 * All content is static/trusted — safe to use with v-html.
 *
 * Icon style: 16×16 viewBox, white stroke/fill on a colored background circle.
 */

const S = 'stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"'

function svg(inner: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" style="display:block;width:100%;height:100%">${inner}</svg>`
}

// ── Pin colors (matches RunMap.vue accessColor) ───────────────────────────────
export const PIN_COLORS: Record<string, string> = {
  put_in:       '#22c55e',
  take_out:     '#ef4444',
  shuttle_drop: '#a855f7',
  intermediate: '#16a34a',
  parking:      '#dc2626',
  camp:         '#f59e0b',
  boat_ramp:    '#0ea5e9',
  rapid:        '#3b82f6',
  surf:         '#3b82f6',
  hazard:       '#dc2626',
}

/**
 * Teardrop/triangle pin SVG for the features list — matches map pin style.
 * viewBox 0 0 28 36 for teardrops, 0 0 28 28 for hazard triangles.
 * Render inside a container sized to taste (e.g. width:20px;height:26px).
 */
export function featureListPin(options: {
  type?: string
  isRapid?: boolean
  isSurf?: boolean
  isHazard?: boolean
}): string {
  const { type, isRapid, isSurf, isHazard } = options

  if (isHazard) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" style="display:block;width:100%;height:100%">
      <path d="M14 2 L27 26 L1 26 Z" fill="#dc2626" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
      <text x="14" y="22" text-anchor="middle" font-size="13" font-weight="900" font-family="system-ui,sans-serif" fill="white">!</text>
    </svg>`
  }

  const color = isRapid || isSurf ? '#3b82f6' : (PIN_COLORS[type ?? ''] ?? '#16a34a')
  const body  = `<path d="M14 2C7.9 2 3 6.9 3 13c0 7.5 11 21 11 21S25 20.5 25 13C25 6.9 20.1 2 14 2z" fill="${color}" stroke="white" stroke-width="1.5"/>`

  let inner = ''
  if (isSurf) {
    // Cresting/breaking wave for surf spots
    inner = `<path d="M4 10C7 5 14 5 17 10C14 8 10 9 9 13" stroke="white" stroke-width="2" stroke-linecap="round" fill="none"/>
      <path d="M4 18C8 15 12 15 16 18C19 21 22 20 23 17" stroke="white" stroke-width="1.8" stroke-linecap="round" fill="none"/>`
  } else if (isRapid) {
    // Two parallel wave lines
    inner = `<path d="M5 11C8 8 11 8 14 11C17 14 20 14 23 11" stroke="white" stroke-width="1.8" stroke-linecap="round" fill="none"/>
      <path d="M5 16C8 13 11 13 14 16C17 19 20 19 23 16" stroke="white" stroke-width="1.8" stroke-linecap="round" fill="none"/>`
  } else if (type === 'put_in') {
    inner = `<path d="M14 7L14 19M9 15L14 20L19 15" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`
  } else if (type === 'take_out') {
    inner = `<path d="M14 19L14 7M9 11L14 6L19 11" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`
  } else if (type === 'parking') {
    inner = `<text x="14" y="13.5" text-anchor="middle" dominant-baseline="middle" font-size="12" font-weight="900" font-family="system-ui,sans-serif" fill="white">P</text>`
  } else if (type === 'shuttle_drop') {
    inner = `<text x="14" y="13.5" text-anchor="middle" dominant-baseline="middle" font-size="12" font-weight="900" font-family="system-ui,sans-serif" fill="white">S</text>`
  } else if (type === 'camp') {
    inner = `<path d="M7 19L14 7L21 19Z" stroke="white" stroke-width="1.6" stroke-linejoin="round" fill="none"/>
      <path d="M10.5 19L14 12.5L17.5 19" stroke="white" stroke-width="1.4" stroke-linejoin="round" fill="none"/>`
  } else if (type === 'boat_ramp') {
    inner = `<path d="M6 16L22 16L19 20L9 20Z" stroke="white" stroke-width="1.4" stroke-linejoin="round" fill="none"/>
      <path d="M14 16L14 7" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M14 7L20 11" stroke="white" stroke-width="1.4" stroke-linecap="round"/>`
  } else {
    // intermediate / fallback — solid diamond
    inner = `<path fill="white" stroke="none" d="M14 7L20 13L14 19L8 13Z"/>`
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 36" style="display:block;width:100%;height:100%">
    ${body}${inner}
  </svg>`
}

/** Icon for access-point feature types (put_in, take_out, parking, camp, shuttle_drop, access). */
export function accessFeatureIcon(type: string): string {
  switch (type) {
    case 'put_in':
      // Arrow pointing down — into the water
      return svg(`<path ${S} d="M8 2v12M3 10l5 4 5-4"/>`)
    case 'take_out':
      // Arrow pointing up — out of the water
      return svg(`<path ${S} d="M8 14V2M3 6l5-4 5 4"/>`)
    case 'camp':
      // Tent triangle with internal ridge line
      return svg(`<path ${S} d="M2 14L8 2l6 12H2z"/><path ${S} d="M5.5 14L8 8l2.5 6"/>`)
    case 'parking':
      return svg(`<text fill="white" font-size="11" font-weight="900" font-family="system-ui,sans-serif" text-anchor="middle" dominant-baseline="middle" x="8" y="9">P</text>`)
    case 'shuttle_drop':
      return svg(`<text fill="white" font-size="11" font-weight="900" font-family="system-ui,sans-serif" text-anchor="middle" dominant-baseline="middle" x="8" y="9">S</text>`)
    case 'boat_ramp':
      // Boat hull + mast
      return svg(`<path ${S} d="M2 10h12l-2 3H4L2 10z"/><path ${S} d="M8 10V5"/><path ${S} d="M8 5l3 2"/>`)
    default:
      // access / intermediate — solid diamond
      return svg(`<path fill="white" stroke="none" d="M8 3l3.5 5L8 13l-3.5-5z"/>`)
  }
}

/** Icon for rapids (regular or surf wave). */
export function rapidFeatureIcon(isSurf = false): string {
  if (isSurf) {
    // Cresting wave
    return svg(
      `<path stroke="white" stroke-width="2" stroke-linecap="round" fill="none" d="M1 5C3 2 5 2 7 5C9 8 11 8 13 5C14.5 3 15.5 2 15.5 2"/>` +
      `<path stroke="white" stroke-width="2" stroke-linecap="round" fill="none" d="M1 11C3 8 5 8 7 11C9 14 11 14 13 11"/>`
    )
  }
  // Two parallel wave lines
  return svg(
    `<path stroke="white" stroke-width="2" stroke-linecap="round" fill="none" d="M1 6C3 3 5 3 7 6C9 9 11 9 13 6"/>` +
    `<path stroke="white" stroke-width="2" stroke-linecap="round" fill="none" d="M1 11C3 8 5 8 7 11C9 14 11 14 13 11"/>`
  )
}

/** Icon for permanent hazards (low-head dam, strainer, etc.). */
export function hazardFeatureIcon(): string {
  return svg(
    `<path ${S} d="M8 2L1 14h14L8 2z"/>` +
    `<line stroke="white" stroke-width="2" stroke-linecap="round" x1="8" y1="7" x2="8" y2="11"/>` +
    `<circle fill="white" cx="8" cy="13" r="1"/>`
  )
}

/** Icon for flow gauge markers in the sidebar. */
export function gaugeFeatureIcon(relationship?: string | null): string {
  if (relationship === 'upstream_indicator') {
    // Chevron pointing up
    return svg(`<path ${S} d="M3 11l5-6 5 6"/>`)
  }
  if (relationship === 'downstream_indicator') {
    // Chevron pointing down
    return svg(`<path ${S} d="M3 5l5 6 5-6"/>`)
  }
  // Single wave line — generic gauge
  return svg(
    `<path stroke="white" stroke-width="2.5" stroke-linecap="round" fill="none" d="M1 8C3 5 5 5 7 8C9 11 11 11 13 8"/>`
  )
}

/**
 * Unified helper: returns the right icon for a feature given its type and flags.
 * Use for the features panel rows in slug.vue.
 */
export function featurePanelIcon(
  type: string,
  options: { isHazard?: boolean; isSurf?: boolean } = {}
): string {
  if (options.isHazard) return hazardFeatureIcon()
  if (type === 'wave') return rapidFeatureIcon(true)
  if (type === 'rapid' || type === 'hazard') return rapidFeatureIcon(options.isSurf)
  return accessFeatureIcon(type)
}
