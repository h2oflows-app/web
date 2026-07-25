<template>
  <UModal v-model:open="openModel" title="Crew">
    <template #body>
      <div class="space-y-3">
        <PlanCrewMeter :filled="meterFilled" :max="meterMax" title="Crew roster" />

        <div v-if="loading" class="py-6 text-center text-sm text-neutral-400">Loading…</div>
        <div v-else-if="!members.length" class="py-6 text-center text-sm text-neutral-400">No crew requests yet.</div>
        <div v-else class="divide-y divide-neutral-100 dark:divide-neutral-800 -mx-1">
          <div v-for="m in members" :key="m.member_id" class="flex items-center gap-3 px-1 py-2.5">
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">@{{ m.handle || 'paddler' }}</p>
              <p v-if="m.message" class="text-xs text-neutral-400 truncate mt-0.5">“{{ m.message }}”</p>
            </div>

            <span
              v-if="m.status === 'accepted'"
              class="shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400"
            >Accepted</span>
            <span
              v-else-if="m.status === 'declined'"
              class="shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400"
            >Declined</span>
            <div v-else class="shrink-0 flex items-center gap-1.5">
              <button
                type="button"
                class="text-[11px] font-medium px-2.5 py-1 rounded-full border border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 transition-colors"
                :disabled="!!busyId"
                @click="decline(m.member_id)"
              >Decline</button>
              <button
                type="button"
                class="text-[11px] font-medium px-2.5 py-1 rounded-full bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50 transition-colors"
                :disabled="!!busyId || (meterMax != null && meterFilled >= meterMax)"
                @click="accept(m.member_id)"
              >{{ busyId === m.member_id ? '…' : 'Accept' }}</button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { CrewListResponse, CrewRequest } from '~/utils/plan'

const props = defineProps<{
  planId: string
  open: boolean
}>()

const emit = defineEmits<{ 'update:open': [boolean]; refresh: [] }>()

const openModel = computed({
  get: () => props.open,
  set: (v: boolean) => emit('update:open', v),
})

const { apiBase } = useRuntimeConfig().public
const { getToken } = useAuth()
const toast = useToast()

const members = ref<CrewRequest[]>([])
const meterFilled = ref(0)
const meterMax = ref<number | null>(null)
const loading = ref(false)
const busyId = ref<string | null>(null)

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function load() {
  loading.value = true
  const headers = await authHeaders()
  const res = await fetch(`${apiBase}/api/v1/plans/${props.planId}/crew`, { headers }).catch(() => null)
  if (res?.ok) {
    const data: CrewListResponse = await res.json().catch(() => ({ members: [], meter: { filled: 0, max: null } }))
    members.value = data.members ?? []
    meterFilled.value = data.meter?.filled ?? 0
    meterMax.value = data.meter?.max ?? null
  }
  loading.value = false
}

watch(() => props.open, (open) => { if (open) load() })

async function accept(memberId: string) {
  if (busyId.value) return
  busyId.value = memberId
  const headers = await authHeaders()
  const res = await fetch(`${apiBase}/api/v1/plans/${props.planId}/crew/${memberId}/accept`, {
    method: 'POST', headers,
  }).catch(() => null)
  busyId.value = null
  if (!res?.ok) {
    const msg = await res?.json().catch(() => null)
    toast.add({ title: 'Could not accept', description: res?.status === 409 ? 'Crew is full' : msg?.error, color: 'error' })
    return
  }
  toast.add({ title: 'Accepted', color: 'success' })
  await load()
  emit('refresh')
}

async function decline(memberId: string) {
  if (busyId.value) return
  busyId.value = memberId
  const headers = await authHeaders()
  const res = await fetch(`${apiBase}/api/v1/plans/${props.planId}/crew/${memberId}/decline`, {
    method: 'POST', headers,
  }).catch(() => null)
  busyId.value = null
  if (!res?.ok) {
    toast.add({ title: 'Could not decline', color: 'error' })
    return
  }
  await load()
  emit('refresh')
}
</script>
