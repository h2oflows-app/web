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

    <!-- TODO(W6): needs_confirm '?' badge + quiet dot (Tier-A/Tier-B nudge) — A5 data always empty for now -->

    <!-- Plan ribbon: 4px bottom bar, rounded at span start/end, dashed when pending invite -->
    <span
      v-if="ribbon"
      class="absolute left-0 right-0 bottom-0 h-1"
      :class="[
        ribbon.dashed ? 'opacity-70' : '',
        ribbon.pos === 'single' ? 'mx-1 rounded-full' : ribbon.pos === 'start' ? 'ml-1 rounded-l-full' : ribbon.pos === 'end' ? 'mr-1 rounded-r-full' : '',
        ribbon.dashed ? 'ribbon-dashed' : planTypeMeta(ribbon.type).ribbonClass,
      ]"
    />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CalendarRun } from '~/composables/useCalendar'
import { planTypeMeta } from '~/utils/planType'
import { colorKeyToHex } from '~/utils/flowBand'
import { useFlowBandPalette } from '~/composables/useFlowBandPalette'

export interface RibbonVM {
  type: string
  pos: 'start' | 'mid' | 'end' | 'single'
  dashed: boolean
}

const props = defineProps<{
  ymd: string
  dayNum: number
  inMonth: boolean
  isToday: boolean
  runs: CalendarRun[]
  ribbon: RibbonVM | null
}>()

defineEmits<{ 'select-day': [string] }>()

const { bandSolid } = useFlowBandPalette()

const cellBgClass = computed(() => {
  if (props.isToday) return 'bg-primary-600'
  if (props.ribbon && !props.ribbon.dashed) return planTypeMeta(props.ribbon.type).tintClass
  if (props.ribbon && props.ribbon.dashed) return 'bg-violet-50/60 dark:bg-violet-950/20'
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

<style scoped>
.ribbon-dashed {
  background-image: repeating-linear-gradient(90deg, var(--ui-color-violet-500, #8b5cf6) 0 4px, transparent 4px 8px);
}
</style>
