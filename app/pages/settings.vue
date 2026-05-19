<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-950">
    <AppHeader>
      <span class="text-neutral-300 dark:text-neutral-700 shrink-0">/</span>
      <span class="text-sm font-medium text-neutral-700 dark:text-neutral-200">Settings</span>
    </AppHeader>

    <main class="max-w-xl mx-auto px-4 py-8 pb-24 space-y-8">

      <!-- Profile -->
      <section class="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5 space-y-4">
        <h2 class="text-sm font-semibold text-neutral-900 dark:text-white uppercase tracking-wide">Profile</h2>

        <div v-if="profileLoading" class="flex justify-center py-4">
          <div class="w-5 h-5 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
        </div>

        <template v-else>
          <div>
            <label class="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">Email</label>
            <p class="text-sm text-neutral-700 dark:text-neutral-300">{{ email || '—' }}</p>
          </div>

          <div>
            <label class="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
              Handle <span class="font-normal text-neutral-400">(3–32 chars, a–z 0–9 _)</span>
            </label>
            <div class="flex gap-2">
              <input
                v-model="handleInput"
                type="text"
                placeholder="your_handle"
                maxlength="32"
                class="flex-1 min-w-0 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              />
              <button
                :disabled="profileSaving || handleInput === handle"
                class="shrink-0 rounded-lg bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-1.5 text-sm font-medium text-white transition-colors"
                @click="saveHandle"
              >{{ profileSaving ? 'Saving…' : 'Save' }}</button>
            </div>
            <p v-if="profileError" class="text-xs text-red-500 dark:text-red-400 mt-1">{{ profileError }}</p>
            <p v-if="profileSaved" class="text-xs text-green-600 dark:text-green-400 mt-1">Saved!</p>
          </div>
        </template>
      </section>

      <!-- Appearance -->
      <section class="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5 space-y-4">
        <h2 class="text-sm font-semibold text-neutral-900 dark:text-white uppercase tracking-wide">Appearance</h2>

        <div>
          <label class="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">Text size</label>
          <div class="flex gap-2">
            <button
              v-for="opt in fontSizeOpts"
              :key="opt.value"
              :class="[
                'flex-1 rounded-lg border py-2 text-sm font-medium transition-colors',
                fontSize === opt.value
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400'
                  : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300',
              ]"
              @click="setFontSize(opt.value)"
            >{{ opt.label }}</button>
          </div>
        </div>
      </section>

      <!-- Theme + color mode -->
      <section class="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5 space-y-4">
        <h2 class="text-sm font-semibold text-neutral-900 dark:text-white uppercase tracking-wide">Theme</h2>

        <div>
          <label class="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">Theme</label>
          <div class="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-0.5">
            <button
              v-for="t in THEMES"
              :key="t.id"
              class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-sm transition-colors text-left"
              :class="themeStore.themeId === t.id
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300'
                : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600'"
              @click="applyTheme(t.id)"
            >
              <span class="w-4 h-4 rounded-full overflow-hidden border border-neutral-200 dark:border-neutral-700 shrink-0 inline-flex">
                <span class="w-1/2 h-full" :style="{ background: t.neutralSwatch }" />
                <span class="w-1/2 h-full" :style="{ background: t.primarySwatch }" />
              </span>
              <span class="flex-1 truncate">{{ t.label }}</span>
              <svg v-if="themeStore.themeId === t.id" class="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
            </button>
          </div>
        </div>

        <div>
          <label class="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">Color mode</label>
          <div class="flex gap-2">
            <button
              v-for="mode in colorModes"
              :key="mode.value"
              :title="mode.label"
              class="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border text-xs font-medium transition-colors"
              :class="colorMode.preference === mode.value
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400'
                : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:border-neutral-300'"
              @click="colorMode.preference = mode.value"
            >
              <svg v-if="mode.value === 'light'" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
              <svg v-else-if="mode.value === 'dark'" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              <svg v-else class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
              {{ mode.label }}
            </button>
          </div>
        </div>
      </section>

      <!-- Support -->
      <section class="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5 space-y-3">
        <h2 class="text-sm font-semibold text-neutral-900 dark:text-white uppercase tracking-wide">Support H2OFlows</h2>
        <p class="text-xs text-neutral-500 dark:text-neutral-400">Like the app? Buy me a coffee — it keeps the servers running and the features coming.</p>
        <div>
          <a
            href="https://www.buymeacoffee.com/iankluhsmao"
            target="_blank"
            rel="noopener"
            class="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style="background-color:#5F7FFF; font-family:'Cookie', cursive;"
          >
            🍕 Send me pizza!
          </a>
        </div>
      </section>

    </main>
  </div>
</template>

<script setup lang="ts">
import { useFontSize, type FontSize } from '~/composables/useFontSize'
import { THEMES } from '../../app.config'
import type { ThemeId } from '../../app.config'
import { useThemeStore } from '~/stores/theme'

definePageMeta({ ssr: false })

const config   = useRuntimeConfig()
const { getToken } = useAuth()

// ── Profile ───────────────────────────────────────────────────────────────────

const profileLoading = ref(true)
const profileSaving  = ref(false)
const profileSaved   = ref(false)
const profileError   = ref('')
const handle      = ref('')
const handleInput = ref('')
const email       = ref('')

async function loadProfile() {
  profileLoading.value = true
  try {
    const token = await getToken()
    const res = await fetch(`${config.public.apiBase}/api/v1/me/profile`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (res.ok) {
      const data = await res.json()
      handle.value      = data.handle ?? ''
      handleInput.value = data.handle ?? ''
      email.value       = data.email  ?? ''
    }
  } finally {
    profileLoading.value = false
  }
}

async function saveHandle() {
  profileError.value = ''
  profileSaved.value = false
  profileSaving.value = true
  try {
    const token = await getToken()
    const res = await fetch(`${config.public.apiBase}/api/v1/me/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ handle: handleInput.value }),
    })
    const data = await res.json()
    if (!res.ok) {
      profileError.value = data.error ?? 'Save failed'
      return
    }
    handle.value = handleInput.value
    profileSaved.value = true
    setTimeout(() => { profileSaved.value = false }, 2500)
  } catch {
    profileError.value = 'Network error'
  } finally {
    profileSaving.value = false
  }
}

// ── Appearance ────────────────────────────────────────────────────────────────

const colorMode  = useColorMode()
const appConfig  = useAppConfig()
const themeStore = useThemeStore()

const colorModes = [
  { value: 'light',  label: 'Light'  },
  { value: 'dark',   label: 'Dark'   },
  { value: 'system', label: 'System' },
]

function applyTheme(id: ThemeId) {
  const theme = THEMES.find(t => t.id === id)
  if (!theme) return
  themeStore.themeId = id
  appConfig.ui.colors.primary = theme.primary
  appConfig.ui.colors.neutral = theme.neutral
}

// ── Font size ─────────────────────────────────────────────────────────────────

const { fontSize, setFontSize, load: loadFontSize } = useFontSize()

const fontSizeOpts: { value: FontSize; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'large',   label: 'Large'   },
  { value: 'xlarge',  label: 'X-Large' },
]

onMounted(() => {
  loadFontSize()
  loadProfile()
})
</script>
