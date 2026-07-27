<template>
  <div class="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-3.5 space-y-2.5">
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0">
        <NuxtLink :to="`/plan-runs/${run.plan_run_id}`" class="font-semibold text-sm text-neutral-900 dark:text-white hover:underline truncate block">{{ run.name }}</NuxtLink>
        <p class="text-xs text-neutral-400">Hosted by <span class="font-medium text-neutral-600 dark:text-neutral-300">@{{ run.host_handle }}</span></p>
      </div>
      <span class="shrink-0 text-xs text-neutral-500 dark:text-neutral-400 text-right">
        {{ fmtDate(run.run_date) }}<template v-if="run.run_time"><br>{{ fmtTime(run.run_time) }}</template>
      </span>
    </div>

    <p v-if="run.class_min != null || run.class_max != null || run.meetup_spot" class="text-xs text-neutral-400 truncate">
      <template v-if="run.class_min != null || run.class_max != null">Class {{ classRange(run.class_min ?? null, run.class_max ?? null) }}</template>
      <template v-if="(run.class_min != null || run.class_max != null) && run.meetup_spot"> · </template>
      <template v-if="run.meetup_spot">Meet: {{ run.meetup_spot }}</template>
    </p>

    <span
      v-if="run.flow_band || run.gauge_cfs != null"
      class="inline-flex shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full"
      :class="colorKeyToBadgeClass(run.flow_color ?? '')"
    >{{ flowBandLabel(run.flow_band) }}<template v-if="run.gauge_cfs != null"> · {{ Math.round(run.gauge_cfs).toLocaleString() }}</template></span>

    <PlanCrewMeter :filled="run.crew.filled" :max="run.crew.max" title="Crew">
      <template #action>
        <button
          v-if="!isOwnRun"
          type="button"
          class="shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          :class="rsvp === 'requested' || rsvp === 'accepted'
            ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
            : 'bg-primary-600 hover:bg-primary-700 text-white'"
          :disabled="busy || rsvp === 'requested' || rsvp === 'accepted' || isFull"
          @click="onJoin"
        >{{ joinLabel }}</button>
      </template>
    </PlanCrewMeter>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { DiscoverRun } from '~/utils/discover'
import { fmtDate, fmtTime } from '~/utils/calendarDate'
import { classRange } from '~/utils/classRating'
import { flowBandLabel, colorKeyToBadgeClass } from '~/utils/flowBand'
import { usePlans } from '~/composables/usePlans'
import { useMyProfile } from '~/composables/useMyProfile'

// DiscoverRunCard — regrouped from DiscoverPlanCard (web#354 W4; discover.go
// ListPlans doc comment): one card = one crew-seeking calendar_run now, not
// a plan carrying `runs_looking_for_crew[]`. See utils/discover.ts's
// DiscoverRun doc note: the api's discoverCrewRun has no per-viewer my_rsvp
// field at all (unlike the pre-A1 shape), so there is no server truth to
// re-derive Join state from on this card's debounced re-searches — the
// optimistic 'requested' override below is kept PERMANENTLY on success
// (only a failure reverts it), rather than being cleared after the request
// settles the way the old DiscoverPlanCard did.
const props = defineProps<{ run: DiscoverRun }>()

const { joinPlanRun } = usePlans()

// Discover applies no owner filter (a host's own looking_for_crew runs
// legitimately show in their own feed — discover/index.vue's own copy
// directs users to expect this), so hide the Join action on your own run:
// tapping it only ever 409s ("host cannot request to join their own run").
const { isMine, loaded: profileLoaded, load: loadMyProfile } = useMyProfile()
onMounted(() => { void loadMyProfile() })
const isOwnRun = computed(() => profileLoaded.value && isMine(props.run.host_handle))

const override = ref<string | null>(null)
const busy = ref(false)

const rsvp = computed(() => override.value)
const isFull = computed(() => props.run.crew.max != null && props.run.crew.filled >= props.run.crew.max)

const joinLabel = computed(() => {
  if (busy.value) return '…'
  if (rsvp.value === 'requested') return 'Requested'
  if (rsvp.value === 'accepted') return "You're in"
  if (isFull.value) return 'Crew full'
  return 'Join Run'
})

async function onJoin() {
  if (busy.value || rsvp.value === 'requested' || rsvp.value === 'accepted' || isFull.value) return
  busy.value = true
  const ok = await joinPlanRun(props.run.plan_run_id)
  busy.value = false
  if (ok) {
    override.value = 'requested'
  }
}
</script>
