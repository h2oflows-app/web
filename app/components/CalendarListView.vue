<template>
  <div class="flex flex-col gap-2">
    <template v-if="loading">
      <div v-for="i in 4" :key="i" class="h-16 rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
    </template>
    <div v-else-if="!rows.length" class="py-10 text-center text-sm text-neutral-400">
      Nothing in this range yet.
    </div>
    <template v-else>
      <!-- TODO(W3): "build out — grouped by date, Events + Runs interleaved"
           per web#354 §4. web#354 A1 decoupled runs from events entirely (no
           plan_id), so there's no per-run event to look up anymore here —
           this stub now renders runs only until W3's interleaved rebuild. -->
      <PlanRunFeedCard
        v-for="row in rows"
        :key="row.id"
        :run="row.run"
        :date="row.date"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CalendarDay, CalendarEvent, CalendarRun } from '~/composables/useCalendar'

const props = defineProps<{
  days: CalendarDay[]
  events: CalendarEvent[]
  loading?: boolean
}>()

interface Row {
  id: string
  date: string
  run: CalendarRun
}

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
