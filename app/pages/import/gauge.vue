<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-950">
    <AppHeader />

    <div class="flex justify-center px-4 mt-16">
      <div class="w-full max-w-md space-y-5">
        <div class="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 space-y-4">
          <h1 class="text-lg font-bold text-neutral-900 dark:text-white">Import Custom Gauge</h1>

          <!-- Auth not ready -->
          <div v-if="!authReady" class="flex justify-center py-4">
            <div class="w-6 h-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
          </div>

          <!-- Not authenticated -->
          <div v-else-if="!isAuthenticated" class="space-y-3">
            <p class="text-sm text-neutral-500 dark:text-neutral-400">
              Sign in to import this custom gauge formula to your account.
            </p>
            <UButton block @click="router.push('/login')">Sign in to import</UButton>
          </div>

          <!-- No token -->
          <div v-else-if="!token" class="text-sm text-red-500">
            No share token in URL. Check the link and try again.
          </div>

          <!-- Success -->
          <div v-else-if="importedSlug" class="space-y-3">
            <p class="text-sm text-green-600 dark:text-green-400 font-medium">Gauge imported successfully.</p>
            <UButton block @click="router.push(`/my/gauges/${importedSlug}`)">View gauge</UButton>
          </div>

          <!-- Ready -->
          <div v-else class="space-y-4">
            <!-- Preview -->
            <div v-if="preview" class="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 p-3 space-y-1.5">
              <p class="text-sm font-semibold text-neutral-900 dark:text-white">{{ preview.name }}</p>
              <p v-if="preview.description" class="text-xs text-neutral-500 dark:text-neutral-400">{{ preview.description }}</p>
              <div class="flex flex-wrap gap-1.5 pt-0.5">
                <span
                  v-for="inp in preview.inputs"
                  :key="inp.external_id"
                  class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-mono border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300"
                >
                  <span v-if="inp.sign === -1" class="text-red-500">−</span>
                  {{ inp.external_id }} ({{ inp.source }})
                </span>
              </div>
            </div>

            <div v-if="importError" class="rounded border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-600 dark:text-red-400">
              {{ importError }}
            </div>
            <UButton block :loading="importing" @click="doImport">Import gauge</UButton>
            <UButton block variant="ghost" color="neutral" @click="router.push('/')">Cancel</UButton>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const route = useRoute()
const router = useRouter()
const { isAuthenticated, getToken } = useAuth()
const { apiBase } = useRuntimeConfig().public

const token = computed(() => route.query.token as string | undefined)
const authReady = ref(false)
const importing = ref(false)
const importError = ref<string | null>(null)
const importedSlug = ref<string | null>(null)

const preview = computed(() => {
  if (!token.value) return null
  try {
    const base64 = token.value.replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64)) as {
      name: string
      description?: string
      unit?: string
      inputs: Array<{ external_id: string; source: string; sign: number }>
    }
  } catch {
    return null
  }
})

onMounted(() => { authReady.value = true })

async function doImport() {
  if (!token.value) return
  importing.value = true
  importError.value = null
  try {
    const jwt = await getToken()
    const res = await fetch(`${apiBase}/api/v1/me/custom-gauges/import`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}) },
      body: JSON.stringify({ token: token.value }),
    })
    const data = await res.json()
    if (!res.ok) { importError.value = data.error ?? 'Import failed'; return }
    importedSlug.value = data.slug
  } catch (e: any) {
    importError.value = e.message
  } finally {
    importing.value = false
  }
}
</script>
