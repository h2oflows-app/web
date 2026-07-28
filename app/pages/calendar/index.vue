<template>
  <div class="min-h-screen bg-neutral-50 dark:bg-neutral-950">
    <AppHeader>
      <span class="text-neutral-300 dark:text-neutral-700 shrink-0">/</span>
      <span class="text-sm font-medium text-neutral-700 dark:text-neutral-200">My Calendar</span>
    </AppHeader>

    <!-- Auth loading -->
    <div v-if="!authReady" class="max-w-3xl mx-auto px-4 py-20 flex justify-center">
      <div class="w-6 h-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
    </div>

    <!-- Not signed in -->
    <div v-else-if="!isAuthenticated" class="max-w-3xl mx-auto px-4 py-20 flex flex-col items-center gap-3 text-center">
      <svg class="w-10 h-10 text-neutral-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
      <h2 class="text-lg font-semibold">Sign in to view your calendar</h2>
      <NuxtLink to="/login" class="text-sm text-primary-600 dark:text-primary-400 hover:underline">Sign in</NuxtLink>
    </div>

    <!-- Authenticated -->
    <main v-else class="max-w-3xl mx-auto px-4 py-6 pb-24 sm:pb-6 space-y-5">
      <InviteBanner />
      <NudgeCard />

      <!-- flex-wrap + ml-auto: on narrow phones the controls drop to their own
           line (right-aligned) instead of wrapping the title / clipping the toggle -->
      <div class="flex flex-wrap items-center gap-3">
        <h1 class="text-xl font-bold text-neutral-900 dark:text-white">My Calendar</h1>
        <div class="flex items-center gap-2 ml-auto">
          <button
            type="button"
            class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold transition-colors shrink-0"
            @click="planRunLogSheet.openCreate()"
          >+ New</button>
          <CalendarViewToggle v-model="view" />
        </div>
      </div>

      <CalendarMonthGrid
        v-if="view === 'month'"
        :year="year"
        :month="month"
        :days="days"
        :events="events"
        :nudge-dots="nudgeDots"
        @select-day="openDay"
        @update:year="year = $event"
        @update:month="onMonthChange"
      />

      <CalendarYearView
        v-else-if="view === 'year'"
        :year="year"
        :days="yearDays"
        @select-month="onSelectMonthFromYear"
      />

      <CalendarListView
        v-else
        :days="days"
        :events="events"
        :loading="loading"
        :range-from="lastRange?.from ?? null"
        :range-to="lastRange?.to ?? null"
      />

      <CalendarEventsSection :days="monthOnlyDays" :events="monthOnlyEvents" :loading="loading" />

      <CalendarQuickStatsBanner />
    </main>

    <CalendarDaySheet
      v-model:open="daySheetOpen"
      :date="selectedDay"
      :runs="selectedDayRuns"
      :events="selectedDayEvents"
      :loading="loading"
      :needs-confirm="selectedDayNeedsConfirm"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ ssr: false })

import { ref, computed, watch, onMounted } from 'vue'
import { useCalendar, useCalendarFocusDate } from '~/composables/useCalendar'
import { usePlanRunLogSheet } from '~/composables/usePlanRunLogSheet'
import { parseYMD, monthMatrix } from '~/utils/calendarDate'
import type { CalendarView } from '~/components/CalendarViewToggle.vue'

const { isAuthenticated } = useAuth()

const authReady = ref(false)
onMounted(() => { authReady.value = true })

const { days, events, nudgeDots, loading, lastRange, loadRange } = useCalendar()
const planRunLogSheet = usePlanRunLogSheet()
const focusDate = useCalendarFocusDate()

const now = new Date()
const view = ref<CalendarView>('month')
const year = ref(now.getFullYear())
const month = ref(now.getMonth() + 1) // 1-12

const daySheetOpen = ref(false)
const selectedDay = ref<string | null>(null)
const selectedDayRuns = computed(() => {
  if (!selectedDay.value) return []
  return days.value.find(d => d.date === selectedDay.value)?.runs ?? []
})

const selectedDayNeedsConfirm = computed(() => {
  if (!selectedDay.value) return false
  return days.value.find(d => d.date === selectedDay.value)?.needs_confirm ?? false
})

// Events whose date range spans the selected day (web#354 A1: owner-only,
// so always the viewer's own) — feeds the day sheet's Events section
// (label-only rows; the day sheet's own "+ New" is a single day-scoped
// affordance, not per-event — web#354 W3).
const selectedDayEvents = computed(() => {
  if (!selectedDay.value) return []
  return events.value.filter(e => e.start_date <= selectedDay.value! && e.end_date >= selectedDay.value!)
})

// Loaded separately (whole-year range) only when the Year view is active.
const yearDays = ref<import('~/composables/useCalendar').CalendarDay[]>([])

// Actual calendar-month boundaries (day 1 .. last day) — used to scope
// "this month" stats (CalendarEventsSection). Distinct from the wider
// grid-fetch range below, which also covers the
// leading/trailing adjacent-month cells the month grid displays (so those
// cells' dots + the day sheet have data too), but must NOT leak into "this
// month" counts.
function monthBounds(y: number, m: number): { from: string; to: string } {
  const from = `${y}-${String(m).padStart(2, '0')}-01`
  const lastDay = new Date(y, m, 0).getDate()
  const to = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { from, to }
}

const monthOnlyDays = computed(() => {
  const { from, to } = monthBounds(year.value, month.value)
  return days.value.filter(d => d.date >= from && d.date <= to)
})

const monthOnlyEvents = computed(() => {
  const { from, to } = monthBounds(year.value, month.value)
  return events.value.filter(e => e.start_date <= to && e.end_date >= from)
})

async function loadMonth() {
  // Fetch the full 6-week grid span (not just this month's days) so
  // leading/trailing adjacent-month cells get dot data and the day sheet
  // works when tapping them.
  const cells = monthMatrix(year.value, month.value)
  const from = cells[0].ymd
  const to = cells[cells.length - 1].ymd
  await loadRange(from, to, `${year.value}-${String(month.value).padStart(2, '0')}`)
}

async function loadYear() {
  const from = `${year.value}-01-01`
  const to = `${year.value}-12-31`
  await loadRange(from, to, `year:${year.value}`)
  yearDays.value = days.value
}

watch(view, (v) => {
  if (v === 'year') loadYear()
  else if (v === 'month') loadMonth()
  // 'list' reuses whatever range (month or year) is already loaded
})

watch([year, month], () => {
  if (view.value === 'month') loadMonth()
})

watch(isAuthenticated, (v) => {
  if (v) loadMonth()
}, { immediate: true })

function onMonthChange(m: number) {
  month.value = m
}

function onSelectMonthFromYear(m: number) {
  month.value = m
  view.value = 'month'
}

function openDay(ymd: string) {
  selectedDay.value = ymd
  daySheetOpen.value = true
}

// After the unified sheet's event branch creates an event, jump the month
// view to contain it (web#354 W1 — was PlanCreateSheet, now absorbed into
// PlanRunLogSheet).
watch(focusDate, (date) => {
  if (!date) return
  const d = parseYMD(date)
  year.value = d.getFullYear()
  month.value = d.getMonth() + 1
  view.value = 'month'
  focusDate.value = null
})
</script>
