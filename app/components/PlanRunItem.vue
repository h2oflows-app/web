<template>
  <div class="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800">
    <span class="w-2 h-2 rounded-full shrink-0" :style="dotStyle" />

    <div class="min-w-0 flex-1">
      <NuxtLink
        v-if="run.paddled"
        :to="`/plan-runs/${run.id}`"
        class="text-sm font-medium text-neutral-800 dark:text-neutral-100 hover:text-primary-600 dark:hover:text-primary-400 truncate block transition-colors"
      >{{ run.name }}</NuxtLink>
      <p v-else class="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">{{ run.name }}</p>
      <!-- Attached library run's own name (web#354 A4/W6) — secondary only,
           and only when it actually adds context (avoid "Foxton — Foxton"
           dupes when the calendar run kept the reach's default name). -->
      <p v-if="run.reach_name && run.reach_name !== run.name" class="text-xs text-neutral-400 truncate">{{ run.reach_name }}</p>
      <p v-if="run.run_time" class="text-xs text-neutral-400">{{ fmtTime(run.run_time) }}</p>
      <p v-if="run.meetup_spot" class="flex items-center gap-1 text-xs text-neutral-400 truncate">
        <svg class="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-6.5-7-11a7 7 0 1 1 14 0c0 4.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>
        <span class="truncate">Meet: {{ run.meetup_spot }}</span>
      </p>
    </div>

    <span
      v-if="run.flow_band || run.gauge_cfs != null"
      class="text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0"
      :class="colorKeyToBadgeClass(run.flow_color ?? '')"
    >
      {{ flowBandLabel(run.flow_band) }}<template v-if="run.gauge_cfs != null"> · {{ Math.round(run.gauge_cfs).toLocaleString() }}</template>
    </span>

    <span
      class="text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0"
      :class="run.paddled
        ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
        : 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400'"
    >{{ run.paddled ? 'Logged' : 'Planned' }}</span>

    <button
      v-if="canEdit && canMarkPaddled"
      type="button"
      class="shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition-colors"
      :disabled="marking"
      @click="onMarkPaddled"
    >{{ marking ? '…' : 'Mark paddled' }}</button>

    <button
      v-else-if="canEdit && !run.paddled"
      type="button"
      class="shrink-0 text-[11px] font-medium text-primary-600 dark:text-primary-400 hover:underline"
      @click="onEdit"
    >Edit</button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CalendarRun } from '~/composables/useCalendar'
import { usePlans } from '~/composables/usePlans'
import { usePlanRunLogSheet } from '~/composables/usePlanRunLogSheet'
import { fmtTime, isPastOrToday } from '~/utils/calendarDate'
import { colorKeyToHex, colorKeyToBadgeClass, flowBandLabel } from '~/utils/flowBand'
import { useFlowBandPalette } from '~/composables/useFlowBandPalette'

const props = withDefaults(defineProps<{
  run: CalendarRun
  // The day this run is scheduled on (calendar payloads carry run_date only
  // at the day-bucket level, not per-run) — needed for the mark-paddled
  // future-date guard and to target the right day bucket for optimistic updates.
  date: string
  // Gates Mark-paddled/Edit. Defaults true (every existing consumer —
  // CalendarDaySheet — only ever renders the viewer's OWN runs). Plan
  // detail's itinerary renders the HOST's runs to every viewer (members,
  // even anon token-carve invitees), and PATCH /plan-runs/{id} is
  // owner_id-scoped server-side anyway — canEdit:false there hides an
  // affordance that would otherwise just 404 for anyone but the host.
  canEdit?: boolean
}>(), {
  canEdit: true,
})

// Fired after a successful mark-paddled PATCH — usePlans.markPaddled already
// refreshes the (module-ref) useCalendar cache, but a parent rendering runs
// from a DIFFERENT fetch (e.g. plans/[handle]/[slug].vue's itinerary, which
// isn't backed by useCalendar) needs its own signal to refetch. Optional:
// CalendarDaySheet ignores it since useCalendar already covers that surface.
const emit = defineEmits<{ updated: [] }>()

const { bandSolid } = useFlowBandPalette()
const { markPaddled } = usePlans()
const planRunLogSheet = usePlanRunLogSheet()

const marking = ref(false)

const canMarkPaddled = computed(() => !props.run.paddled && isPastOrToday(props.date))

const dotStyle = computed(() => {
  const color = props.run.flow_color ? colorKeyToHex(props.run.flow_color) : bandSolid(props.run.flow_band ?? null)
  return props.run.paddled
    ? { background: color }
    : { background: 'transparent', border: `2px solid ${color}` }
})

async function onMarkPaddled() {
  if (marking.value) return
  marking.value = true
  const ok = await markPaddled(props.run.id, props.date)
  marking.value = false
  if (ok) emit('updated')
}

function onEdit() {
  planRunLogSheet.openEdit(props.run.id)
}
</script>
