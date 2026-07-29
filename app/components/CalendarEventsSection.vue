<template>
  <div>
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Events</h3>
    </div>

    <div v-if="loading" class="flex flex-col gap-2">
      <div v-for="i in 3" :key="i" class="h-14 rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
    </div>

    <div v-else-if="!sortedEvents.length" class="text-sm text-neutral-400 py-3">No events this month</div>

    <div v-else class="flex flex-col gap-2">
      <!-- Event row: dot + name + date range + run count, links to the
           event page. -->
      <NuxtLink
        v-for="event in sortedEvents"
        :key="event.id"
        :to="eventLink(event)"
        class="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors"
      >
        <span class="w-2 h-2 rounded-full shrink-0" :class="EVENT_COLOR.dotClass" />
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">{{ event.name }}</p>
          <p class="text-xs text-neutral-400">{{ fmtRange(event.start_date, event.end_date) }}<template v-if="runCount(event)"> · {{ runCount(event) }} run{{ runCount(event) === 1 ? '' : 's' }}</template></p>
        </div>
        <svg class="w-4 h-4 text-neutral-300 dark:text-neutral-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
// "Events" section — web#354 W-fix1: split back out of the combined
// "Events" section (W5 had merged CalendarRunsThisMonth + CalendarEventsList
// into one interleaved list; user feedback: mixing runs and events made runs
// look tied to events they have no structural relation to — they're
// decoupled, related only by date). This component owns the Events half
// only; CalendarRunsSection.vue owns the Runs half, rendered above this one
// on the calendar page.
import { computed, onMounted } from 'vue'
import type { CalendarDay, CalendarEvent } from '~/composables/useCalendar'
import { useMyProfile } from '~/composables/useMyProfile'
import { fmtRange } from '~/utils/calendarDate'
import { EVENT_COLOR } from '~/utils/planType'

const props = defineProps<{
  days: CalendarDay[]
  events: CalendarEvent[]
  loading?: boolean
}>()

// Ascending (chronological) by start_date.
const sortedEvents = computed(() => [...props.events].sort((a, b) => a.start_date.localeCompare(b.start_date)))

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
