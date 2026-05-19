const FONT_SIZE_KEY = 'h2oflow_font_size'

export type FontSize = 'default' | 'large' | 'xlarge'

const FONT_SIZE_PX: Record<FontSize, string> = {
  default: '16px',
  large:   '18px',
  xlarge:  '20px',
}

function applyFontSize(size: FontSize) {
  if (typeof document === 'undefined') return
  document.documentElement.style.fontSize = FONT_SIZE_PX[size]
}

export function useFontSize() {
  const fontSize = ref<FontSize>('default')

  function load() {
    if (typeof localStorage === 'undefined') return
    const saved = localStorage.getItem(FONT_SIZE_KEY)
    if (saved === 'default' || saved === 'large' || saved === 'xlarge') {
      fontSize.value = saved
      applyFontSize(saved)
    }
  }

  function setFontSize(size: FontSize) {
    fontSize.value = size
    if (typeof localStorage !== 'undefined') localStorage.setItem(FONT_SIZE_KEY, size)
    applyFontSize(size)
  }

  return { fontSize, load, setFontSize }
}
