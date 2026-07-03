const FONT_SIZE_KEY = 'h2oflow_font_size'

export type FontSize = 'small' | 'default' | 'large' | 'xlarge'

// Rescaled down one notch (#253 — "Large is too large"): the old Large (18px)
// is now X-Large, the old Default (16px) is now Large, Default drops a bit below
// that, and Small is a new smaller step.
const FONT_SIZE_PX: Record<FontSize, string> = {
  small:   '14px',
  default: '15px',
  large:   '16px',
  xlarge:  '18px',
}

const FONT_SIZES = Object.keys(FONT_SIZE_PX) as FontSize[]

function applyFontSize(size: FontSize) {
  if (typeof document === 'undefined') return
  document.documentElement.style.fontSize = FONT_SIZE_PX[size]
}

export function useFontSize() {
  const fontSize = ref<FontSize>('default')

  function load() {
    if (typeof localStorage === 'undefined') return
    const saved = localStorage.getItem(FONT_SIZE_KEY)
    if (saved && (FONT_SIZES as string[]).includes(saved)) {
      fontSize.value = saved as FontSize
      applyFontSize(fontSize.value)
    }
  }

  function setFontSize(size: FontSize) {
    fontSize.value = size
    if (typeof localStorage !== 'undefined') localStorage.setItem(FONT_SIZE_KEY, size)
    applyFontSize(size)
  }

  return { fontSize, load, setFontSize }
}
