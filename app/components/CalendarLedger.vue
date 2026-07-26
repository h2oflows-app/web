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
import type { CalendarDay, CalendarRun } from '~/composables/useCalendar'
import { dow, fmtDate } from '~/utils/calendarDate'
import { colorKeyToHex } from '~/utils/flowBand'
import { useFlowBandPalette } from '~/composables/useFlowBandPalette'

const props = defineProps<{
  days: CalendarDay[]
  loading?: boolean
}>()

defineEmits<{ 'view-list': [] }>()

const { bandSolid } = useFlowBandPalette()

interface Row {
  id: string
  date: string
  run: CalendarRun
}

// web#354 A1: calendar_runs has no plan_id anymore (decoupled) — this row
// no longer carries an owning event at all (a run isn't structurally tied
// to one; see §1 "Runs during this Event" date-containment semantics).
const allRows = computed<Row[]>(() => {
  const out: Row[] = []
  for (const day of props.days) {
    for (const run of day.runs) {
      out.push({ id: run.id, date: day.date, run })
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
