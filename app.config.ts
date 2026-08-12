// `id` is a persisted key, `label` is what the picker shows — they are NOT kept
// in sync on purpose. #340 renamed three themes, and the ids stayed put because
// nothing migrates a stored `themeId`: LEGACY_PALETTE_MAP below is only consulted
// for the pre-0.2.14 `paletteId` key (see theme.client.ts), so a changed id would
// leave every existing preference unmatched and applyTheme would silently no-op,
// dropping those users back to the default palette. Hence:
//   id 'oceanus'  → "Poseidon"    (the name moved down a theme)
//   id 'poseidon' → "Futaleufu"
//   id 'sunset'   → "Animas"      (also repainted orange → amber)
//
// `neutral` values are Tailwind palettes — olive / mauve / taupe / mist are real
// entries in tailwindcss/colors as of v4.3, which is why they resolve at all.
// The *Swatch hexes are only the picker's own dots; they approximate the oklch
// ramps so the picker doesn't have to resolve CSS vars to draw itself.
export const THEMES = [
  { id: 'h2oflows',     label: 'H2OFlows',     primary: 'blue',    neutral: 'neutral', primarySwatch: '#3b82f6', neutralSwatch: '#737373' },
  { id: 'aurora',       label: 'Aurora',        primary: 'green',   neutral: 'mauve',   primarySwatch: '#22c55e', neutralSwatch: '#7d5c74' },
  { id: 'oceanus',      label: 'Poseidon',      primary: 'sky',     neutral: 'slate',   primarySwatch: '#0ea5e9', neutralSwatch: '#64748b' },
  { id: 'poseidon',     label: 'Futaleufu',     primary: 'cyan',    neutral: 'mist',    primarySwatch: '#06b6d4', neutralSwatch: '#6b8fa0' },
  { id: 'purple-haze',  label: 'Purple Haze',   primary: 'purple',  neutral: 'mauve',   primarySwatch: '#a855f7', neutralSwatch: '#7d5c74' },
  { id: 'sunrise',      label: 'Sunrise',       primary: 'yellow',  neutral: 'taupe',   primarySwatch: '#eab308', neutralSwatch: '#7a6b5a' },
  { id: 'sunset',       label: 'Animas',        primary: 'amber',   neutral: 'taupe',   primarySwatch: '#f59e0b', neutralSwatch: '#7a6b5a' },
  { id: 'miss-fire',    label: 'Miss Fire',     primary: 'red',     neutral: 'mauve',   primarySwatch: '#ef4444', neutralSwatch: '#7d5c74' },
  { id: 'pink-fizz',    label: 'Pink Fizz',     primary: 'pink',    neutral: 'mauve',   primarySwatch: '#ec4899', neutralSwatch: '#7d5c74' },
  { id: 'night',        label: 'Night',         primary: 'indigo',  neutral: 'slate',   primarySwatch: '#6366f1', neutralSwatch: '#64748b' },
  { id: 'moss',         label: 'Moss',          primary: 'lime',    neutral: 'olive',   primarySwatch: '#84cc16', neutralSwatch: '#7a7d58' },
  { id: 'emerald-city', label: 'Emerald City',  primary: 'emerald', neutral: 'mist',    primarySwatch: '#10b981', neutralSwatch: '#6b8fa0' },
] as const

export type ThemeId = typeof THEMES[number]['id']

// Maps old IDs (pre-0.2.14 paletteId strings, and pre-0.2.15 themeId strings) to current IDs.
export const LEGACY_PALETTE_MAP: Record<string, ThemeId> = {
  // pre-0.2.14 palette IDs (slate/stone variants)
  'h2oflows-slate': 'h2oflows', 'h2oflows-stone': 'h2oflows',
  'ocean-slate':    'oceanus',  'ocean-stone':    'oceanus',
  'river-slate':    'oceanus',  'river-stone':    'oceanus',
  'forest-slate':   'emerald-city', 'forest-stone': 'emerald-city',
  'indigo-slate':   'night',    'indigo-stone':   'night',
  'sunset-slate':   'sunset',   'sunset-stone':   'sunset',
  'coral-slate':    'miss-fire','coral-stone':    'miss-fire',
  'dawn-slate':     'sunrise',  'dawn-stone':     'sunrise',
  'moss-slate':     'moss',     'moss-stone':     'moss',
  // pre-0.2.15 themeId strings
  'ocean':   'oceanus',
  'river':   'oceanus',
  'forest':  'emerald-city',
  'dawn':    'sunrise',
  'coral':   'miss-fire',
  'cosmic':  'purple-haze',
}

export default defineAppConfig({
  ui: {
    colors: {
      primary: 'blue',
      neutral: 'neutral',
    },
  },
})
