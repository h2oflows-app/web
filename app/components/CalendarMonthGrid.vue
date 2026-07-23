<template>
  <div>
    <!-- Month nav -->
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{{ monthLabel(year, month) }}</h2>
      <div class="flex items-center gap-1">
        <button
          type="button"
          class="w-7 h-7 flex items-center justify-center rounded-md text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          aria-label="Previous month"
          @click="go(-1)"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <button
          type="button"
          class="px-2.5 h-7 flex items-center justify-center rounded-md text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          @click="goToday"
        >Today</button>
        <button
          type="button"
          class="w-7 h-7 flex items-center justify-center rounded-md text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          aria-label="Next month"
          @click="go(1)"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </div>
    </div>

    <!-- Weekday header -->
    <div class="grid grid-cols-7 gap-0.5 mb-1">
      <span
        v-for="wd in WEEKDAYS"
        :key="wd"
        class="text-[10px] font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wide text-center"
      >{{ wd }}</span>
    </div>

    <!-- Grid -->
    <div class="grid grid-cols-7 gap-0.5">
      <CalendarDayCell
        v-for="cell in cells"
        :key="cell.ymd"
        :ymd="cell.ymd"
        :day-num="cell.dayNum"
        :in-month="cell.inMonth"
        :is-today="cell.ymd === today"
        :runs="cell.runs"
        :ribbon="cell.ribbon"
        @select-day="$emit('select-day', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { monthMatrix, monthLabel, todayYMD } from '~/utils/calendarDate'
import type { CalendarDay, CalendarPlan } from '~/composables/useCalendar'
import type { RibbonVM } from '~/components/CalendarDayCell.vue'

const props = defineProps<{
  year: number
  month: number // 1-12
  days: CalendarDay[]
  plans: CalendarPlan[]
}>()

const emit = defineEmits<{
  'select-day': [string]
  'update:year': [number]
  'update:month': [number]
}>()

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const today = todayYMD()

function go(delta: number) {
  let m = props.month + delta
  let y = props.year
  if (m > 12) { m = 1; y += 1 }
  if (m < 1) { m = 12; y -= 1 }
  emit('update:year', y)
  emit('update:month', m)
}

function goToday() {
  const now = new Date()
  emit('update:year', now.getFullYear())
  emit('update:month', now.getMonth() + 1)
}

const runsByDate = computed(() => {
  const map = new Map<string, CalendarDay['runs']>()
  for (const d of props.days) map.set(d.date, d.runs)
  return map
})

// Primary plan per date, own/member preferred over invited when overlapping.
function ribbonForDate(ymd: string): RibbonVM | null {
  const covering = props.plans.filter(p => p.start_date <= ymd && p.end_date >= ymd)
  if (!covering.length) return null
  const plan = covering.find(p => p.role !== 'invited') ?? covering[0]
  const pos = plan.start_date === plan.end_date
    ? 'single'
    : ymd === plan.start_date
      ? 'start'
      : ymd === plan.end_date
        ? 'end'
        : 'mid'
  return { type: plan.type, pos, dashed: plan.role === 'invited' }
}

const cells = computed(() =>
  monthMatrix(props.year, props.month).map(c => ({
    ...c,
    runs: runsByDate.value.get(c.ymd) ?? [],
    ribbon: ribbonForDate(c.ymd),
  }))
)
</script>
