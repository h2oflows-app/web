<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
        @click.self="close"
      >
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="translate-y-full sm:translate-y-4 sm:opacity-0"
          enter-to-class="translate-y-0 sm:opacity-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="translate-y-0 sm:opacity-100"
          leave-to-class="translate-y-full sm:translate-y-4 sm:opacity-0"
        >
          <div
            v-if="open"
            class="w-full sm:max-w-md max-h-[85vh] flex flex-col bg-white dark:bg-neutral-900 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden pb-[env(safe-area-inset-bottom)]"
          >
            <div class="flex justify-center pt-3 pb-1 sm:hidden">
              <div class="w-9 h-1 rounded-full bg-neutral-200 dark:bg-neutral-700" />
            </div>

            <div class="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between shrink-0">
              <div>
                <h2 class="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{{ title }}</h2>
                <p class="text-xs text-neutral-400 mt-0.5">{{ subline }}</p>
              </div>
              <button
                class="p-1 rounded text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                aria-label="Close"
                @click="close"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
              <div
                v-for="run in runs"
                :key="run.id"
                class="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-neutral-100 dark:border-neutral-800"
              >
                <span class="w-2 h-2 rounded-full shrink-0" :style="dotStyle(run)" />
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">{{ run.name ?? 'Untitled run' }}</p>
                  <p v-if="run.run_time" class="text-xs text-neutral-400">{{ formatTime(run.run_time) }}</p>
                </div>
                <span
                  v-if="run.flow_band || run.gauge_cfs != null"
                  class="text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0"
                  :class="colorKeyToBadgeClass(run.flow_color ?? '')"
                >
                  {{ flowBandLabel(run.flow_band) }}<template v-if="run.gauge_cfs != null"> · {{ Math.round(run.gauge_cfs) }}</template>
                </span>
                <span
                  class="text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0"
                  :class="run.paddled
                    ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
                    : 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400'"
                >{{ run.paddled ? 'Logged' : 'Planned' }}</span>
                <!-- TODO(W3): Mark-paddled action lands with PlanRunLogSheet -->
              </div>

              <p v-if="!runs.length" class="text-sm text-neutral-400 text-center py-8">Nothing here yet.</p>
            </div>

            <div class="p-4 border-t border-neutral-100 dark:border-neutral-800 shrink-0">
              <button
                type="button"
                class="w-full py-2.5 rounded-xl border-2 border-dashed border-primary-300 dark:border-primary-700 text-primary-600 dark:text-primary-400 text-sm font-medium hover:bg-primary-50/50 dark:hover:bg-primary-950/30 transition-colors"
                @click="$emit('new-plan-here')"
              >+ New plan here</button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CalendarRun } from '~/composables/useCalendar'
import { fmtDate } from '~/utils/calendarDate'
import { colorKeyToHex, colorKeyToBadgeClass, flowBandLabel } from '~/utils/flowBand'
import { useFlowBandPalette } from '~/composables/useFlowBandPalette'

const props = defineProps<{
  open: boolean
  date: string | null
  runs: CalendarRun[]
}>()

const emit = defineEmits<{
  'update:open': [boolean]
  'new-plan-here': []
}>()

const { bandSolid } = useFlowBandPalette()

function close() {
  emit('update:open', false)
}

const title = computed(() => {
  if (!props.date) return ''
  return fmtDate(props.date, { weekday: 'long', month: 'short', day: 'numeric' })
})

const subline = computed(() => {
  const n = props.runs.length
  return n === 0 ? 'Nothing planned yet' : `${n} run${n === 1 ? '' : 's'}`
})

function dotStyle(run: CalendarRun): Record<string, string> {
  const color = run.flow_color ? colorKeyToHex(run.flow_color) : bandSolid(run.flow_band ?? null)
  return run.paddled ? { background: color } : { background: 'transparent', border: `2px solid ${color}` }
}

function formatTime(t: string): string {
  // t is "HH:MM:SS" or "HH:MM" — render as h:mm AM/PM without a Date parse
  // (never new Date(iso) for a plain time value, per calendarDate.ts rule).
  const [hStr, mStr] = t.split(':')
  const h = Number(hStr)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${mStr} ${period}`
}
</script>
