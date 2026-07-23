<template>
  <div class="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800">
    <span class="w-2 h-2 rounded-full shrink-0" :style="dotStyle" />

    <div class="min-w-0 flex-1">
      <NuxtLink
        v-if="run.paddled"
        :to="`/plan-runs/${run.id}`"
        class="text-sm font-medium text-neutral-800 dark:text-neutral-100 hover:text-primary-600 dark:hover:text-primary-400 truncate block transition-colors"
      >{{ run.name ?? 'Untitled run' }}</NuxtLink>
      <p v-else class="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">{{ run.name ?? 'Untitled run' }}</p>
      <p v-if="run.run_time" class="text-xs text-neutral-400">{{ fmtTime(run.run_time) }}</p>
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
      v-if="canMarkPaddled"
      type="button"
      class="shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition-colors"
      :disabled="marking"
      @click="onMarkPaddled"
    >{{ marking ? '…' : 'Mark paddled' }}</button>

    <button
      v-else-if="!run.paddled"
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

const props = defineProps<{
  run: CalendarRun
  // The day this run is scheduled on (calendar payloads carry run_date only
  // at the day-bucket level, not per-run) — needed for the mark-paddled
  // future-date guard and to target the right day bucket for optimistic updates.
  date: string
}>()

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
  await markPaddled(props.run.id, props.date)
  marking.value = false
}

function onEdit() {
  planRunLogSheet.openEdit(props.run.id)
}
</script>
