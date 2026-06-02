<template>
  <UModal v-model:open="open" :dismissible="false" title="Pick a handle">
    <template #body>
      <p class="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
        Your handle is how others find your runs. Public URLs use it: <span class="font-mono text-xs">/runs/&lt;handle&gt;/&lt;run&gt;</span>
      </p>

      <div class="space-y-3">
        <!-- Suggestions -->
        <div v-if="suggestions.length > 0">
          <p class="text-xs text-neutral-500 mb-1.5">Suggestions</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="s in suggestions"
              :key="s"
              type="button"
              class="px-2.5 py-1 rounded-full text-xs font-medium border transition-colors"
              :class="picked === s
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300'
                : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-primary-300'"
              @click="picked = s; custom = ''"
            >@{{ s }}</button>
          </div>
        </div>

        <!-- Custom input -->
        <div>
          <label class="block text-xs text-neutral-500 mb-1">Or choose your own</label>
          <div class="flex items-center gap-2">
            <span class="text-neutral-400">@</span>
            <input
              v-model="custom"
              type="text"
              placeholder="paddler-name"
              class="flex-1 rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-2 py-1.5 text-sm"
              @input="picked = ''"
            />
          </div>
          <p class="text-xs text-neutral-400 mt-1">3–30 chars, lowercase a–z, 0–9, hyphen, underscore</p>
        </div>

        <p v-if="error" class="text-xs text-red-500">{{ error }}</p>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton color="primary" :loading="saving" :disabled="!chosen" @click="save">Claim handle</UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const { user, getToken, isAuthenticated } = useAuth()
const { apiBase } = useRuntimeConfig().public

const open        = ref(false)
const suggestions = ref<string[]>([])
const picked      = ref('')
const custom      = ref('')
const saving      = ref(false)
const error       = ref('')

const chosen = computed(() => (custom.value.trim() || picked.value).toLowerCase())
const validFormat = /^[a-z0-9][a-z0-9_-]{2,29}$/

async function checkProfile() {
  if (!isAuthenticated.value) return
  const token = await getToken()
  if (!token) return
  try {
    const res = await fetch(`${apiBase}/api/v1/me/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return
    const data = await res.json()
    if (data.handle) return // already claimed
    await loadSuggestions(token)
    open.value = true
  } catch { /* non-fatal */ }
}

async function loadSuggestions(token: string) {
  const email = user.value?.email ?? ''
  try {
    const res = await fetch(`${apiBase}/api/v1/me/profile/suggest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ seed: email }),
    })
    if (res.ok) {
      const data = await res.json()
      suggestions.value = data.suggestions ?? []
      if (suggestions.value.length > 0) picked.value = suggestions.value[0]
    }
  } catch { /* non-fatal */ }
}

async function save() {
  error.value = ''
  const want = chosen.value
  if (!validFormat.test(want)) {
    error.value = 'Handle must be 3–30 chars: lowercase letters, digits, hyphen, underscore'
    return
  }
  saving.value = true
  try {
    const token = await getToken()
    if (!token) { error.value = 'Sign in required'; return }
    const res = await fetch(`${apiBase}/api/v1/me/profile`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ handle: want }),
    })
    if (res.status === 409) {
      error.value = 'Handle already taken. Try another.'
      return
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      error.value = data.error ?? `Save failed (${res.status})`
      return
    }
    open.value = false
  } catch (e: any) {
    error.value = e?.message ?? 'Network error'
  } finally {
    saving.value = false
  }
}

// Re-check whenever auth state flips to true.
watch(isAuthenticated, (v) => { if (v) checkProfile() }, { immediate: true })
</script>
