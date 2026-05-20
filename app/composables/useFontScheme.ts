const FONT_SCHEME_KEY = 'h2oflow_font_scheme'

export interface FontScheme {
  id: string
  name: string
  description: string
  displayFont: string
  headingFont: string
  bodyFont: string
  monoFont: string
  fontStyle?: 'normal' | 'italic'
}

export const FONT_SCHEMES: FontScheme[] = [
  {
    id: 'eddy',
    name: 'Eddy',
    description: 'Calm, modern, and approachable',
    displayFont: "'Sora', ui-sans-serif, sans-serif",
    headingFont: "'Sora', ui-sans-serif, sans-serif",
    bodyFont:    "'Inter', ui-sans-serif, system-ui, sans-serif",
    monoFont:    "'JetBrains Mono', ui-monospace, monospace",
  },
  {
    id: 'hydraulic',
    name: 'Hydraulic',
    description: 'Telemetry-grade, engineered precision',
    displayFont: "'Space Grotesk', ui-sans-serif, sans-serif",
    headingFont: "'Space Grotesk', ui-sans-serif, sans-serif",
    bodyFont:    "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif",
    monoFont:    "'IBM Plex Mono', ui-monospace, monospace",
  },
  {
    id: 'confluence',
    name: 'Confluence',
    description: 'Editorial field-journal meets clean sans',
    displayFont: "'Fraunces', Georgia, serif",
    headingFont: "'Fraunces', Georgia, serif",
    bodyFont:    "'Manrope', ui-sans-serif, system-ui, sans-serif",
    monoFont:    "'Fira Code', ui-monospace, monospace",
  },
  {
    id: 'creekin',
    name: "Creekin'",
    description: 'Bold, punchy steep-creek energy',
    displayFont: "'Archivo Black', ui-sans-serif, sans-serif",
    headingFont: "'Archivo', ui-sans-serif, sans-serif",
    bodyFont:    "'Archivo', ui-sans-serif, system-ui, sans-serif",
    monoFont:    "'Roboto Mono', ui-monospace, monospace",
    fontStyle:   'italic',
  },
  {
    id: 'ripple',
    name: 'Ripple',
    description: 'Rounded, warm, and universally inviting',
    displayFont: "'Nunito Sans', ui-sans-serif, sans-serif",
    headingFont: "'Nunito Sans', ui-sans-serif, sans-serif",
    bodyFont:    "'DM Sans', ui-sans-serif, system-ui, sans-serif",
    monoFont:    "'Fira Code', ui-monospace, monospace",
  },
]

function applyScheme(scheme: FontScheme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.style.setProperty('--font-display', scheme.displayFont)
  root.style.setProperty('--font-heading', scheme.headingFont)
  root.style.setProperty('--font-sans',    scheme.bodyFont)
  root.style.setProperty('--font-mono',    scheme.monoFont)
  root.style.setProperty('--font-style',   scheme.fontStyle ?? 'normal')
}

export function useFontScheme() {
  const schemeId = ref<string>('eddy')

  function load() {
    if (typeof localStorage === 'undefined') return
    const saved = localStorage.getItem(FONT_SCHEME_KEY)
    const scheme = FONT_SCHEMES.find(s => s.id === saved) ?? FONT_SCHEMES[0]!
    schemeId.value = scheme.id
    applyScheme(scheme)
  }

  function setScheme(id: string) {
    const scheme = FONT_SCHEMES.find(s => s.id === id)
    if (!scheme) return
    schemeId.value = id
    if (typeof localStorage !== 'undefined') localStorage.setItem(FONT_SCHEME_KEY, id)
    applyScheme(scheme)
  }

  return { schemeId, load, setScheme, schemes: FONT_SCHEMES }
}
