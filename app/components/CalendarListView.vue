<template>
  <div class="flex flex-col gap-2">
    <template v-if="loading">
      <div v-for="i in 4" :key="i" class="h-16 rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
    </template>
    <div v-else-if="!rows.length" class="py-10 text-center text-sm text-neutral-400">
      Nothing in this range yet.
    </div>
    <template v-else>
      <PlanRunFeedCard
        v-for="row in rows"
        :key="row.id"
        :run="row.run"
        :date="row.date"
        :plan="row.plan"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CalendarDay, CalendarPlan, CalendarRun } from '~/composables/useCalendar'

const props = defineProps<{
  days: CalendarDay[]
  plans: CalendarPlan[]
  loading?: boolean
}>()

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
</script>
