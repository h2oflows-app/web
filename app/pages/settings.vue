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
