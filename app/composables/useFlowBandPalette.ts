import { computed, watchEffect } from 'vue'
import { useThemeStore } from '~/stores/theme'
import { THEMES } from '../../app.config'
import { PALETTE_FLOW_SOLID, PALETTE_BADGE_CLASS } from '~/utils/flowBand'
import { flowColorHex, indexToValue, valueToIndex } from '~/utils/flowPalette'

/**
 * Level shift applied to a stored band color to get a readable line / caption
 * hex in the active color mode. `delta` is relative to the stored level; the
 * clamp is what makes the pair readable at either end of the palette.
 */
interface LevelShift { delta: number; min: number; max: number }

// Palette levels run 0 (lightest, Tailwind 300) → 4 (darkest, Tailwind 700)
// inside a family; a stored index is family * 5 + level.
//
// One hex cannot serve both themes. The flow-band editor accepts any indexed
// p0–p39 color, so a band saved at the light end is invisible on the white
// sheet and one saved at the dark end disappears on the near-black sheet. Dark
// mode keeps the line near the stored level and lifts the caption a step;
// light mode pushes both down. A canonical level-2 band (green-3) lands on the
// #361 token table's pairs — line green-500 / label green-400 dark, line
// green-600 / label green-700 light, modulo the usual theme tint — and the
// clamps keep every other stored level inside the readable part of its family.
const LINE_SHIFT: Record<'dark' | 'light', LevelShift> = {
  dark:  { delta:  0, min: 0, max: 2 },
  light: { delta:  1, min: 2, max: 3 },
}
const LABEL_SHIFT: Record<'dark' | 'light', LevelShift> = {
  dark:  { delta: -1, min: 0, max: 1 },
  light: { delta:  2, min: 3, max: 4 },
}

function shiftLevel(colorKey: string, shift: LevelShift): string {
  const idx    = valueToIndex(colorKey)
  const family = Math.floor(idx / 5)
  const level  = idx % 5
  const next   = Math.min(shift.max, Math.max(shift.min, level + shift.delta))
  // Back through flowColorHex so the result stays tinted by the active theme.
  return flowColorHex(indexToValue(family * 5 + next))
}

/**
 * Reads the active palette from the theme store and exposes palette-aware
 * flow band colors. Also sets CSS custom properties on the document root so
 * templates can reference `var(--flow-low)` / `var(--flow-running)` / `var(--flow-high)`
 * without needing the composable directly.
 */
export function useFlowBandPalette() {
  const themeStore = useThemeStore()

  // @nuxtjs/color-mode's useColorMode() is `useState('color-mode').value`, which
  // is undefined until its own plugin has run — and this composable is also
  // called from a client plugin, whose relative order isn't guaranteed. Read it
  // through a computed (and optional-chained) so a mode flip still lands and a
  // pre-plugin call can't throw.
  const colorMode = useColorMode()
  const mode = computed<'dark' | 'light'>(() => colorMode?.value === 'dark' ? 'dark' : 'light')

  const primary = computed(() => {
    const t = THEMES.find(t => t.id === themeStore.themeId)
    return t?.primary ?? 'blue'
  })

  const flowSolid = computed(() =>
    PALETTE_FLOW_SOLID[primary.value] ?? PALETTE_FLOW_SOLID.blue
  )

  const badgeClass = computed(() =>
    PALETTE_BADGE_CLASS[primary.value] ?? PALETTE_BADGE_CLASS.blue
  )

  if (import.meta.client) {
    watchEffect(() => {
      const c = flowSolid.value
      const root = document.documentElement
      root.style.setProperty('--flow-low',     c.low)
      root.style.setProperty('--flow-running', c.running)
      root.style.setProperty('--flow-high',    c.high)
    })
  }

  function bandSolid(band?: string | null, status?: string | null): string {
    const c = flowSolid.value
    const b = band ?? (status === 'caution' ? 'low' : status === 'runnable' ? 'running' : status === 'flood' ? 'high' : null)
    if (b === 'low')     return c.low
    if (b === 'running') return c.running
    if (b === 'high')    return c.high
    return '#9ca3af'
  }

  function bandBadgeClass(band?: string | null, status?: string | null): string {
    const table = badgeClass.value
    const b = band ?? (status === 'caution' ? 'low' : status === 'runnable' ? 'running' : status === 'flood' ? 'high' : null)
    return b ? (table[b] ?? '') : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
  }

  function bandFill(band?: string | null, status?: string | null): string {
    const solid = bandSolid(band, status)
    if (solid === '#9ca3af') return 'rgba(156,163,175,0.10)'
    // Convert hex to rgba with opacity
    const r = parseInt(solid.slice(1, 3), 16)
    const g = parseInt(solid.slice(3, 5), 16)
    const b2 = parseInt(solid.slice(5, 7), 16)
    return `rgba(${r},${g},${b2},0.22)`
  }

  /** Dotted threshold-line hex for a stored band color, per color mode. */
  function bandLineHex(colorKey: string): string {
    return shiftLevel(colorKey, LINE_SHIFT[mode.value])
  }

  /** Threshold-caption hex for a stored band color — a step off its line. */
  function bandLabelHex(colorKey: string): string {
    return shiftLevel(colorKey, LABEL_SHIFT[mode.value])
  }

  return { primary, flowSolid, bandSolid, bandBadgeClass, bandFill, bandLineHex, bandLabelHex }
}
