// Color-harmony helpers for the flow-band color picker.
// Maps a theme's primarySwatch hex to a set of named flow-band hues via
// color-harmony rules (square, triadic, split-complementary).

// ── Hue-wheel positions for the 6 chromatic flow hues ───────────────────────
// Neutral is excluded — it's always appended separately.
const FLOW_HUE_DEGREES: Record<string, number> = {
  red:    0,
  orange: 30,
  yellow: 50,
  green:  140,
  blue:   220,
  purple: 280,
}

const CHROMATIC_HUES = Object.keys(FLOW_HUE_DEGREES) as string[]

// ── hex → HSL hue (0-360) ───────────────────────────────────────────────────

export function hexToHue(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min

  if (delta === 0) return 0

  let h: number
  if (max === r) {
    h = ((g - b) / delta) % 6
  } else if (max === g) {
    h = (b - r) / delta + 2
  } else {
    h = (r - g) / delta + 4
  }

  h = Math.round(h * 60)
  if (h < 0) h += 360
  return h
}

// ── Angular distance on a 360° wheel ────────────────────────────────────────

function angleDist(a: number, b: number): number {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

// ── Map a hue angle to the nearest named flow hue ───────────────────────────

function nearestFlowHue(angle: number): string {
  let best = CHROMATIC_HUES[0]!
  let bestDist = Infinity
  for (const hue of CHROMATIC_HUES) {
    const d = angleDist(angle, FLOW_HUE_DEGREES[hue]!)
    if (d < bestDist) {
      bestDist = d
      best = hue
    }
  }
  return best
}

// ── Harmony offsets ──────────────────────────────────────────────────────────

const HARMONY_OFFSETS: Record<string, number[]> = {
  square:               [0, 90, 180, 270],
  triadic:              [0, 120, 240],
  'split-complementary': [0, 150, 210],
}

// ── Main export ──────────────────────────────────────────────────────────────

/**
 * Given a theme's primarySwatch hex and a harmony name, return an ordered,
 * deduped list of named flow hues (chromatic only — neutral is excluded so
 * the caller can always append it explicitly).
 *
 * Example: primary=#3b82f6 (blue, hue≈217°), harmony='square'
 *   angles: 217, 307, 37, 127
 *   nearest: blue(220), purple(280), orange(30), green(140)
 *   → ['blue', 'purple', 'orange', 'green']
 */
export function themeFlowHues(
  primarySwatchHex: string | undefined,
  harmony: 'square' | 'triadic' | 'split-complementary' = 'square',
): string[] {
  if (!primarySwatchHex) return CHROMATIC_HUES.slice()

  const primaryHue = hexToHue(primarySwatchHex)
  const offsets = HARMONY_OFFSETS[harmony] ?? HARMONY_OFFSETS.square!

  const result: string[] = []
  for (const offset of offsets) {
    const angle = (primaryHue + offset) % 360
    const hue = nearestFlowHue(angle)
    if (!result.includes(hue)) {
      result.push(hue)
    }
  }
  return result
}
