<template>
  <button
    type="button"
    class="relative flex flex-col items-start justify-start p-1 sm:p-1.5 min-h-14 sm:min-h-20 text-left rounded-md transition-colors overflow-hidden"
    :class="cellBgClass"
    @click="$emit('select-day', ymd)"
  >
    <span
      class="text-[11px] sm:text-xs font-medium leading-none"
      :class="[
        isToday ? 'text-white' : inMonth ? 'text-neutral-700 dark:text-neutral-200' : 'text-neutral-300 dark:text-neutral-700',
      ]"
    >{{ dayNum }}</span>

    <!-- Flow dots: filled = paddled, hollow = planned (≤2 shown) -->
    <div v-if="runs.length" class="flex items-center gap-1 mt-1">
      <span
        v-for="(run, i) in runs.slice(0, 2)"
        :key="run.id ?? i"
        class="w-2 h-2 rounded-full"
        :style="dotStyle(run)"
      />
    </div>

    <!-- needs_confirm '?' badge (Tier-A: in-band, unpaddled, nudge-eligible) -->
    <span
      v-if="needsConfirm"
      class="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full border border-dashed border-amber-500 dark:border-amber-400 bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center text-[8px] font-bold leading-none text-amber-600 dark:text-amber-400"
      title="Did you paddle this?"
    >?</span>
    <!-- quiet dot (Tier-B: in-band + previously paddled, no popup — "you find it when you look") -->
    <span
      v-else-if="quietDot"
      class="absolute top-1 right-1 w-1.5 h-1.5 rounded-full border border-dashed border-neutral-400 dark:border-neutral-500"
      title="Conditions look good"
    />

    <!-- Event ribbon: 4px bottom bar, rounded at span start/end. web#354 A1:
         single Event color (event-type concept removed) — events are
         owner-only now, so there's no more pending-invite dashed variant
         either. -->
    <span
      v-if="ribbon"
      class="absolute left-0 right-0 bottom-0 h-1"
      :class="[
        ribbon.pos === 'single' ? 'mx-1 rounded-full' : ribbon.pos === 'start' ? 'ml-1 rounded-l-full' : ribbon.pos === 'end' ? 'mr-1 rounded-r-full' : '',
        EVENT_COLOR.ribbonClass,
      ]"
    />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CalendarRun } from '~/composables/useCalendar'
import { EVENT_COLOR } from '~/utils/planType'
import { colorKeyToHex } from '~/utils/flowBand'
import { useFlowBandPalette } from '~/composables/useFlowBandPalette'

export interface RibbonVM {
  pos: 'start' | 'mid' | 'end' | 'single'
}

const props = defineProps<{
  ymd: string
  dayNum: number
  inMonth: boolean
  isToday: boolean
  runs: CalendarRun[]
  ribbon: RibbonVM | null
  needsConfirm?: boolean
  quietDot?: boolean
}>()

defineEmits<{ 'select-day': [string] }>()

const { bandSolid } = useFlowBandPalette()

const cellBgClass = computed(() => {
  if (props.isToday) return 'bg-primary-600'
  if (props.ribbon) return EVENT_COLOR.tintClass
  if (props.runs.length) return 'bg-neutral-100 dark:bg-neutral-800/60'
  return 'hover:bg-neutral-50 dark:hover:bg-neutral-900'
})

function dotStyle(run: CalendarRun): Record<string, string> {
  const color = run.flow_color ? colorKeyToHex(run.flow_color) : bandSolid(run.flow_band ?? null)
  if (run.paddled) {
    return { background: color }
  }
  return {
    background: 'transparent',
    border: `2px solid ${props.isToday ? '#ffffff' : color}`,
  }
}
</script>
