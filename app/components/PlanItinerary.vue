<template>
  <div class="space-y-4">
    <div v-for="day in itinerary" :key="day.date" class="space-y-2">
      <div class="flex items-center gap-2">
        <span class="text-xs font-semibold uppercase tracking-wide text-neutral-400">{{ dow(day.date) }} · {{ fmtDate(day.date) }}</span>
        <span v-if="day.runs.length > 1" class="text-[11px] text-neutral-400">{{ day.runs.length }} runs</span>
        <div class="flex-1 h-px bg-neutral-100 dark:bg-neutral-800" />
      </div>

      <div class="flex flex-col gap-2">
        <div v-for="run in day.runs" :key="run.id" class="space-y-1.5">
          <PlanRunItem :run="toCalendarRun(run)" :date="day.date" :can-edit="isHost" @updated="$emit('refresh')" />

          <div v-if="canLogMine(run)" class="flex justify-end">
            <button
              type="button"
              class="text-[11px] font-medium text-primary-600 dark:text-primary-400 hover:underline disabled:opacity-50 disabled:no-underline"
              :disabled="loggingId === run.id"
              @click="logMine(run)"
            >{{ loggingId === run.id ? 'Logging…' : 'Log my paddle' }}</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!itinerary.length" class="text-center py-6 text-sm text-neutral-400">No runs on this plan yet.</div>

    <button
      v-if="isHost"
      type="button"
      class="w-full py-2.5 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:border-primary-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
      @click="onAddRun"
    >+ Add a run to this plan</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { PlanDetail, PlanItineraryDay } from '~/utils/plan'
import type { PlanRunDetail } from '~/utils/planRun'
import type { CalendarRun } from '~/composables/useCalendar'
import { usePlanRunLogSheet } from '~/composables/usePlanRunLogSheet'
import { dow, fmtDate, isPastOrToday } from '~/utils/calendarDate'

const props = defineProps<{
  plan: PlanDetail
  itinerary: PlanItineraryDay[]
  isHost: boolean
  // true when the caller is an accepted crew member (not the host) — the
  // "log my paddle" affordance (invite-accept hybrid, POST
  // /plan-runs/{id}/log-mine) is host-or-accepted-member per the contract,
  // but the host already sees their own paddled state directly on the row.
  isAcceptedMember: boolean
}>()

defineEmits<{ refresh: [] }>()

const { apiBase } = useRuntimeConfig().public
const { getToken } = useAuth()
const toast = useToast()
const planRunLogSheet = usePlanRunLogSheet()

function toCalendarRun(run: PlanRunDetail): CalendarRun {
  return {
    id: run.id,
    user_reach_id: run.user_reach_id ?? undefined,
    name: run.name ?? undefined,
    flow_band: run.flow_band ?? undefined,
    flow_color: run.flow_color ?? undefined,
    gauge_cfs: run.gauge_cfs ?? undefined,
    paddled: run.paddled,
    run_time: run.run_time ?? undefined,
    plan_id: props.plan.id,
    notes: run.notes ?? undefined,
  }
}

// A crew member can log their own paddle of ANY past/today run on this plan
// that has a river run attached — independent of whether the HOST has
// marked it paddled ("your logged flows stay yours", contract decision #1).
function canLogMine(run: PlanRunDetail): boolean {
  return props.isAcceptedMember && !!run.user_reach_id && isPastOrToday(run.run_date)
}

const loggingId = ref<string | null>(null)

async function logMine(run: PlanRunDetail) {
  if (loggingId.value) return
  loggingId.value = run.id
  try {
    const token = await getToken()
    const headers: Record<string, string> = {}
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await fetch(`${apiBase}/api/v1/plan-runs/${run.id}/log-mine`, { method: 'POST', headers }).catch(() => null)
    if (!res?.ok) {
      const msg = await res?.json().catch(() => null)
      toast.add({ title: 'Could not log this paddle', description: msg?.error, color: 'error' })
      return
    }
    const data = await res.json().catch(() => null)
    toast.add({
      title: 'Logged — nice paddle!',
      color: 'success',
      actions: data?.plan_run_id ? [{ label: 'View your log', onClick: () => navigateTo(`/plan-runs/${data.plan_run_id}`) }] : undefined,
    })
  } finally {
    loggingId.value = null
  }
}

function onAddRun() {
  planRunLogSheet.openCreate(props.plan.id, props.plan.start_date)
}
</script>
