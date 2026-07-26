<template>
  <!-- TODO(W4): GET /discover/plans reshaped entirely in web#354 A1 — it's a
       flat, run_date-sorted list of crew-seeking calendar_runs now (events
       are owner-only, no more public-plan browse to group by; discover.go
       ListPlans doc comment), not plans each carrying
       runs_looking_for_crew[]. This component (props, DiscoverPlan type)
       still expects the OLD shape and is effectively dead until W4's
       DiscoverRunCard regroup (§4/§5) replaces it — only the compile-forcing
       PlanTypeBadge usage is fixed here in W1. -->
  <div class="rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700">
    <div class="px-4 py-3 flex items-center justify-between gap-2" :class="EVENT_COLOR.tintClass">
      <div class="flex items-center gap-1.5 min-w-0">
        <NuxtLink :to="`/plans/${plan.host_handle}/${plan.slug}`" class="font-semibold text-sm text-neutral-900 dark:text-white hover:underline truncate">{{ plan.name }}</NuxtLink>
      </div>
      <span class="shrink-0 text-xs text-neutral-500 dark:text-neutral-400">{{ fmtRange(plan.start_date, plan.end_date) }}</span>
    </div>

    <div class="bg-white dark:bg-neutral-900 px-4 py-3 space-y-3">
      <p class="text-xs text-neutral-400">
        Hosted by <span class="font-medium text-neutral-600 dark:text-neutral-300">@{{ plan.host_handle }}</span>
        <template v-if="plan.location"> · {{ plan.location }}</template>
      </p>

      <div class="space-y-2">
        <div
          v-for="run in plan.runs_looking_for_crew"
          :key="run.plan_run_id"
          class="rounded-lg border border-neutral-100 dark:border-neutral-800 px-3 py-2.5 space-y-2"
        >
          <div class="flex items-center justify-between gap-2">
            <div class="min-w-0">
              <p class="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">{{ run.name ?? 'Untitled run' }}</p>
              <p class="text-xs text-neutral-400">
                {{ fmtDate(run.run_date) }}<template v-if="run.run_time"> · {{ fmtTime(run.run_time) }}</template>
                <template v-if="run.class_min != null || run.class_max != null"> · Class {{ classRange(run.class_min ?? null, run.class_max ?? null) }}</template>
              </p>
              <p v-if="run.meetup_spot" class="flex items-center gap-1 text-xs text-neutral-400 truncate">
                <svg class="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-6.5-7-11a7 7 0 1 1 14 0c0 4.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>
                <span class="truncate">Meet: {{ run.meetup_spot }}</span>
              </p>
            </div>
            <span
              v-if="run.flow_band || run.gauge_cfs != null"
              class="shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full"
              :class="colorKeyToBadgeClass(run.flow_color ?? '')"
            >{{ flowBandLabel(run.flow_band) }}<template v-if="run.gauge_cfs != null"> · {{ Math.round(run.gauge_cfs).toLocaleString() }}</template></span>
          </div>

          <PlanCrewMeter :filled="run.crew.filled" :max="run.crew.max" title="Crew">
            <template #action>
              <button
                type="button"
                class="shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                :class="rsvpFor(run) === 'requested' || rsvpFor(run) === 'accepted'
                  ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
                  : 'bg-primary-600 hover:bg-primary-700 text-white'"
                :disabled="busyId === run.plan_run_id || rsvpFor(run) === 'requested' || rsvpFor(run) === 'accepted' || isFull(run)"
                @click="onJoin(run)"
              >{{ joinLabel(run) }}</button>
            </template>
          </PlanCrewMeter>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { DiscoverPlan, DiscoverRun } from '~/utils/discover'
import { EVENT_COLOR } from '~/utils/planType'
import { fmtDate, fmtRange, fmtTime } from '~/utils/calendarDate'
import { classRange } from '~/utils/classRating'
import { flowBandLabel, colorKeyToBadgeClass } from '~/utils/flowBand'
import { usePlans } from '~/composables/usePlans'

const props = defineProps<{ plan: DiscoverPlan }>()

const { joinPlanRun } = usePlans()

// Local optimistic overlay, keyed by plan_run_id — cleared as soon as the
// join call settles (success or failure) rather than lingering until a
// full reload, so a later debounced re-search's fresh my_rsvp always wins.
const override = ref<Record<string, string>>({})
const busyId = ref<string | null>(null)

function rsvpFor(run: DiscoverRun): string | null | undefined {
  return override.value[run.plan_run_id] ?? run.my_rsvp
}

function isFull(run: DiscoverRun): boolean {
  return run.crew.max != null && run.crew.filled >= run.crew.max
}

function joinLabel(run: DiscoverRun): string {
  if (busyId.value === run.plan_run_id) return '…'
  const r = rsvpFor(run)
  if (r === 'requested') return 'Requested'
  if (r === 'accepted') return "You're in"
  if (isFull(run)) return 'Crew full'
  return 'Join Run'
}

async function onJoin(run: DiscoverRun) {
  if (busyId.value || rsvpFor(run) === 'requested' || rsvpFor(run) === 'accepted' || isFull(run)) return
  busyId.value = run.plan_run_id
  override.value = { ...override.value, [run.plan_run_id]: 'requested' }
  const ok = await joinPlanRun(run.plan_run_id)
  busyId.value = null
  // Cleared regardless of outcome (not just on failure) — otherwise a
  // stale 'requested' override permanently masks server truth (e.g. the
  // host later declines, or crew fills) across this card's debounced
  // re-searches, since it's never re-derived from a fresh my_rsvp.
  const next = { ...override.value }
  delete next[run.plan_run_id]
  override.value = next
}
</script>
