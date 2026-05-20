const FONT_SCHEME_KEY = "h2oflow_font_scheme"

export interface FontScheme {
  id: string
  name: string
  description: string
  displayFont: string
  headingFont: string
  bodyFont: string
  monoFont: string
  fontStyle?: "normal" | "italic"
}

export const FONT_SCHEMES: FontScheme[] = [
  {
    id: "eddy",
    name: "Eddy",
    description: "Bubbly, inflated geometry — smooth and approachable",
    displayFont: "'Comfortaa', ui-sans-serif, sans-serif",
    headingFont: "'Comfortaa', ui-sans-serif, sans-serif",
    bodyFont: "'Nunito', ui-sans-serif, system-ui, sans-serif",
    monoFont: "'JetBrains Mono', ui-monospace, monospace",
  },
  {
    id: "hydraulic",
    name: "Hydraulic",
    description: "Angular, futuristic, gauge-instrument precise",
    displayFont: "'Chakra Petch', ui-sans-serif, sans-serif",
    headingFont: "'Chakra Petch', ui-sans-serif, sans-serif",
    bodyFont: "'Exo 2', ui-sans-serif, system-ui, sans-serif",
    monoFont: "'IBM Plex Mono', ui-monospace, monospace",
  },
  {
    id: "confluence",
    name: "Confluence",
    description: "High-contrast serif — literary, editorial, elegant",
    displayFont: "'Cormorant Garamond', Georgia, serif",
    headingFont: "'Cormorant Garamond', Georgia, serif",
    bodyFont: "'Lora', Georgia, serif",
    monoFont: "'Fira Code', ui-monospace, monospace",
  },
  {
    id: "creekin",
    name: "Creekin'",
    description: "Compressed bold italic — hard-charging and fast",
    displayFont: "'Barlow Condensed', ui-sans-serif, sans-serif",
    headingFont: "'Barlow Condensed', ui-sans-serif, sans-serif",
    bodyFont: "'Barlow', ui-sans-serif, system-ui, sans-serif",
    monoFont: "'Roboto Mono', ui-monospace, monospace",
    fontStyle: "italic",
  },
  {
    id: "ripple",
    name: "Ripple",
    description: "Airy geometric italic — soft, flowing, community-first",
    displayFont: "'Josefin Sans', ui-sans-serif, sans-serif",
    headingFont: "'Josefin Sans', ui-sans-serif, sans-serif",
    bodyFont: "'Raleway', ui-sans-serif, system-ui, sans-serif",
    monoFont: "'Fira Code', ui-monospace, monospace",
    fontStyle: "italic",
  },
]

function applyScheme(scheme: FontScheme) {
  if (typeof document === "undefined") return
  const root = document.documentElement
  root.style.setProperty("--font-display", scheme.displayFont)
  root.style.setProperty("--font-heading", scheme.headingFont)
  root.style.setProperty("--font-sans", scheme.bodyFont)
  root.style.setProperty("--font-mono", scheme.monoFont)
  root.style.setProperty("--font-style", scheme.fontStyle ?? "normal")
}

export function useFontScheme() {
  const schemeId = ref<string>("eddy")

  function load() {
    if (typeof localStorage === "undefined") return
    const saved = localStorage.getItem(FONT_SCHEME_KEY)
    const scheme = FONT_SCHEMES.find((s) => s.id === saved) ?? FONT_SCHEMES[0]!
    schemeId.value = scheme.id
    applyScheme(scheme)
  }

  function setScheme(id: string) {
    const scheme = FONT_SCHEMES.find((s) => s.id === id)
    if (!scheme) return
    schemeId.value = id
    if (typeof localStorage !== "undefined")
      localStorage.setItem(FONT_SCHEME_KEY, id)
    applyScheme(scheme)
  }

  return { schemeId, load, setScheme, schemes: FONT_SCHEMES }
}
