<template>
  <UModal v-model:open="open" title="Override Basin">
    <template #body>
      <div class="space-y-4">
        <p class="text-xs text-neutral-500 dark:text-neutral-400">
          Renames the basin for <strong class="text-neutral-700 dark:text-neutral-200">{{ riverName || 'this river' }}</strong>
          everywhere on your dashboard — not just this run.
        </p>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <span class="block text-[10px] font-bold tracking-widest text-neutral-400 uppercase mb-1">River Name</span>
            <p class="text-sm text-neutral-700 dark:text-neutral-200 truncate">{{ riverName || '—' }}</p>
          </div>
          <div>
            <span class="block text-[10px] font-bold tracking-widest text-neutral-400 uppercase mb-1">State</span>
            <p class="text-sm text-neutral-700 dark:text-neutral-200">{{ stateAbbr || '—' }}</p>
          </div>
        </div>

        <!-- No "don't type Basin" hint needed: display sites go through
             basinLabel(), which appends the word only when it isn't already
             there — so "South Platte" and "South Platte Basin" both render as
             "South Platte Basin". -->
        <UFormField label="Basin">
          <UInput
            v-model="basinInput"
            placeholder="e.g. Upper Colorado"
            maxlength="80"
            size="lg"
            class="w-full"
            :disabled="loading"
          />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center justify-between w-full gap-2">
        <UButton
          v-if="hasOverride"
          size="sm"
          variant="ghost"
          color="neutral"
          icon="i-heroicons-arrow-uturn-left"
          :loading="resetting"
          :disabled="saving"
          @click="resetToDefault"
        >Reset to default</UButton>
        <div v-else />
        <div class="flex items-center gap-2">
          <UButton size="sm" variant="ghost" color="neutral" :disabled="saving || resetting" @click="cancel">Cancel</UButton>
          <UButton size="sm" color="primary" :disabled="!basinInput.trim() || resetting" :loading="saving" @click="save">Save</UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
/**
 * BasinOverrideModal — edit-form entry point for a per-river basin label
 * override (issue: basin-override rework). Replaces the old dashboard.vue
 * inline pencil editor. Fork-copy only: this never sets a public/global
 * default, just the caller's (or the special user's, via authorAs) own
 * user_river_basin_overrides row for riverId.
 *
 * River Name + State are read-only NLDI-derived context (no schema field
 * exists to override either — basin is the only editable value). Basin
 * pre-fills from the caller's current override if one exists, else the
 * NLDI-derived default (defaultBasin prop).
 */
import { ref, watch } from 'vue'

const props = defineProps<{
  riverId: string | null
  riverName: string
  stateAbbr: string | null
  defaultBasin: string | null
  /** Special-user handle to author/edit as (?as=), or null for the caller's own account. */
  authorAs: string | null
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ saved: [basinKey: string | null] }>()

const { apiBase } = useRuntimeConfig().public
const { getToken } = useAuth()
const toast = useToast()

const loading = ref(false)
const saving = ref(false)
const resetting = ref(false)
const basinInput = ref('')
const hasOverride = ref(false)

function asQuery(): string {
  return props.authorAs ? `?as=${encodeURIComponent(props.authorAs)}` : ''
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

// Reads the full override list (?as= aware) rather than a per-river GET —
// there is no such endpoint — and finds the entry for riverId, if any.
async function loadCurrent() {
  if (!props.riverId) return
  loading.value = true
  try {
    const headers = await authHeaders()
    const res = await fetch(`${apiBase}/api/v1/me/river-basin-overrides${asQuery()}`, { headers })
    if (res.ok) {
      const data: { river_id: string; basin_key: string }[] = await res.json() ?? []
      const mine = data.find(o => o.river_id === props.riverId)
      hasOverride.value = !!mine
      basinInput.value = mine?.basin_key ?? props.defaultBasin ?? ''
    } else {
      hasOverride.value = false
      basinInput.value = props.defaultBasin ?? ''
    }
  } catch {
    hasOverride.value = false
    basinInput.value = props.defaultBasin ?? ''
  } finally {
    loading.value = false
  }
}

// immediate: true covers the mount-while-already-open case, same as
// UserRunCustomGaugeModal's load watcher.
watch(open, (v) => { if (v) loadCurrent() }, { immediate: true })

function cancel() {
  open.value = false
}

async function save() {
  if (!props.riverId) return
  const basinKey = basinInput.value.trim()
  if (!basinKey) return
  saving.value = true
  try {
    const headers = await authHeaders()
    const res = await fetch(`${apiBase}/api/v1/me/rivers/${props.riverId}/basin-override${asQuery()}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ basin_key: basinKey }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    hasOverride.value = true
    toast.add({ title: 'Basin updated', color: 'success', duration: 2500 })
    emit('saved', basinKey)
    open.value = false
  } catch (e: any) {
    toast.add({ title: 'Failed to save basin override', description: e?.message, color: 'error' })
  } finally {
    saving.value = false
  }
}

async function resetToDefault() {
  if (!props.riverId) return
  resetting.value = true
  try {
    const headers = await authHeaders()
    const res = await fetch(`${apiBase}/api/v1/me/rivers/${props.riverId}/basin-override${asQuery()}`, {
      method: 'DELETE',
      headers,
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    hasOverride.value = false
    basinInput.value = props.defaultBasin ?? ''
    toast.add({ title: 'Reset to default basin', color: 'success', duration: 2500 })
    emit('saved', null)
    open.value = false
  } catch (e: any) {
    toast.add({ title: 'Failed to reset basin', description: e?.message, color: 'error' })
  } finally {
    resetting.value = false
  }
}
</script>
