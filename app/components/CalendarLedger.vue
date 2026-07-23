<template>
  <div class="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3">
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-xs font-semibold text-neutral-500 dark:text-neutral-400">This month<template v-if="!loading"> · {{ allRows.length }} run{{ allRows.length === 1 ? '' : 's' }}</template></h3>
    </div>

    <div v-if="loading" class="flex flex-col gap-1.5 py-1">
      <div v-for="i in 3" :key="i" class="h-8 rounded bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
    </div>

    <div v-else-if="!allRows.length" class="text-sm text-neutral-400 py-2">Nothing logged yet.</div>

    <div v-else class="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
      <div v-for="row in recentRows" :key="row.id" class="flex items-center gap-3 py-2">
        <div class="w-10 shrink-0 text-center">
          <p class="text-[9px] uppercase text-neutral-400 leading-none">{{ dow(row.date) }}</p>
          <p class="text-xs font-semibold text-neutral-700 dark:text-neutral-200 leading-none mt-0.5">{{ fmtDate(row.date, { day: 'numeric' }) }}</p>
        </div>
        <span class="w-2 h-2 rounded-full shrink-0" :style="dotStyle(row.run)" />
        <div class="min-w-0 flex-1">
          <p class="text-xs font-medium text-neutral-800 dark:text-neutral-100 truncate">
            {{ row.run.name ?? 'Untitled run' }}<span v-if="!row.run.paddled" class="text-neutral-400 font-normal"> · planned</span>
          </p>
        </div>
        <svg v-if="row.plan?.visibility === 'private'" class="w-3 h-3 text-neutral-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <svg v-else class="w-3 h-3 text-neutral-300 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z"/>
        </svg>
      </div>
    </div>

    <button
      v-if="allRows.length > recentRows.length"
      type="button"
      class="w-full text-center text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800"
      @click="$emit('view-list')"
    >+{{ allRows.length - recentRows.length }} more this month</button>
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

defineEmits<{ 'view-list': [] }>()

const { bandSolid } = useFlowBandPalette()

interface Row {
  id: string
  date: string
  run: CalendarRun
  plan: CalendarPlan | null
}

const planById = computed(() => new Map(props.plans.map(p => [p.id, p])))

const allRows = computed<Row[]>(() => {
  const out: Row[] = []
  for (const day of props.days) {
    for (const run of day.runs) {
      out.push({ id: run.id, date: day.date, run, plan: planById.value.get(run.plan_id) ?? null })
    }
  }
  return out.sort((a, b) => b.date.localeCompare(a.date))
})

const recentRows = computed(() => allRows.value.slice(0, 4))

function dotStyle(run: CalendarRun): Record<string, string> {
  const color = run.flow_color ? colorKeyToHex(run.flow_color) : bandSolid(run.flow_band ?? null)
  return run.paddled ? { background: color } : { background: 'transparent', border: `2px solid ${color}` }
}
</script>
