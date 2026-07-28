<template>
  <div class="flex flex-col gap-4">
    <template v-if="loading">
      <div v-for="i in 4" :key="i" class="h-16 rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
    </template>
    <div v-else-if="!groups.length" class="py-10 text-center text-sm text-neutral-400">
      Nothing in this range yet.
    </div>
    <template v-else>
      <div v-for="group in groups" :key="group.date" class="flex flex-col gap-2">
        <h3 class="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
          {{ dow(group.date) }}, {{ fmtDate(group.date) }}
        </h3>

        <!-- Events spanning this date (web#354 A1: owner-only, so always the
             viewer's own) — label-only chip, same style/link behavior as
             CalendarDaySheet's event rows. -->
        <div v-if="group.events.length" class="flex flex-col gap-2">
          <div
            v-for="event in group.events"
            :key="event.id"
            class="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/50"
          >
            <span class="w-2 h-2 rounded-full shrink-0" :class="EVENT_COLOR.dotClass" />
            <NuxtLink
              v-if="eventLink(event)"
              :to="eventLink(event)"
              class="min-w-0 flex-1 text-sm font-medium text-neutral-700 dark:text-neutral-200 truncate hover:text-primary-600 dark:hover:text-primary-400 hover:underline"
            >{{ event.name }}</NuxtLink>
            <span v-else class="min-w-0 flex-1 text-sm font-medium text-neutral-700 dark:text-neutral-200 truncate">{{ event.name }}</span>
          </div>
        </div>

        <!-- Runs on this date — same PlanRunItem row (and actions) as
             CalendarDaySheet / CalendarEventsSection. -->
        <div v-if="group.runs.length" class="flex flex-col gap-2">
          <PlanRunItem
            v-for="run in group.runs"
            :key="run.id"
            :run="run"
            :date="group.date"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
// List view build-out — web#354 W3 §4 item 2 / component-list bullet 2.
// web#354 A1 decoupled runs from events entirely (no plan_id), so rows are
// grouped by date only: each date's Events (label-only) then that date's
// Runs, chronologically by date across the visible range. Empty dates are
// skipped entirely (never rendered).
import { computed, onMounted } from 'vue'
import type { CalendarDay, CalendarEvent, CalendarRun } from '~/composables/useCalendar'
import { useMyProfile } from '~/composables/useMyProfile'
import { dow, fmtDate, parseYMD, ymd } from '~/utils/calendarDate'
import { EVENT_COLOR } from '~/utils/planType'

const props = defineProps<{
  days: CalendarDay[]
  events: CalendarEvent[]
  loading?: boolean
  // Bounds of the currently loaded range (whatever the month grid's 6-week
  // span or the year view fetched — see useCalendar's lastRange). Needed
  // because `days` is sparse (only dates with at least one run get a
  // bucket — see useCalendar's insertRunOptimistic), so an Event with no
  // run on a given day wouldn't otherwise surface a date to group under.
  // Falls back to the min/max of the data itself when not given.
  rangeFrom?: string | null
  rangeTo?: string | null
}>()

interface Group {
  date: string
  events: CalendarEvent[]
  runs: CalendarRun[]
}

// host_handle ships with api#163; until that API is live, own events can
// still link via the viewer's own handle (web#354 A1: every event here is
// the viewer's own — owner-only). Mirrors CalendarDaySheet/CalendarEventsSection.
const { handle: myHandle, load: loadProfile } = useMyProfile()
onMounted(() => { loadProfile() })

function eventLink(event: CalendarEvent): string {
  const handle = event.host_handle || myHandle.value
  return handle ? `/plans/${handle}/${event.slug}` : ''
}

const runsByDate = computed(() => {
  const map = new Map<string, CalendarRun[]>()
  for (const d of props.days) if (d.runs.length) map.set(d.date, d.runs)
  return map
})

function fallbackFrom(): string | null {
  const all = [...runsByDate.value.keys(), ...props.events.map(e => e.start_date)]
  return all.length ? all.sort()[0]! : null
}

function fallbackTo(): string | null {
  const all = [...runsByDate.value.keys(), ...props.events.map(e => e.end_date)]
  return all.length ? all.sort()[all.length - 1]! : null
}

const groups = computed<Group[]>(() => {
  const from = props.rangeFrom ?? fallbackFrom()
  const to = props.rangeTo ?? fallbackTo()
  if (!from || !to) return []

  const dates = new Set<string>(runsByDate.value.keys())
  for (const event of props.events) {
    const start = event.start_date > from ? event.start_date : from
    const end = event.end_date < to ? event.end_date : to
    if (start > end) continue
    const endDate = parseYMD(end)
    let cursor = parseYMD(start)
    while (cursor <= endDate) {
      dates.add(ymd(cursor))
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)
    }
  }

  return [...dates]
    .filter(d => d >= from && d <= to)
    .sort()
    .map(date => ({
      date,
      events: props.events.filter(e => e.start_date <= date && e.end_date >= date),
      runs: runsByDate.value.get(date) ?? [],
    }))
})
</script>
