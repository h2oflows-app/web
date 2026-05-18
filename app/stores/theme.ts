import { defineStore } from 'pinia'
import type { ThemeId } from '../../app.config'

export const useThemeStore = defineStore('theme', {
  state: () => ({
    themeId: 'h2oflows' as ThemeId,
  }),
  persist: true,
})
