<template>
  <UModal v-model:open="open" title="Import from share code">
    <template #body>
      <div class="space-y-3">
        <p class="text-sm text-neutral-500 dark:text-neutral-400">Paste a share code to import a run someone shared with you.</p>
        <UTextarea v-model="payload" placeholder="Paste share code here…" :rows="6" autofocus />
        <p v-if="error" class="text-xs text-red-500">{{ error }}</p>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton variant="ghost" color="neutral" size="sm" @click="open = false">Cancel</UButton>
        <UButton color="primary" size="sm" :loading="loading" :disabled="!payload.trim()" @click="doImport">Import</UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ (e: 'imported'): void }>()

const { apiBase } = useRuntimeConfig().public
const { getToken } = useAuth()

const payload = ref('')
const loading = ref(false)
const error   = ref('')

watch(open, v => { if (!v) { payload.value = ''; error.value = '' } })

async function doImport() {
  error.value = ''
  loading.value = true
  try {
    const parsed = JSON.parse(payload.value.trim())
    const token = await getToken()
    if (!token) { error.value = 'Sign in to import runes.'; return }
    const res = await fetch(`${apiBase}/api/v1/me/runs/import`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      error.value = err.error ?? `Import failed (${res.status})`
      return
    }
    open.value = false
    emit('imported')
  } catch {
    error.value = 'Invalid share code — paste the full JSON payload.'
  } finally {
    loading.value = false
  }
}
</script>
