<template>
  <NuxtLink
    :to="`/plan-runs/${run.id}`"
    class="block rounded-xl border border-neutral-100 dark:border-neutral-800 px-4 py-3 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
  >
    <div class="flex items-center gap-3">
      <div class="w-10 shrink-0 text-center">
        <p class="text-[10px] uppercase text-neutral-400 leading-none">{{ dow(date) }}</p>
        <p class="text-sm font-semibold text-neutral-700 dark:text-neutral-200 leading-none mt-0.5">{{ fmtDate(date, { day: 'numeric' }) }}</p>
      </div>

      <span class="w-2 h-2 rounded-full shrink-0" :style="dotStyle" />

      <div class="min-w-0 flex-1">
        <p class="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">{{ run.name ?? 'Untitled run' }}</p>
        <p class="text-xs text-neutral-400">
          {{ run.paddled ? 'Logged' : 'Planned' }}<template v-if="run.gauge_cfs != null"> · {{ Math.round(run.gauge_cfs).toLocaleString() }} cfs</template>
        </p>
      </div>

      <span
        v-if="run.flow_band"
        class="text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0"
        :class="colorKeyToBadgeClass(run.flow_color ?? '')"
      >{{ flowBandLabel(run.flow_band) }}</span>

      <PlanTypeBadge v-if="plan" :type="plan.type" />
    </div>

    <p v-if="run.notes" class="mt-2 text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">{{ run.notes }}</p>

    <span class="mt-1.5 inline-block text-xs text-primary-600 dark:text-primary-400">Read more →</span>
  </NuxtLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CalendarPlan, CalendarRun } from '~/composables/useCalendar'
import { dow, fmtDate } from '~/utils/calendarDate'
import { colorKeyToHex, colorKeyToBadgeClass, flowBandLabel } from '~/utils/flowBand'
import { useFlowBandPalette } from '~/composables/useFlowBandPalette'

const props = defineProps<{
  run: CalendarRun
  date: string
  plan?: CalendarPlan | null
}>()

const { bandSolid } = useFlowBandPalette()

const dotStyle = computed(() => {
  const color = props.run.flow_color ? colorKeyToHex(props.run.flow_color) : bandSolid(props.run.flow_band ?? null)
  return props.run.paddled ? { background: color } : { background: 'transparent', border: `2px solid ${color}` }
})
</script>
