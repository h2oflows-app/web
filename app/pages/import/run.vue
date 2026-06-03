<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-950">
    <AppHeader />

    <div class="flex justify-center px-4 mt-16">
      <div class="w-full max-w-md space-y-5">
        <div class="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 space-y-4">
          <h1 class="text-lg font-bold text-neutral-900 dark:text-white">Import User Run</h1>

          <div v-if="!authReady" class="flex justify-center py-4">
            <div class="w-6 h-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
          </div>

          <div v-else-if="!isAuthenticated" class="space-y-3">
            <p class="text-sm text-neutral-500 dark:text-neutral-400">Sign in to import this run to your account.</p>
            <UButton block @click="router.push('/login')">Sign in to import</UButton>
          </div>

          <div v-else-if="!token || !payload" class="text-sm text-red-500">
            Invalid or missing share token. Check the link and try again.
          </div>

          <div v-else-if="importedSlug" class="space-y-3">
            <p class="text-sm text-green-600 dark:text-green-400 font-medium">Run imported successfully.</p>
            <UButton block @click="router.push(`/my/runs/${importedSlug}`)">View Run</UButton>
          </div>

          <div v-else class="space-y-4">
            <!-- Preview -->
            <div class="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 p-3 space-y-1.5">
              <p class="text-sm font-semibold text-neutral-900 dark:text-white">{{ payload.name }}</p>
              <p v-if="payload.river_name" class="text-xs text-neutral-500 dark:text-neutral-400">{{ payload.river_name }}</p>
              <div class="flex gap-4 text-xs text-neutral-500 dark:text-neutral-400 pt-0.5">
                <span v-if="payload.put_in">Put-in: {{ payload.put_in.lat.toFixed(4) }}, {{ payload.put_in.lng.toFixed(4) }}</span>
                <span v-if="payload.take_out">Take-out: {{ payload.take_out.lat.toFixed(4) }}, {{ payload.take_out.lng.toFixed(4) }}</span>
              </div>
              <div v-if="payload.flow_bands" class="flex flex-wrap gap-2 pt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                <span>{{ payload.flow_bands.base_label }}</span>
                <span v-for="t in payload.flow_bands.thresholds" :key="t.value">{{ t.label }} ≥ {{ t.value }} cfs</span>
              </div>
            </div>

            <div v-if="importError" class="rounded border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-600 dark:text-red-400">
              {{ importError }}
            </div>

            <UButton block :loading="importing" @click="doImport">Import run</UButton>
            <UButton block variant="ghost" color="neutral" @click="router.push('/')">Cancel</UButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

definePageMeta({ ssr: false })

const route = useRoute()
const router = useRouter()
const { isAuthenticated, getToken } = useAuth()
const { apiBase } = useRuntimeConfig().public

const authReady = ref(false)
const importing = ref(false)
const importError = ref<string | null>(null)
const importedSlug = ref<string | null>(null)

onMounted(() => { authReady.value = true })

const token = computed(() => route.query.token as string | undefined)

const payload = computed(() => {
  if (!token.value) return null
  try {
    const base64 = token.value.replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(escape(atob(base64)))
    return JSON.parse(json) as {
      name: string
      river_name?: string
      put_in?: { lat: number; lng: number }
      take_out?: { lat: number; lng: number }
      flow_bands?: {
        base_label: string; base_color: string
        thresholds: Array<{ value: number; label: string; color: string }>
      }
    }
  } catch {
    return null
  }
})

async function doImport() {
  if (!payload.value) return
  importing.value = true
  importError.value = null
  try {
    const jwt = await getToken()
    const res = await fetch(`${apiBase}/api/v1/me/runs/import`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
      },
      body: JSON.stringify(payload.value),
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
