import { THEMES, LEGACY_PALETTE_MAP } from '../../app.config'
import { useThemeStore } from '~/stores/theme'

export default defineNuxtPlugin(() => {
  const store = useThemeStore()
  const appConfig = useAppConfig()

  // Migrate legacy paletteId stored under old key in localStorage.
  const raw = localStorage.getItem('theme') // pinia-plugin-persistedstate key
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (parsed.paletteId && !parsed.themeId) {
        const mapped = LEGACY_PALETTE_MAP[parsed.paletteId as string]
        store.themeId = mapped ?? 'h2oflows'
      }
    } catch { /* corrupt storage — leave default */ }
  }

  const theme = THEMES.find(t => t.id === store.themeId)
  if (theme) {
    appConfig.ui.colors.primary = theme.primary
    appConfig.ui.colors.neutral = theme.neutral
  }
})
