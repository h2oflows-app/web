<template>
  <div v-if="currentMonth" :class="rootClass">
    <!-- Drawer variant: the inline "Seasonal context" strong is promoted to a section label -->
    <span
      v-if="variant === 'drawer'"
      class="text-[9.5px] font-bold uppercase tracking-[0.11em] text-neutral-500 dark:text-neutral-400"
    >Seasonal context</span>

    <div class="flex items-center justify-between gap-3">
      <span :class="sentenceClass">
        <template v-if="variant === 'card'"><strong>Seasonal context</strong> —</template>
        {{ monthName }} median {{ medianLabel }}
        <template v-if="percentileLabel"> · <strong>{{ percentileLabel }}</strong></template>
        <template v-if="currentMonth.count > 0"> · {{ currentMonth.count }}-yr record</template>
      </span>
    </div>

    <!-- 12-month bar chart -->
    <div :class="stripClass">
      <div
        v-for="m in months"
        :key="m.month"
        class="flex-1 rounded-sm transition-all relative"
        :class="barClass(m)"
        :style="barStyle(m)"
        :title="barTitle(m)"
      >
        <!-- Offline hatching — diagonal lines via repeating-linear-gradient -->
        <div
          v-if="m.offline"
          class="absolute inset-0 rounded-sm opacity-40"
          style="background: repeating-linear-gradient(-45deg, currentColor 0, currentColor 1px, transparent 0, transparent 50%) / 4px 4px"
        />
      </div>
    </div>

    <!-- Month labels: Jan, current month, Dec -->
    <div :class="labelRowClass">
      <span>Jan</span>
      <span :class="currentLabelClass">{{ monthName }}</span>
      <span>Dec</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGaugeSeasonal } from '~/composables/useGaugeSeasonal'

const props = withDefaults(defineProps<{
  gaugeId:     string
  currentCfs?: number | null
  /** `card` = the standalone banner under the panel graph (unchanged).
   *  `drawer` = chrome-less section inside the gauge sheet's Season & cycle drawer. */
  variant?:    'card' | 'drawer'
}>(), {
  currentCfs: null,
  variant:    'card',
})

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// One shared request per gauge id — the sheet's graph consumes the same composable.
const { stats, currentMonth } = useGaugeSeasonal(() => props.gaugeId)

const nowMonth  = new Date().getMonth() + 1 // 1-12
const monthName = computed(() => MONTH_NAMES[nowMonth - 1])

// ---- Variant chrome ---------------------------------------------------------

const rootClass = computed(() =>
  props.variant === 'drawer'
    ? 'flex flex-col gap-2.5'
    : 'rounded-lg px-3 py-2 text-xs bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 space-y-2'
)

const sentenceClass = computed((): string | undefined =>
  props.variant === 'drawer' ? 'text-xs text-neutral-700 dark:text-neutral-200' : undefined
)

const stripClass = computed(() =>
  props.variant === 'drawer'
    ? 'flex items-end gap-0.5 h-16'
    : 'flex items-end gap-px h-8'
)

const labelRowClass = computed(() =>
  props.variant === 'drawer'
    ? 'flex justify-between text-[9.5px] text-neutral-500 dark:text-neutral-400'
    : 'flex justify-between text-[9px] text-indigo-400 dark:text-indigo-500 -mt-1'
)

const currentLabelClass = computed(() =>
  props.variant === 'drawer'
    ? 'font-bold text-indigo-600 dark:text-indigo-300'
    : 'font-semibold text-indigo-600 dark:text-indigo-300'
)

// ---- Bars -------------------------------------------------------------------

interface BarMonth {
  month: number; heightPct: number; label: string
  offline: boolean; dim: boolean; coverage: number
}

// Bar chart: scale each month's median relative to the max median across the year
const months = computed((): BarMonth[] => {
  if (!stats.value.length) return []
  const maxMedian = Math.max(...stats.value.map(s => s.p50 ?? s.mean ?? 0))
  return stats.value.map(s => {
    const offline = s.coverage < 0.2
    const dim     = !offline && s.coverage < 0.5
    return {
      month:     s.month,
      heightPct: offline ? 8 : Math.max(8, ((s.p50 ?? s.mean ?? 0) / (maxMedian || 1)) * 100),
      label:     fmtCfs(s.p50 ?? s.mean),
      offline,
      dim,
      coverage:  s.coverage,
    }
  })
})

function barClass(m: BarMonth) {
  if (m.offline) return 'bg-neutral-200 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-600'
  if (m.dim)     return m.month === nowMonth ? 'bg-indigo-300 dark:bg-indigo-600' : 'bg-indigo-100 dark:bg-indigo-900'
  return m.month === nowMonth ? 'bg-indigo-500 dark:bg-indigo-400' : 'bg-indigo-200 dark:bg-indigo-800'
}
function barStyle(m: BarMonth)  { return { height: `${m.heightPct}%` } }
function barTitle(m: BarMonth)  {
  const name = MONTH_NAMES[m.month - 1]
  if (m.offline) return `${name}: gauge typically offline`
  if (m.dim)     return `${name}: ${m.label} median (partial season data)`
  return `${name}: ${m.label} median`
}

function fmtCfs(v: number | null | undefined): string {
  if (v == null) return '—'
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k cfs` : `${Math.round(v)} cfs`
}

const medianLabel = computed(() => fmtCfs(currentMonth.value?.p50))

// Determine which percentile band the current reading falls in
const percentileLabel = computed(() => {
  const m = currentMonth.value
  if (!m || props.currentCfs == null) return null
  const cfs = props.currentCfs
  if      (m.p90 != null && cfs >= m.p90) return 'above 90th percentile'
  else if (m.p75 != null && cfs >= m.p75) return '75th–90th percentile'
  else if (m.p50 != null && cfs >= m.p50) return '50th–75th percentile'
  else if (m.p25 != null && cfs >= m.p25) return '25th–50th percentile'
  else if (m.p10 != null && cfs >= m.p10) return '10th–25th percentile'
  else                                     return 'below 10th percentile'
})
</script>
