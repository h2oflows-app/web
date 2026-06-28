// Shared flow-band display helpers.

export type FlowBand = 'low' | 'running' | 'high'

export type FlowStatus = 'runnable' | 'caution' | 'flood' | 'unknown' | string

// ── New flexible band types (Umbrella J) ─────────────────────────────────────

export interface FlowBandThreshold {
  value: number
  label: string
  color: string // color value: "p<n>" (new) or legacy "family-level" key
}

export interface FlowBands {
  base_label: string
  base_color: string
  thresholds: FlowBandThreshold[]
}

// ── Color key lookup (6 hues × 5 levels = 30 entries) ───────────────────────
// Levels 1→5: light→dark (Tailwind 300→700)
// Still exported because flowPalette.ts reads canonical hexes from here.

export const COLOR_KEY_HEX: Record<string, string> = {
  'red-1':    '#fca5a5', // red-300
  'red-2':    '#f87171', // red-400
  'red-3':    '#ef4444', // red-500
  'red-4':    '#dc2626', // red-600
  'red-5':    '#b91c1c', // red-700
  'orange-1': '#fdba74', // orange-300
  'orange-2': '#fb923c', // orange-400
  'orange-3': '#f97316', // orange-500
  'orange-4': '#ea580c', // orange-600
  'orange-5': '#c2410c', // orange-700
  'yellow-1': '#fde047', // yellow-300
  'yellow-2': '#facc15', // yellow-400
  'yellow-3': '#eab308', // yellow-500
  'yellow-4': '#ca8a04', // yellow-600
  'yellow-5': '#a16207', // yellow-700
  'green-1':  '#86efac', // green-300
  'green-2':  '#4ade80', // green-400
  'green-3':  '#22c55e', // green-500
  'green-4':  '#16a34a', // green-600
  'green-5':  '#15803d', // green-700
  'blue-1':   '#93c5fd', // blue-300
  'blue-2':   '#60a5fa', // blue-400
  'blue-3':   '#3b82f6', // blue-500
  'blue-4':   '#2563eb', // blue-600
  'blue-5':   '#1d4ed8', // blue-700
  'purple-1': '#d8b4fe', // purple-300
  'purple-2': '#c084fc', // purple-400
  'purple-3': '#a855f7', // purple-500
  'purple-4': '#9333ea', // purple-600
  'purple-5': '#7e22ce', // purple-700
  'pink-1':   '#f9a8d4', // pink-300
  'pink-2':   '#f472b6', // pink-400
  'pink-3':   '#ec4899', // pink-500
  'pink-4':   '#db2777', // pink-600
  'pink-5':   '#be185d', // pink-700
  'neutral-1': '#e5e7eb', // gray-200
  'neutral-2': '#d1d5db', // gray-300
  'neutral-3': '#9ca3af', // gray-400
  'neutral-4': '#6b7280', // gray-500
  'neutral-5': '#4b5563', // gray-600
}

// ── Palette-backed resolvers ─────────────────────────────────────────────────
// Import lazily (SSR-safe: activePrimaryRef is a plain ref, no DOM access).
import { flowColorHex, familyOf } from './flowPalette'

// Map family name to badge/text Tailwind classes.
// Includes all families in FAMILIES plus legacy yellow/purple aliases.
const BADGE_NEUTRAL = 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
const TEXT_NEUTRAL  = 'text-gray-400'

const BADGE_BY_FAMILY: Partial<Record<string, string>> = {
  red:     'bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400',
  orange:  'bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400',
  yellow:  'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-500',
  green:   'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400',
  blue:    'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400',
  purple:  'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400',
  pink:    'bg-pink-100 dark:bg-pink-950/50 text-pink-700 dark:text-pink-400',
  neutral: BADGE_NEUTRAL,
}

const TEXT_BY_FAMILY: Partial<Record<string, string>> = {
  red:     'text-red-500',
  orange:  'text-orange-500',
  yellow:  'text-yellow-500',
  green:   'text-green-500',
  blue:    'text-blue-500',
  purple:  'text-purple-500',
  pink:    'text-pink-500',
  neutral: TEXT_NEUTRAL,
}

// colorKeyToHex: now theme+palette aware.  Accepts "p<n>", "green-3", etc.
export function colorKeyToHex(key: string): string {
  if (!key) return '#9ca3af'
  return flowColorHex(key)
}

export function colorKeyToBadgeClass(key: string): string {
  if (!key) return BADGE_NEUTRAL
  return BADGE_BY_FAMILY[familyOf(key)] ?? BADGE_NEUTRAL
}

export function colorKeyToTextClass(key: string): string {
  if (!key) return TEXT_NEUTRAL
  return TEXT_BY_FAMILY[familyOf(key)] ?? TEXT_NEUTRAL
}

// Derive coarse flow status from a color value (index or legacy key).
// red-family → caution, blue-family → flood, else runnable.
export function flowStatusForColorKey(key?: string | null): FlowStatus {
  if (!key) return 'unknown'
  const fam = familyOf(key)
  if (fam === 'red') return 'caution'
  if (fam === 'blue') return 'flood'
  // orange maps to warning/caution-adjacent but legacy treated it as runnable;
  // preserve that: any non-red, non-blue known family → runnable.
  if (fam === 'orange' || fam === 'green' || fam === 'neutral') return 'runnable'
  return 'unknown'
}

// ── Default index-form color constants ──────────────────────────────────────
// 8 families: red0 orange1 yellow2 green3 blue4 purple5 pink6 neutral7; index = fam*5 + (level-1)
// neutral-3 = 7×5 + 2 = p37 · green-3 = 3×5 + 2 = p17 · blue-3 = 4×5 + 2 = p22
export const DEFAULT_COLOR_NEUTRAL = 'p37' // formerly neutral-3
export const DEFAULT_COLOR_GREEN   = 'p17' // formerly green-3
export const DEFAULT_COLOR_BLUE    = 'p22' // formerly blue-3

// V9: highest threshold where cfs >= value; else base.
// Returns null when no thresholds are defined — run has no configured flow bands.
export function bandForCfs(cfs: number, bands: FlowBands): { label: string; color: string } | null {
  if (bands.thresholds.length === 0) return null
  const sorted = [...bands.thresholds].sort((a, b) => b.value - a.value)
  for (const t of sorted) {
    if (cfs >= t.value) return { label: t.label, color: t.color }
  }
  return { label: bands.base_label, color: bands.base_color }
}

// ── Display labels ──────────────────────────────────────────────────────────

const LABEL: Record<string, string> = {
  low:     'Too Low',
  running: 'Running',
  high:    'High',
}

export function flowBandLabel(band?: string | null, status?: string | null): string {
  if (band) return LABEL[band] ?? band // passthrough custom labels
  switch (status) {
    case 'runnable': return 'Running'
    case 'caution':  return 'Too Low'
    case 'flood':    return 'High'
    default:         return 'Unknown'
  }
}

// ── Badge pill classes (bg + text) ─────────────────────────────────────────

const BADGE: Record<string, string> = {
  low:     'bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400',
  running: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400',
  high:    'bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-400',
}

export function flowBandBadgeClass(band?: string | null, status?: string | null): string {
  if (band && BADGE[band]) return BADGE[band]
  switch (status) {
    case 'runnable': return BADGE.running
    case 'caution':  return BADGE.low
    case 'flood':    return BADGE.high
    default:         return 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
  }
}

// ── CFS number text color ──────────────────────────────────────────────────

const CFS_TEXT: Record<string, string> = {
  low:     'text-red-500',
  running: 'text-emerald-500',
  high:    'text-sky-500',
}

export function flowBandCfsClass(band?: string | null, status?: string | null): string {
  if (band && CFS_TEXT[band]) return CFS_TEXT[band]
  switch (status) {
    case 'runnable': return 'text-emerald-500'
    case 'caution':  return 'text-red-500'
    case 'flood':    return 'text-sky-500'
    default:         return 'text-gray-400'
  }
}

// ── Solid hex colors (for SVG strokes / legend swatches) ───────────────────

const SOLID: Record<string, string> = {
  low:     '#ef4444', // red-500
  running: '#34d399', // emerald-400
  high:    '#38bdf8', // sky-400
}

export function flowBandSolidColor(band?: string | null, status?: string | null): string {
  if (band && SOLID[band]) return SOLID[band]
  switch (status) {
    case 'runnable': return SOLID.running
    case 'caution':  return SOLID.low
    case 'flood':    return SOLID.high
    default:         return '#9ca3af' // gray-400
  }
}

// ── Palette-aware solid hex colors (keyed by Tailwind primary name) ─────────
// running = primary brand color; low = warm danger; high = cool flood

export const PALETTE_FLOW_SOLID: Record<string, { low: string; running: string; high: string }> = {
  //        low (red family)    running (green family)   high (blue family)
  blue:    { low: '#ef4444',   running: '#34d399',      high: '#818cf8' },  // red-500, emerald-400, indigo-400
  sky:     { low: '#f43f5e',   running: '#34d399',      high: '#6366f1' },  // rose-500, emerald-400, indigo-500
  teal:    { low: '#ef4444',   running: '#10b981',      high: '#6366f1' },  // red-500, emerald-500, indigo-500
  emerald: { low: '#ef4444',   running: '#10b981',      high: '#38bdf8' },  // red-500, emerald-500, sky-400
  indigo:  { low: '#f43f5e',   running: '#4ade80',      high: '#22d3ee' },  // rose-500, green-400, cyan-400
  orange:  { low: '#dc2626',   running: '#84cc16',      high: '#60a5fa' },  // red-600, lime-500, blue-400
  fuchsia: { low: '#ef4444',   running: '#4ade80',      high: '#22d3ee' },  // red-500, green-400, cyan-400
  rose:    { low: '#dc2626',   running: '#34d399',      high: '#818cf8' },  // red-600, emerald-400, indigo-400
  lime:    { low: '#ef4444',   running: '#84cc16',      high: '#22d3ee' },  // red-500, lime-500, cyan-400
  // New primaries added in 0.2.15 theme overhaul
  green:   { low: '#ef4444',   running: '#4ade80',      high: '#38bdf8' },  // red-500, green-400, sky-400
  cyan:    { low: '#f43f5e',   running: '#22d3ee',      high: '#818cf8' },  // rose-500, cyan-400, indigo-400
  purple:  { low: '#f43f5e',   running: '#c084fc',      high: '#38bdf8' },  // rose-500, purple-400, sky-400
  yellow:  { low: '#ef4444',   running: '#facc15',      high: '#38bdf8' },  // red-500, yellow-400, sky-400
  red:     { low: '#f97316',   running: '#34d399',      high: '#60a5fa' },  // orange-500, emerald-400, blue-400
  pink:    { low: '#ef4444',   running: '#f472b6',      high: '#38bdf8' },  // red-500, pink-400, sky-400
}

// ── Badge pill classes per palette (pre-declared so Tailwind includes them) ─

export const PALETTE_BADGE_CLASS: Record<string, { low: string; running: string; high: string }> = {
  blue:    { low: 'bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400',         running: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400', high: 'bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400' },
  sky:     { low: 'bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400',     running: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400', high: 'bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400' },
  teal:    { low: 'bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400',         running: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400', high: 'bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400' },
  emerald: { low: 'bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400',         running: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400', high: 'bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-400' },
  indigo:  { low: 'bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400',     running: 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400',         high: 'bg-cyan-100 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-400' },
  orange:  { low: 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400',         running: 'bg-lime-100 dark:bg-lime-950/50 text-lime-700 dark:text-lime-500',             high: 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400' },
  fuchsia: { low: 'bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400',         running: 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400',         high: 'bg-cyan-100 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-400' },
  rose:    { low: 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-500',         running: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400', high: 'bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400' },
  lime:    { low: 'bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400',         running: 'bg-lime-100 dark:bg-lime-950/50 text-lime-700 dark:text-lime-500',             high: 'bg-cyan-100 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-400' },
  // New primaries added in 0.2.15 theme overhaul
  green:   { low: 'bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400',         running: 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400',         high: 'bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-400' },
  cyan:    { low: 'bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400',     running: 'bg-cyan-100 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-400',             high: 'bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400' },
  purple:  { low: 'bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400',     running: 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400',     high: 'bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-400' },
  yellow:  { low: 'bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400',         running: 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-500',     high: 'bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-400' },
  red:     { low: 'bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400', running: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400', high: 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400' },
  pink:    { low: 'bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400',         running: 'bg-pink-100 dark:bg-pink-950/50 text-pink-700 dark:text-pink-400',             high: 'bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-400' },
}

export function flowBandPaletteBadgeClass(band?: string | null, status?: string | null, primary?: string | null): string {
  const table = PALETTE_BADGE_CLASS[primary ?? 'blue'] ?? PALETTE_BADGE_CLASS.blue
  const b = band ?? (status === 'caution' ? 'low' : status === 'runnable' ? 'running' : status === 'flood' ? 'high' : null)
  return b ? (table[b as keyof typeof table] ?? '') : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
}

// ── Translucent fills (chart bands) ────────────────────────────────────────

export const FLOW_BAND_FILL: Record<string, string> = {
  low:     'rgba(239,68,68,0.22)',   // red
  running: 'rgba(52,211,153,0.28)',  // emerald-400
  high:    'rgba(56,189,248,0.25)',  // sky-400
}

// Map the live band label to a coarse status bucket.
export function flowStatusForBand(band?: string | null): FlowStatus {
  if (!band) return 'unknown'
  if (band === 'low')     return 'caution'
  if (band === 'high')    return 'flood'
  if (band === 'running') return 'runnable'
  return 'unknown'
}
