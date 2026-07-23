<template>
  <div>
    <div class="grid grid-cols-3 sm:grid-cols-4 gap-2">
      <button
        v-for="m in months"
        :key="m.month"
        type="button"
        class="flex flex-col items-start gap-1.5 p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-primary-300 dark:hover:border-primary-700 transition-colors text-left"
        :class="m.isFuture ? 'opacity-50' : ''"
        @click="$emit('select-month', m.month)"
      >
        <span class="text-xs font-semibold text-neutral-700 dark:text-neutral-200">{{ m.label }}</span>
        <div class="w-full h-1 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
          <div
            class="h-full bg-primary-500 dark:bg-primary-400 rounded-full"
            :style="{ width: `${m.pct}%` }"
          />
        </div>
        <span class="text-[10px] text-neutral-400">{{ m.total }} run{{ m.total === 1 ? '' : 's' }}<template v-if="m.paddled"> · {{ m.paddled }} paddled</template></span>
      </button>
    </div>
    <p class="text-xs text-neutral-400 text-center mt-4">
      Tap a month to zoom in · {{ yearPaddledTotal }} day{{ yearPaddledTotal === 1 ? '' : 's' }} on the water in {{ year }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CalendarDay } from '~/composables/useCalendar'
import { todayYMD } from '~/utils/calendarDate'

const props = defineProps<{
  year: number
  days: CalendarDay[]
}>()

defineEmits<{ 'select-month': [number] }>()

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const months = computed(() => {
  const now = new Date()
  return MONTH_LABELS.map((label, i) => {
    const monthNum = i + 1
    const prefix = `${props.year}-${String(monthNum).padStart(2, '0')}`
    const monthDays = props.days.filter(d => d.date.startsWith(prefix))
    const total = monthDays.reduce((sum, d) => sum + d.runs.length, 0)
    const paddled = monthDays.reduce((sum, d) => sum + d.runs.filter(r => r.paddled).length, 0)
    const pct = total > 0 ? Math.min(100, Math.round((paddled / total) * 100)) : 0
    const isFuture = props.year > now.getFullYear() || (props.year === now.getFullYear() && monthNum > now.getMonth() + 1)
    return { month: monthNum, label, total, paddled, pct, isFuture }
  })
})

const yearPaddledTotal = computed(() => {
  const today = todayYMD()
  const paddledDates = new Set(
    props.days.filter(d => d.runs.some(r => r.paddled) && d.date <= today).map(d => d.date)
  )
  return paddledDates.size
})
</script>
