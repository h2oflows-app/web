<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
        @pointerdown="backdropDown" @pointerup="backdropUp($event) && close()"
      >
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="translate-y-full sm:translate-y-4 sm:opacity-0"
          enter-to-class="translate-y-0 sm:opacity-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="translate-y-0 sm:opacity-100"
          leave-to-class="translate-y-full sm:translate-y-4 sm:opacity-0"
        >
          <div
            v-if="open"
            class="w-full sm:max-w-md max-h-[85vh] flex flex-col bg-white dark:bg-neutral-900 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden pb-[env(safe-area-inset-bottom)]"
          >
            <div class="flex justify-center pt-3 pb-1 sm:hidden">
              <div class="w-9 h-1 rounded-full bg-neutral-200 dark:bg-neutral-700" />
            </div>

            <div class="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between shrink-0">
              <div>
                <h2 class="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{{ title }}</h2>
                <p class="text-xs text-neutral-400 mt-0.5">{{ subline }}</p>
              </div>
              <button
                class="p-1 rounded text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                aria-label="Close"
                @click="close"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              <template v-if="loading">
                <div v-for="i in 2" :key="i" class="h-14 rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
              </template>

              <template v-else>
                <!-- Events spanning this day (web#354 A1: events are
                     owner-only now, so every row here is the viewer's own —
                     no more role check). -->
                <div v-if="events.length" class="flex flex-col gap-2">
                  <div
                    v-for="event in events"
                    :key="event.id"
                    class="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/50"
                  >
                    <span class="w-2 h-2 rounded-full shrink-0" :class="EVENT_COLOR.dotClass" />
                    <NuxtLink
                      v-if="eventLink(event)"
                      :to="eventLink(event)"
                      class="min-w-0 flex-1 text-sm font-medium text-neutral-700 dark:text-neutral-200 truncate hover:text-primary-600 dark:hover:text-primary-400 hover:underline"
                      @click="close()"
                    >{{ event.name }}</NuxtLink>
                    <span v-else class="min-w-0 flex-1 text-sm font-medium text-neutral-700 dark:text-neutral-200 truncate">{{ event.name }}</span>
                  </div>
                </div>

                <!-- Compact inline nudge row (#246 W6) — same confirm/dismiss
                     actions as NudgeCard, scoped to THIS opened day. Distinct
                     surface from the calendar-top nudge card (recon: "same
                     suggestion but scoped-to-day copy"); driven by the shared
                     nudge candidate (GET /me/nudge/candidate via useNudge),
                     matched to this day by run_date — NOT inferred from
                     "first unpaddled run" (needs_confirm is day-level only
                     and doesn't identify which run on a multi-run day). -->
                <div
                  v-if="nudgeRun"
                  class="flex items-center gap-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 px-3 py-2.5"
                >
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-amber-800 dark:text-amber-300">Did you paddle {{ nudgeRun.run_name ?? 'this' }}?</p>
                    <p class="text-xs text-amber-700/80 dark:text-amber-400/80">
                      It ran {{ flowBandLabel(nudgeRun.flow_band) }}<template v-if="nudgeRun.gauge_cfs != null"> · {{ Math.round(nudgeRun.gauge_cfs).toLocaleString() }} cfs</template> — you'd planned to be on it.
                    </p>
                  </div>
                  <button
                    type="button"
                    class="shrink-0 rounded-full bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-50"
                    :disabled="nudgeActing"
                    @click="onNudgeYes"
                  >Paddled it</button>
                  <button
                    type="button"
                    class="shrink-0 rounded-full bg-white/70 dark:bg-black/20 hover:bg-white text-amber-700 dark:text-amber-400 px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-50"
                    :disabled="nudgeActing"
                    @click="onNudgeNo"
                  >No</button>
                </div>

                <div class="flex flex-col gap-2">
                  <PlanRunItem
                    v-for="run in runs"
                    :key="run.id"
                    :run="run"
                    :date="date ?? ''"
                  />
                  <p v-if="!runs.length" class="text-sm text-neutral-400 text-center py-8">Nothing here yet.</p>
                </div>
              </template>
            </div>

            <div class="p-4 border-t border-neutral-100 dark:border-neutral-800 shrink-0">
              <button
                type="button"
                class="w-full py-2.5 rounded-xl border-2 border-dashed border-primary-300 dark:border-primary-700 text-primary-600 dark:text-primary-400 text-sm font-medium hover:bg-primary-50/50 dark:hover:bg-primary-950/30 transition-colors"
                @click="addRunHere"
              >+ New</button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { CalendarEvent, CalendarRun } from '~/composables/useCalendar'
import { fmtDate } from '~/utils/calendarDate'
import { flowBandLabel } from '~/utils/flowBand'
import { EVENT_COLOR } from '~/utils/planType'
import { usePlanRunLogSheet } from '~/composables/usePlanRunLogSheet'
import { useMyProfile } from '~/composables/useMyProfile'
import { useNudge, type NudgeMember } from '~/composables/useNudge'

const props = defineProps<{
  open: boolean
  date: string | null
  runs: CalendarRun[]
  // Events whose [start_date, end_date] spans this day (web#354 A1:
  // owner-only, so always the viewer's own) — the day sheet lists each,
  // label only (fixes "made an event, tapped its day, sheet looked empty"
  // — real user feedback). No per-event action (web#354 W3): runs are
  // decoupled from events, so "add a run" is just the single day-scoped
  // "+ New" button below, not something tied to a specific event.
  events: CalendarEvent[]
  loading?: boolean
  // true when this day earned a Tier-A '?' badge (CalendarDay.needs_confirm)
  // — drives the inline nudge row below.
  needsConfirm?: boolean
}>()

const emit = defineEmits<{
  'update:open': [boolean]
}>()

const planRunLogSheet = usePlanRunLogSheet()
const { member: nudgeMember, dismiss: dismissNudge } = useNudge()
const toast = useToast()
const nudgeActing = ref(false)

// The specific run this day's needs_confirm flag is about. needs_confirm is
// a day-level boolean only — it does NOT identify which run on a multi-run
// day earned it, so "first unpaddled run" is not a safe stand-in (could
// confirm/dismiss the wrong reach). Instead we key off the same
// GET /me/nudge/candidate result NudgeCard uses (shared useState — already
// loaded by NudgeCard's onMounted at the top of /calendar), matching it to
// this day by run_date. Only renders once that identity is confirmed.
const nudgeRun = computed<NudgeMember | null>(() => {
  if (!props.needsConfirm || !props.date) return null
  const m = nudgeMember.value
  return m && m.run_date === props.date ? m : null
})

function onNudgeYes() {
  if (!nudgeRun.value?.user_reach_id || !props.date) return
  planRunLogSheet.openConfirm({
    user_reach_id: nudgeRun.value.user_reach_id,
    run_name: nudgeRun.value.run_name ?? 'this run',
    run_date: props.date,
    flow_band: nudgeRun.value.flow_band ?? '',
    gauge_cfs: nudgeRun.value.gauge_cfs,
  })
}

async function onNudgeNo() {
  if (!nudgeRun.value?.user_reach_id || !props.date || nudgeActing.value) return
  nudgeActing.value = true
  const ok = await dismissNudge(nudgeRun.value.user_reach_id, props.date)
  nudgeActing.value = false
  if (ok) toast.add({ title: "No worries — won't ask again", color: 'info' })
}

// Event-name rows link to the event page; every event here is the viewer's
// own (web#354 A1: owner-only) — fall back to the viewer's own handle even
// before the api ships host_handle on an optimistic entry.
const { handle: myHandle, load: loadProfile } = useMyProfile()
onMounted(() => { loadProfile() })

function eventLink(event: CalendarEvent): string {
  const handle = event.host_handle || myHandle.value
  return handle ? `/plans/${handle}/${event.slug}` : ''
}

function close() {
  emit('update:open', false)
}

const title = computed(() => {
  if (!props.date) return ''
  return fmtDate(props.date, { weekday: 'long', month: 'short', day: 'numeric' })
})

const subline = computed(() => {
  if (props.loading) return 'Loading…'
  const n = props.runs.length
  return n === 0 ? 'Nothing planned yet' : `${n} run${n === 1 ? '' : 's'}`
})

// Day-scoped "+ New" footer button (web#354 W3) — neutral branch (same
// usePlanRunLogSheet.openCreate() the calendar page's own "+ New" button
// calls), just with this day's date prefilled. Not run-branch-locked: the
// sheet's own "No run — create an Event" toggle still applies.
function addRunHere() {
  close()
  planRunLogSheet.openCreate(props.date ?? undefined)
}
</script>
