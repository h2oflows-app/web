<template>
  <div>
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Events</h3>
    </div>

    <div v-if="loading" class="flex flex-col gap-2">
      <div v-for="i in 3" :key="i" class="h-14 rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
    </div>

    <div v-else-if="!rows.length" class="text-sm text-neutral-400 py-3">No events this month</div>

    <div v-else class="flex flex-col gap-2">
      <template v-for="row in rows" :key="row.id">
        <!-- Run row: date badge + PlanRunItem (day-sheet parity — same
             component CalendarDaySheet uses per-run, so a planned run gets
             the same Edit / Mark-paddled affordances there). -->
        <div v-if="row.kind === 'run'" class="flex items-center gap-3">
          <div class="w-10 shrink-0 text-center">
            <p class="text-[9px] uppercase text-neutral-400 leading-none">{{ dow(row.date) }}</p>
            <p class="text-xs font-semibold text-neutral-700 dark:text-neutral-200 leading-none mt-0.5">{{ fmtDate(row.date, { day: 'numeric' }) }}</p>
          </div>
          <PlanRunItem :run="row.run" :date="row.date" class="flex-1 min-w-0" />
        </div>

        <!-- Event row: dot + name + date range + run count, links to the
             event page. -->
        <NuxtLink
          v-else
          :to="eventLink(row.event)"
          class="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors"
        >
          <span class="w-2 h-2 rounded-full shrink-0" :class="EVENT_COLOR.dotClass" />
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">{{ row.event.name }}</p>
            <p class="text-xs text-neutral-400">{{ fmtRange(row.event.start_date, row.event.end_date) }}<template v-if="runCount(row.event)"> · {{ runCount(row.event) }} run{{ runCount(row.event) === 1 ? '' : 's' }}</template></p>
          </div>
          <svg class="w-4 h-4 text-neutral-300 dark:text-neutral-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
        </NuxtLink>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
// Combined "Events" section — web#354 W5 §CHANGE 1. Supersedes the separate
// CalendarRunsThisMonth.vue (deleted; was "Runs this month", positioned
// above the calendar) and CalendarEventsList.vue (deleted; was "Events this
// month", positioned below the calendar with its own "+ New event" button).
// One list, below the calendar (whichever view — month/year/list — is
// active), interleaving both item kinds date-sorted; the single top-of-page
// "+ New" is the only creation entry point on the page now, so there's no
// per-section create button here.
import { computed, onMounted } from 'vue'
import type { CalendarDay, CalendarEvent, CalendarRun } from '~/composables/useCalendar'
import { useMyProfile } from '~/composables/useMyProfile'
import { dow, fmtDate, fmtRange } from '~/utils/calendarDate'
import { EVENT_COLOR } from '~/utils/planType'

const props = defineProps<{
  days: CalendarDay[]
  events: CalendarEvent[]
  loading?: boolean
}>()

interface RunRow {
  kind: 'run'
  id: string
  date: string // sort key — the day this run falls on
  run: CalendarRun
}

interface EventRow {
  kind: 'event'
  id: string
  date: string // sort key — the event's start_date
  event: CalendarEvent
}

type Row = RunRow | EventRow

// Ascending (chronological) — a full-month agenda meant to be read
// top-to-bottom in calendar order. Runs are keyed by the day-bucket date
// they're filed under; events by start_date. Ties (same date) keep runs
// before events — array order is stable-sorted, and runs are pushed first.
const rows = computed<Row[]>(() => {
  const out: Row[] = []
  for (const day of props.days) {
    for (const run of day.runs) {
      out.push({ kind: 'run', id: `run-${run.id}`, date: day.date, run })
    }
  }
  for (const event of props.events) {
    out.push({ kind: 'event', id: `event-${event.id}`, date: event.start_date, event })
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
})

// host_handle ships with api#163; until that API is live, own events can
// still link via the viewer's own handle (web#354 A1: every event here is
// the viewer's own — owner-only).
const { handle: myHandle, load: loadProfile } = useMyProfile()
onMounted(() => { loadProfile() })

function eventLink(event: CalendarEvent): string {
  const handle = event.host_handle || myHandle.value
  return handle ? `/plans/${handle}/${event.slug}` : '/calendar'
}

// web#354 A1: calendar_runs has no plan_id anymore (decoupled) — recompute
// as date containment (§1 semantics: a run "belongs" to an event purely by
// falling within its [start_date, end_date]), matching the api's own
// ListMine run_count subquery.
function runCount(event: CalendarEvent): number {
  let n = 0
  for (const d of props.days) {
    if (d.date >= event.start_date && d.date <= event.end_date) n += d.runs.length
  }
  return n
}
</script>
