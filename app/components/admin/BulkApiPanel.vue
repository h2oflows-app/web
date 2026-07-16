<template>
  <div class="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 space-y-4">
    <h3 class="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Bulk API access</h3>

    <div v-if="!record" class="text-xs text-neutral-400">No API access data.</div>

    <template v-else>
      <!-- API key -->
      <div>
        <p class="text-[10px] font-medium uppercase tracking-wide text-neutral-400 mb-1.5">API key</p>
        <div class="flex flex-wrap items-center gap-2">
          <code class="px-2.5 py-1.5 rounded-md bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs font-mono text-neutral-700 dark:text-neutral-300">
            {{ displayedKey }}
          </code>
          <UButton size="xs" variant="outline" color="neutral" @click="toggleReveal">{{ revealed ? 'Hide' : 'Reveal' }}</UButton>
          <UButton size="xs" variant="outline" color="neutral" @click="copyKey">Copy</UButton>
          <UButton size="xs" variant="outline" color="warning" :loading="rotating" @click="rotate">Rotate</UButton>
        </div>
        <p v-if="!fullKey && revealed" class="text-[11px] text-neutral-400 mt-1.5">
          Full key isn't retained after creation — rotate to issue a new one and reveal it here.
        </p>

        <!-- Just-rotated highlight -->
        <div v-if="justRotatedKey" class="mt-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 p-3">
          <div class="flex items-center justify-between gap-2">
            <p class="text-xs font-semibold text-amber-700 dark:text-amber-400">New key — copy it now, it won't be shown again</p>
            <button class="text-[11px] text-amber-600 dark:text-amber-400 hover:underline" @click="justRotatedKey = null">Dismiss</button>
          </div>
          <div class="flex items-center gap-2 mt-1.5">
            <code class="flex-1 min-w-0 truncate px-2 py-1 rounded bg-white dark:bg-neutral-900 border border-amber-200 dark:border-amber-800 text-xs font-mono text-neutral-800 dark:text-neutral-100">{{ justRotatedKey }}</code>
            <UButton size="xs" color="warning" variant="outline" @click="copy(justRotatedKey!, 'Full key copied')">Copy</UButton>
          </div>
        </div>
      </div>

      <!-- Rate limits -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <p class="text-[10px] font-medium uppercase tracking-wide text-neutral-400">Rate limits</p>
          <button class="text-xs text-primary-600 dark:text-primary-400 hover:underline" @click="resetToDefaults">Reset to defaults</button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div v-for="f in fields" :key="f.key">
            <label class="block text-xs text-neutral-600 dark:text-neutral-400 mb-1">{{ f.label }}</label>
            <UInput v-model.number="draft[f.key]" type="number" min="0" size="sm" class="w-full" />
            <p class="text-[11px] text-neutral-400 mt-0.5">default {{ defaults[f.key] }}</p>
          </div>
        </div>
        <div class="flex justify-end mt-3">
          <UButton size="xs" :disabled="!dirty" :loading="saving" @click="save">Save</UButton>
        </div>
      </div>

      <!-- Usage meter -->
      <div>
        <div class="flex items-center justify-between text-xs mb-1">
          <span class="text-neutral-500">This hour's usage</span>
          <span class="font-medium text-neutral-700 dark:text-neutral-300 tabular-nums">{{ record.usage_hour }} / {{ record.rate_limit.runs_per_hour }} runs</span>
        </div>
        <div class="h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
          <div class="h-full rounded-full transition-all" :class="meterClass" :style="{ width: `${meterPct}%` }" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useAdminUsersRoles, SPECIAL_RATE_DEFAULTS, STANDARD_RATE_DEFAULTS, type RateLimit } from '~/composables/useAdminUsersRoles'

const props = defineProps<{
  ownerId: string
  isSpecial: boolean
}>()

const {
  specialUsers, selectedDirectoryUser,
  updateRateLimit, rotateSpecialUserKey, rotateUserKey,
} = useAdminUsersRoles()

const toast = useToast()

const record = computed(() => {
  if (props.isSpecial) return specialUsers.value.find(u => u.id === props.ownerId) ?? null
  return selectedDirectoryUser.value?.owner_id === props.ownerId ? selectedDirectoryUser.value : null
})

const defaults = computed<RateLimit>(() => props.isSpecial ? SPECIAL_RATE_DEFAULTS : STANDARD_RATE_DEFAULTS)

const fields: { key: keyof RateLimit; label: string }[] = [
  { key: 'runs_per_hour', label: 'Runs written / hour' },
  { key: 'max_batch', label: 'Max runs / request (batch)' },
  { key: 'requests_per_minute', label: 'Requests / minute' },
  { key: 'concurrent_jobs', label: 'Concurrent bulk jobs' },
]

const draft = reactive<RateLimit>({ runs_per_hour: 0, max_batch: 0, requests_per_minute: 0, concurrent_jobs: 0 })

watch(record, (r) => {
  if (r) Object.assign(draft, r.rate_limit)
}, { immediate: true })

const dirty = computed(() => {
  if (!record.value) return false
  return (Object.keys(draft) as (keyof RateLimit)[]).some(k => draft[k] !== record.value!.rate_limit[k])
})

const saving = ref(false)
async function save() {
  saving.value = true
  try {
    const ok = await updateRateLimit(props.ownerId, { ...draft })
    if (ok) toast.add({ title: 'Rate limits saved', color: 'success', duration: 3000 })
    else toast.add({ title: 'Failed to save rate limits', color: 'error', duration: 4000 })
  } finally {
    saving.value = false
  }
}

function resetToDefaults() {
  Object.assign(draft, defaults.value)
}

// ── Key reveal / copy / rotate ──────────────────────────────────────────
const revealed = ref(false)
const rotating = ref(false)
const fullKey = ref<string | null>(null) // populated only right after create/rotate, this session
const justRotatedKey = ref<string | null>(null)

function toggleReveal() {
  revealed.value = !revealed.value
}

const displayedKey = computed(() => {
  if (!record.value) return ''
  if (revealed.value && fullKey.value) return fullKey.value
  return `hf_live_${'•'.repeat(8)}${record.value.api_key_last4}`
})

function copy(text: string, msg = 'Copied') {
  if (import.meta.client && navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => toast.add({ title: msg, color: 'success', duration: 2000 }))
  }
}

function copyKey() {
  copy(displayedKey.value === fullKey.value && fullKey.value ? fullKey.value : displayedKey.value, revealed.value && fullKey.value ? 'Full key copied' : 'Copied (masked — rotate to get the full key)')
}

async function rotate() {
  if (import.meta.client && !confirm('Rotate this API key? The old key will stop working immediately.')) return
  rotating.value = true
  try {
    const key = props.isSpecial ? await rotateSpecialUserKey(props.ownerId) : await rotateUserKey(props.ownerId)
    if (key) {
      fullKey.value = key
      justRotatedKey.value = key
      revealed.value = true
      toast.add({ title: 'Key rotated', color: 'success', duration: 3000 })
    } else {
      toast.add({ title: 'Failed to rotate key', color: 'error', duration: 4000 })
    }
  } finally {
    rotating.value = false
  }
}

const meterPct = computed(() => {
  if (!record.value || !record.value.rate_limit.runs_per_hour) return 0
  return Math.min(100, Math.round((record.value.usage_hour / record.value.rate_limit.runs_per_hour) * 100))
})
const meterClass = computed(() => {
  if (meterPct.value > 90) return 'bg-red-500'
  if (meterPct.value > 70) return 'bg-amber-500'
  return 'bg-primary-500'
})
</script>
