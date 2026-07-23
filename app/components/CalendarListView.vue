<template>
  <div class="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
    <template v-if="loading">
      <div v-for="i in 4" :key="i" class="h-12 rounded bg-neutral-100 dark:bg-neutral-800 animate-pulse my-1" />
    </template>
    <div v-else-if="!rows.length" class="py-10 text-center text-sm text-neutral-400">
      Nothing in this range yet.
    </div>
    <template v-else>
      <div
        v-for="row in rows"
        :key="row.id"
        class="flex items-center gap-3 py-2.5"
      >
        <div class="w-12 shrink-0 text-center">
          <p class="text-[10px] uppercase text-neutral-400 leading-none">{{ dow(row.date) }}</p>
          <p class="text-sm font-semibold text-neutral-700 dark:text-neutral-200 leading-none mt-0.5">{{ fmtDate(row.date, { day: 'numeric' }) }}</p>
        </div>
        <span class="w-2 h-2 rounded-full shrink-0" :style="dotStyle(row.run)" />
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">{{ row.run.name ?? 'Untitled run' }}</p>
          <p class="text-xs text-neutral-400">{{ row.run.paddled ? 'Logged' : 'Planned' }}<template v-if="row.run.gauge_cfs != null"> · {{ Math.round(row.run.gauge_cfs) }} cfs</template></p>
        </div>
        <PlanTypeBadge v-if="row.plan" :type="row.plan.type" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CalendarDay, CalendarPlan, CalendarRun } from '~/composables/useCalendar'
import { dow, fmtDate } from '~/utils/calendarDate'
import { colorKeyToHex } from '~/utils/flowBand'
import { useFlowBandPalette } from '~/composables/useFlowBandPalette'

const props = defineProps<{
  days: CalendarDay[]
  plans: CalendarPlan[]
  loading?: boolean
}>()

const { bandSolid } = useFlowBandPalette()

interface Row {
  id: string
  date: string
  run: CalendarRun
  plan: CalendarPlan | null
}

const planById = computed(() => new Map(props.plans.map(p => [p.id, p])))

const rows = computed<Row[]>(() => {
  const out: Row[] = []
  for (const day of props.days) {
    for (const run of day.runs) {
      out.push({ id: run.id, date: day.date, run, plan: planById.value.get(run.plan_id) ?? null })
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
})

function dotStyle(run: CalendarRun): Record<string, string> {
  const color = run.flow_color ? colorKeyToHex(run.flow_color) : bandSolid(run.flow_band ?? null)
  return run.paddled ? { background: color } : { background: 'transparent', border: `2px solid ${color}` }
}
</script>
