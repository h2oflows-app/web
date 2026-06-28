// Flow-band palette: 8×5 grid (8 family hue rows × 5 lightness levels).
// Colors are tinted toward the active theme primary so a stored index
// recolors per theme.  Back-compat: legacy keys (e.g. "green-3") resolve
// to their positional index so nothing breaks before the data migration.
//
// Families (in order): red, orange, yellow, green, blue, purple, pink, neutral
// Levels 0–4 = light→dark (same as Tailwind 1–5 in COLOR_KEY_HEX)
// Index = familyIdx * 5 + levelIdx  (0–39)
// Stored format: "p<index>"  e.g. "p17"

import { ref } from 'vue'
import { COLOR_KEY_HEX } from './flowBand'

export const FAMILIES = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'neutral'] as const
export type FamilyName = typeof FAMILIES[number]

// neutral-3 — the fallback for empty/unknown values.
const NEUTRAL_DEFAULT = FAMILIES.indexOf('neutral') * 5 + 2

// Levels 0–4 correspond to COLOR_KEY_HEX level keys 1–5.
const LEVELS = [1, 2, 3, 4, 5] as const

// Reactive active-theme primary hex.  Set by the theme plugin/store watcher.
export const activePrimaryRef = ref('#3b82f6')

// ── Hex math ─────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3
    ? h.split('').map(c => c + c).join('')
    : h, 16)
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')
}

/** Linear blend: t=0 → a, t=1 → b */
export function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a)
  const [br, bg, bb] = hexToRgb(b)
  return rgbToHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t)
}

// ── Canonical base hexes (read from COLOR_KEY_HEX) ───────────────────────────

function canonicalHex(family: FamilyName, levelIdx: number): string {
  const level = LEVELS[levelIdx]
  return COLOR_KEY_HEX[`${family}-${level}`] ?? '#9ca3af'
}

// ── Tint strengths per family ─────────────────────────────────────────────────

const TINT: Record<FamilyName, number> = {
  red:     0.16,
  orange:  0.16,
  yellow:  0.16,
  green:   0.16,
  blue:    0.16,
  purple:  0.16,
  pink:    0.16,
  neutral: 0.06,  // greys stay grey
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Build a 25-hex palette tinted toward primaryHex.
 * Order: FAMILIES × LEVELS (outer=family, inner=level 0→4 = light→dark).
 */
export function themePalette(primaryHex?: string): string[] {
  const primary = primaryHex ?? activePrimaryRef.value
  const out: string[] = []
  for (const family of FAMILIES) {
    const t = TINT[family]
    for (let li = 0; li < 5; li++) {
      const base = canonicalHex(family, li)
      out.push(mixHex(base, primary, t))
    }
  }
  return out
}

/**
 * Convert a stored value to a palette index 0–24.
 * Accepts:
 *   "p<n>"       → n  (new format)
 *   "red-3"      → legacy key lookup
 *   unknown      → neutral-3 = p22 (sensible default)
 */
export function valueToIndex(value: string): number {
  if (!value) return NEUTRAL_DEFAULT
  // New index format is strictly "p" + digits — must not swallow legacy "purple-N".
  if (/^p\d+$/.test(value)) {
    const n = parseInt(value.slice(1), 10)
    return isNaN(n) || n < 0 || n >= FAMILIES.length * 5 ? NEUTRAL_DEFAULT : n
  }
  return legacyKeyToIndex(value)
}

/** Map legacy color key (e.g. "green-3") to palette index. */
export function legacyKeyToIndex(key: string): number {
  const dash = key.lastIndexOf('-')
  if (dash === -1) return NEUTRAL_DEFAULT
  const rawFamily = key.slice(0, dash) as FamilyName
  const rawLevel = parseInt(key.slice(dash + 1), 10)
  if (isNaN(rawLevel) || rawLevel < 1 || rawLevel > 5) return NEUTRAL_DEFAULT

  // All 7 legacy hues now have a 1:1 family — lossless.
  const familyIdx = FAMILIES.indexOf(rawFamily)
  if (familyIdx === -1) return NEUTRAL_DEFAULT
  return familyIdx * 5 + (rawLevel - 1)  // level 1–5 → index 0–4
}

/** "p<n>" for an index. */
export function indexToValue(i: number): string {
  return `p${i}`
}

/** Hex for a stored value (index or legacy), tinted to active/given theme. */
export function flowColorHex(value: string, primaryHex?: string): string {
  const palette = themePalette(primaryHex)
  return palette[valueToIndex(value)] ?? '#9ca3af'
}

/**
 * Family name for a stored value — used for badge/status mapping.
 * Returns one of the FAMILIES values (or 'neutral' as fallback).
 */
export function familyOf(value: string): FamilyName {
  const idx = valueToIndex(value)
  return FAMILIES[Math.floor(idx / 5)] ?? 'neutral'
}
