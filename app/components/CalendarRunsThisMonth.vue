<template>
  <div>
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
        Runs this month<template v-if="!loading && rows.length"> · {{ rows.length }} run{{ rows.length === 1 ? '' : 's' }}</template>
      </h3>
    </div>

    <div v-if="loading" class="flex flex-col gap-2">
      <div v-for="i in 3" :key="i" class="h-14 rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
    </div>

    <div v-else-if="!rows.length" class="text-sm text-neutral-400 py-3">No runs this month yet.</div>

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
// "Runs this month" — web#354 W3 §4 item 3. Supersedes CalendarLedger.vue
// (deleted): same "this month" scope read from useCalendar's days[], but a
// full flat list rather than a capped teaser, and each row renders through
// PlanRunItem — the same component CalendarDaySheet uses per-run — so a
// paddled run links to /plan-runs/{id} and a planned run gets the same
// Edit / Mark-paddled affordances the day sheet offers (day-sheet parity
// per the plan's "match whatever the day-sheet rows do today").
import { computed } from 'vue'
import type { CalendarDay, CalendarRun } from '~/composables/useCalendar'
import { dow, fmtDate } from '~/utils/calendarDate'

const props = defineProps<{
  days: CalendarDay[]
  loading?: boolean
}>()

interface Row {
  id: string
  date: string
  run: CalendarRun
}

// Ascending (chronological) — this is a full-month agenda meant to be read
// top-to-bottom in calendar order, unlike CalendarLedger's old newest-first
// "recent activity" teaser.
const rows = computed<Row[]>(() => {
  const out: Row[] = []
  for (const day of props.days) {
    for (const run of day.runs) {
      out.push({ id: run.id, date: day.date, run })
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
})
</script>
