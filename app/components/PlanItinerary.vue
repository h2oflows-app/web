<template>
  <div class="space-y-4">
    <div v-for="day in itinerary" :key="day.date" class="space-y-2">
      <div class="flex items-center gap-2">
        <span class="text-xs font-semibold uppercase tracking-wide text-neutral-400">{{ dow(day.date) }} · {{ fmtDate(day.date) }}</span>
        <span v-if="day.runs.length > 1" class="text-[11px] text-neutral-400">{{ day.runs.length }} runs</span>
        <div class="flex-1 h-px bg-neutral-100 dark:bg-neutral-800" />
      </div>

      <div class="flex flex-col gap-2">
        <div
          v-for="run in day.runs"
          :key="run.id"
          :id="`plan-run-${run.id}`"
          class="space-y-1.5 rounded-xl transition-shadow"
          :class="run.id === highlightRunId ? 'ring-2 ring-primary-400 dark:ring-primary-500 ring-offset-2 ring-offset-neutral-50 dark:ring-offset-neutral-950' : ''"
        >
          <PlanRunItem :run="toCalendarRun(run)" :date="day.date" :can-edit="isHost" @updated="$emit('refresh')" />

          <!-- Host: per-run Invite (web#354 W2 — replaces the removed
               plan-level InviteSheet; invites are run-scoped now, A2).
               Crew member: "Log my paddle" (unchanged, #246 W5). Mutually
               exclusive in practice (isAcceptedMember is only ever true for
               a non-host), grouped in one row when either applies. -->
          <div v-if="isHost || canLogMine(run)" class="flex items-center justify-end gap-3">
            <button
              v-if="isHost"
              type="button"
              class="text-[11px] font-medium text-primary-600 dark:text-primary-400 hover:underline"
              @click="inviteRunId = run.id"
            >Invite</button>
            <button
              v-if="canLogMine(run)"
              type="button"
              class="text-[11px] font-medium text-primary-600 dark:text-primary-400 hover:underline disabled:opacity-50 disabled:no-underline"
              :disabled="loggingId === run.id"
              @click="logMine(run)"
            >{{ loggingId === run.id ? 'Logging…' : 'Log my paddle' }}</button>
          </div>

          <!-- #246 W5: crew + RSVP moved onto the run row (mig 000144 —
               looking_for_crew/max_crew/crew live on plan_runs now). web#354
               A1: looking_for_crew now nests inside `crew` (always present),
               not a top-level field. -->
          <div v-if="run.crew.looking_for_crew" class="rounded-xl border border-neutral-100 dark:border-neutral-800 px-3.5 py-3 space-y-2">
            <PlanCrewMeter :filled="run.crew.filled" :max="run.crew.max">
              <template v-if="isHost" #action>
                <button type="button" class="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline" @click="crewPanelRunId = run.id">Manage</button>
              </template>
            </PlanCrewMeter>

            <!-- Host: nothing further here (Manage link above covers it). -->

            <!-- Non-host: Join / pending-invite accept-decline / RSVP state. -->
            <template v-if="!isHost">
              <div v-if="rsvpFor(run) === 'accepted'" class="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>
                You're in
              </div>

              <div v-else-if="rsvpFor(run) === 'invited'" class="flex items-center justify-between gap-3">
                <p class="text-xs text-neutral-500 dark:text-neutral-400">You're invited to this run</p>
                <div class="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    class="text-[11px] font-medium px-2.5 py-1 rounded-full border border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 transition-colors"
                    :disabled="rsvpBusyId === run.id"
                    @click="declineInvite(run)"
                  >Decline</button>
                  <button
                    type="button"
                    class="text-[11px] font-medium px-2.5 py-1 rounded-full bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50 transition-colors"
                    :disabled="rsvpBusyId === run.id"
                    @click="acceptInvite(run)"
                  >{{ rsvpBusyId === run.id ? '…' : 'Accept' }}</button>
                </div>
              </div>

              <div v-else-if="rsvpFor(run) === 'declined'" class="text-xs text-neutral-400">Declined</div>

              <!-- web#354 A1: no more "public plan" gate — the api's only
                   crew-join gate is this run's OWN looking_for_crew (already
                   guaranteed true by the wrapping v-if above), so this is
                   the plain fallthrough now. -->
              <div v-else class="flex items-center justify-between gap-3">
                <p class="text-xs text-neutral-500 dark:text-neutral-400">Send the host a request to join</p>
                <button
                  type="button"
                  class="shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  :class="rsvpFor(run) === 'requested' ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400' : 'bg-primary-600 hover:bg-primary-700 text-white'"
                  :disabled="rsvpBusyId === run.id || rsvpFor(run) === 'requested' || isRunFull(run)"
                  @click="joinRun(run)"
                >{{ rsvpFor(run) === 'requested' ? 'Requested' : isRunFull(run) ? 'Crew full' : rsvpBusyId === run.id ? '…' : 'Join Run' }}</button>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!itinerary.length" class="text-center py-6 text-sm text-neutral-400">No runs on this plan yet.</div>

    <PlanCrewPanel
      v-if="crewPanelRunId"
      :plan-run-id="crewPanelRunId"
      :open="!!crewPanelRunId"
      @update:open="(v) => { if (!v) crewPanelRunId = null }"
      @refresh="$emit('refresh')"
    />

    <InviteSheet
      v-if="inviteRunId"
      :run-id="inviteRunId"
      :open="!!inviteRunId"
      @update:open="(v) => { if (!v) inviteRunId = null }"
      @sent="$emit('refresh')"
    />
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import type { PlanItineraryDay } from '~/utils/plan'
import type { PlanRunDetail, PlanRunRsvpStatus } from '~/utils/planRun'
import type { CalendarRun } from '~/composables/useCalendar'
import { usePlans } from '~/composables/usePlans'
import { useInvites } from '~/composables/useInvites'
import { dow, fmtDate, isPastOrToday } from '~/utils/calendarDate'

const props = defineProps<{
  itinerary: PlanItineraryDay[]
  isHost: boolean
  // true when the caller is an accepted crew member (not the host) — the
  // "log my paddle" affordance (invite-accept hybrid, POST
  // /plan-runs/{id}/log-mine) is host-or-accepted-member per the contract,
  // but the host already sees their own paddled state directly on the row.
  isAcceptedMember: boolean
  // From the plan page's ?run= query (email-link landing, #246 W5 item 3) —
  // scrolls to + rings this run once the itinerary renders.
  highlightRunId?: string | null
}>()

const emit = defineEmits<{ refresh: [] }>()

const { apiBase } = useRuntimeConfig().public
const { getToken } = useAuth()
const toast = useToast()
const { joinPlanRun } = usePlans()
const { accept: acceptInviteMember, dismiss: dismissInviteMember } = useInvites()

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
    notes: run.notes ?? undefined,
    meetup_spot: run.meetup_spot ?? undefined,
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
      actions: data?.plan_run_id ? [{ label: 'View your log', onClick: () => { navigateTo(`/plan-runs/${data.plan_run_id}`) } }] : undefined,
    })
  } finally {
    loggingId.value = null
  }
}

// ── Per-run crew panel (host) ─────────────────────────────────────────────
const crewPanelRunId = ref<string | null>(null)

// ── Per-run invite sheet (host) — web#354 W2, replaces the removed
// plan-level InviteSheet (invites are run-scoped now, A2). Mirrors
// crewPanelRunId's pattern exactly.
const inviteRunId = ref<string | null>(null)

// ── Per-run Join / invite accept-decline (non-host) ──────────────────────
// Optimistic overlay on top of each run's server-supplied my_rsvp. Cleared
// explicitly on a successful action (before `refresh` is emitted) so later
// server truth — e.g. the host declines the request, or the crew fills up
// after this client's optimistic snapshot — is what's shown post-refresh
// instead of a permanently frozen 'requested'/'accepted'/'declined' value.
const rsvpOverride = ref<Record<string, PlanRunRsvpStatus>>({})
const rsvpBusyId = ref<string | null>(null)

function rsvpFor(run: PlanRunDetail): PlanRunRsvpStatus | null | undefined {
  return rsvpOverride.value[run.id] ?? run.my_rsvp
}

function isRunFull(run: PlanRunDetail): boolean {
  return run.crew.max != null && run.crew.filled >= run.crew.max
}

async function joinRun(run: PlanRunDetail) {
  if (rsvpBusyId.value || rsvpFor(run) === 'requested' || isRunFull(run)) return
  rsvpBusyId.value = run.id
  rsvpOverride.value = { ...rsvpOverride.value, [run.id]: 'requested' }
  const ok = await joinPlanRun(run.id)
  rsvpBusyId.value = null
  const next = { ...rsvpOverride.value }
  delete next[run.id]
  rsvpOverride.value = next
  if (!ok) return
  emit('refresh')
}

// "Decline" here calls the existing dismiss endpoint (POST
// /invites/{memberId}/dismiss) — there is no separate decline verb for
// origin=invite rows in the contract (only accept/dismiss); dismissing an
// invited run is the closest match to "no thanks" from this surface.
async function declineInvite(run: PlanRunDetail) {
  if (rsvpBusyId.value || !run.my_member_id) return
  rsvpBusyId.value = run.id
  rsvpOverride.value = { ...rsvpOverride.value, [run.id]: 'declined' }
  const ok = await dismissInviteMember(run.my_member_id)
  rsvpBusyId.value = null
  const next = { ...rsvpOverride.value }
  delete next[run.id]
  rsvpOverride.value = next
  if (!ok) return
  emit('refresh')
}

async function acceptInvite(run: PlanRunDetail) {
  if (rsvpBusyId.value || !run.my_member_id) return
  rsvpBusyId.value = run.id
  rsvpOverride.value = { ...rsvpOverride.value, [run.id]: 'accepted' }
  const ok = await acceptInviteMember(run.my_member_id)
  rsvpBusyId.value = null
  const next = { ...rsvpOverride.value }
  delete next[run.id]
  rsvpOverride.value = next
  if (!ok) return
  emit('refresh')
}

// ── Email-link landing (#246 W5 item 3): scroll to + ring the run named by
// ?run= once the itinerary has rendered. Runs once per highlightRunId value
// (a fresh plan-page mount gets a fresh instance, so no need to guard
// re-firing beyond "itinerary must be non-empty first").
watch(
  () => [props.highlightRunId, props.itinerary.length] as const,
  async ([id, len]) => {
    if (!id || !len) return
    await nextTick()
    document.getElementById(`plan-run-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  },
  { immediate: true }
)
</script>
