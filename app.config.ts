export const THEMES = [
  { id: 'h2oflows', label: 'H2OFlows', primary: 'blue',    neutral: 'mist',    primarySwatch: '#3b82f6', neutralSwatch: '#6b8fa0' },
  { id: 'ocean',    label: 'Ocean',    primary: 'teal',    neutral: 'olive',   primarySwatch: '#14b8a6', neutralSwatch: '#7a7d58' },
  { id: 'river',    label: 'River',    primary: 'sky',     neutral: 'mist',    primarySwatch: '#0ea5e9', neutralSwatch: '#6b8fa0' },
  { id: 'forest',   label: 'Forest',   primary: 'emerald', neutral: 'olive',   primarySwatch: '#10b981', neutralSwatch: '#7a7d58' },
  { id: 'dawn',     label: 'Dawn',     primary: 'amber',   neutral: 'mauve',   primarySwatch: '#f59e0b', neutralSwatch: '#7d5c74' },
  { id: 'coral',    label: 'Coral',    primary: 'rose',    neutral: 'neutral', primarySwatch: '#f43f5e', neutralSwatch: '#737373' },
  { id: 'sunset',   label: 'Sunset',   primary: 'orange',  neutral: 'mauve',   primarySwatch: '#f97316', neutralSwatch: '#7d5c74' },
  { id: 'moss',     label: 'Moss',     primary: 'lime',    neutral: 'stone',   primarySwatch: '#84cc16', neutralSwatch: '#78716c' },
  { id: 'cosmic',   label: 'Cosmic',   primary: 'pink',    neutral: 'mauve',   primarySwatch: '#ec4899', neutralSwatch: '#7d5c74' },
  { id: 'night',    label: 'Night',    primary: 'indigo',  neutral: 'slate',   primarySwatch: '#6366f1', neutralSwatch: '#64748b' },
  { id: 'sunrise',  label: 'Sunrise',  primary: 'yellow',  neutral: 'mauve',   primarySwatch: '#eab308', neutralSwatch: '#7d5c74' },
] as const

export type ThemeId = typeof THEMES[number]['id']

// Legacy palette IDs (pre-0.2.14) map to new theme IDs.
export const LEGACY_PALETTE_MAP: Record<string, ThemeId> = {
  'h2oflows-slate': 'h2oflows', 'h2oflows-stone': 'h2oflows',
  'ocean-slate':    'ocean',    'ocean-stone':    'ocean',
  'river-slate':    'river',    'river-stone':    'river',
  'forest-slate':   'forest',   'forest-stone':   'forest',
  'indigo-slate':   'night',    'indigo-stone':   'night',
  'sunset-slate':   'sunset',   'sunset-stone':   'sunset',
  'coral-slate':    'coral',    'coral-stone':    'coral',
  'dawn-slate':     'dawn',     'dawn-stone':     'dawn',
  'moss-slate':     'moss',     'moss-stone':     'moss',
}

export default defineAppConfig({
  ui: {
    colors: {
      primary: 'blue',
      neutral: 'mist',
    },
  },
})
