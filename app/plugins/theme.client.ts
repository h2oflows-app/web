import { THEMES, LEGACY_PALETTE_MAP } from '../../app.config'
import { useThemeStore } from '~/stores/theme'
import { activePrimaryRef } from '~/utils/flowPalette'

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

  function applyTheme(themeId: string) {
    const theme = THEMES.find(t => t.id === themeId)
    if (theme) {
      appConfig.ui.colors.primary = theme.primary
      appConfig.ui.colors.neutral = theme.neutral
      activePrimaryRef.value = theme.primarySwatch
    }
  }

  applyTheme(store.themeId)

  // Keep activePrimaryRef in sync when the user switches themes at runtime.
  watch(() => store.themeId, (id) => applyTheme(id))
})
