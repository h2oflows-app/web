export const THEMES = [
  { id: 'h2oflows',     label: 'H2OFlows',     primary: 'blue',    neutral: 'neutral', primarySwatch: '#3b82f6', neutralSwatch: '#737373' },
  { id: 'aurora',       label: 'Aurora',        primary: 'green',   neutral: 'mauve',   primarySwatch: '#22c55e', neutralSwatch: '#7d5c74' },
  { id: 'oceanus',      label: 'Oceanus',       primary: 'sky',     neutral: 'slate',   primarySwatch: '#0ea5e9', neutralSwatch: '#64748b' },
  { id: 'poseidon',     label: 'Poseidon',      primary: 'cyan',    neutral: 'zinc',    primarySwatch: '#06b6d4', neutralSwatch: '#71717a' },
  { id: 'purple-haze',  label: 'Purple Haze',   primary: 'purple',  neutral: 'mauve',   primarySwatch: '#a855f7', neutralSwatch: '#7d5c74' },
  { id: 'sunrise',      label: 'Sunrise',       primary: 'orange',  neutral: 'taupe',   primarySwatch: '#f97316', neutralSwatch: '#7a6b5a' },
  { id: 'sunset',       label: 'Sunset',        primary: 'yellow',  neutral: 'mauve',   primarySwatch: '#eab308', neutralSwatch: '#7d5c74' },
  { id: 'miss-fire',    label: 'Miss Fire',     primary: 'red',     neutral: 'mauve',   primarySwatch: '#ef4444', neutralSwatch: '#7d5c74' },
  { id: 'pink-fizz',    label: 'Pink Fizz',     primary: 'pink',    neutral: 'neutral', primarySwatch: '#ec4899', neutralSwatch: '#737373' },
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
  'sunset-slate':   'sunrise',  'sunset-stone':   'sunrise',
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
