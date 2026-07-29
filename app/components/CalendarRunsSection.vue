<template>
  <div>
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Runs</h3>
    </div>

    <div v-if="loading" class="flex flex-col gap-2">
      <div v-for="i in 3" :key="i" class="h-14 rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
    </div>

    <div v-else-if="!rows.length" class="text-sm text-neutral-400 py-3">No runs this month</div>

    <!-- Date badge + PlanRunItem — same rendering CalendarDaySheet uses
         per-run, so a planned run gets the same Edit / Mark-paddled
         affordances here. -->
    <div v-else class="flex flex-col gap-2">
      <div v-for="row in rows" :key="row.id" class="flex items-center gap-3">
        <div class="w-10 shrink-0 text-center">
          <p class="text-[9px] uppercase text-neutral-400 leading-none">{{ dow(row.date) }}</p>
          <p class="text-xs font-semibold text-neutral-700 dark:text-neutral-200 leading-none mt-0.5">{{ fmtDate(row.date, { day: 'numeric' }) }}</p>
        </div>
        <PlanRunItem :run="row.run" :date="row.date" class="flex-1 min-w-0" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// "Runs" section — web#354 W-fix1: split back out of the combined "Events"
// section (W5 merged CalendarRunsThisMonth + CalendarEventsList into one
// list; user feedback: interleaving runs and events made runs look tied to
// events they have no structural relation to — they're decoupled, related
// only by date, per §1 of the rework plan). This component owns the Runs
// half only; CalendarEventsSection.vue owns the Events half. Rendered above
// Events on the calendar page (calendar (views) -> Runs -> Events -> stats).
import { computed } from 'vue'
import type { CalendarDay, CalendarRun } from '~/composables/useCalendar'
import { dow, fmtDate } from '~/utils/calendarDate'

const props = defineProps<{
  days: CalendarDay[]
  loading?: boolean
}>()

interface RunRow {
  id: string
  date: string // sort key — the day-bucket date this run falls under
  run: CalendarRun
}

// Ascending (chronological) — days already arrive date-ordered from
// useCalendar, but sort explicitly so this component doesn't depend on that.
const rows = computed<RunRow[]>(() => {
  const out: RunRow[] = []
  for (const day of props.days) {
    for (const run of day.runs) {
      out.push({ id: `run-${run.id}`, date: day.date, run })
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
})
</script>
