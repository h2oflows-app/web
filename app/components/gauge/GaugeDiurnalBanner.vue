<template>
  <div v-if="visible" :class="rootClass">
    <!-- Drawer variant: the inline "Diurnal cycle" strong is promoted to a section label -->
    <span
      v-if="variant === 'drawer'"
      class="text-[9.5px] font-bold uppercase tracking-[0.11em] text-neutral-500 dark:text-neutral-400"
    >Diurnal cycle</span>

    <span :class="sentenceClass">
      <template v-if="variant === 'card'"><strong>Diurnal cycle</strong> — {{ phaseLabel }}</template>
      <strong v-else>{{ phaseLabel }}</strong>
      <template v-if="peakText"> · {{ peakText }}</template>
      <template v-if="swingText"> · {{ swingText }}</template>
    </span>

    <!-- 24-hour bar strip — yesterday's hourly means, the same profile the forecast reads -->
    <template v-if="variant === 'drawer' && bars.length > 0">
      <div class="flex items-end gap-0.5 h-10">
        <div
          v-for="b in bars"
          :key="b.hour"
          class="flex-1 rounded-sm"
          :class="b.hasData ? 'bg-sky-400' : 'bg-neutral-300 dark:bg-neutral-700'"
          :style="{ height: `${b.heightPct}%`, opacity: b.opacity }"
          :title="b.title"
        />
      </div>
      <div class="flex justify-between text-[9.5px] text-neutral-500 dark:text-neutral-400">
        <span>12a</span>
        <span>6a</span>
        <span>12p</span>
        <span>6p</span>
        <span>12a</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DiurnalPattern } from '~/composables/useDiurnalPattern'

const props = withDefaults(defineProps<{
  /** Pattern from `useDiurnalPattern` / `useDiurnalCache`. Renders nothing when null or undetected. */
  pattern:  DiurnalPattern | null
  /** `card` = the inline sky-tinted pill under a panel graph.
   *  `drawer` = chrome-less section inside the gauge sheet's Season & cycle drawer. */
  variant?: 'card' | 'drawer'
}>(), {
  variant: 'card',
})

const visible = computed(() => props.pattern?.detected === true)

// ---- Variant chrome ---------------------------------------------------------

const rootClass = computed(() =>
  props.variant === 'drawer'
    ? 'flex flex-col gap-2.5'
    : 'flex items-center gap-2 rounded-lg px-3 py-2 text-xs bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300'
)

const sentenceClass = computed(() =>
  props.variant === 'drawer' ? 'text-xs text-neutral-700 dark:text-neutral-200' : ''
)

// ---- Sentence ---------------------------------------------------------------

const phaseLabel = computed(() => {
  switch (props.pattern?.phase) {
    case 'rising':      return 'Rising'
    case 'falling':     return 'Falling'
    case 'near_peak':   return 'Near peak'
    case 'near_trough': return 'Near trough'
    default:            return 'Stable'
  }
})

const peakText = computed((): string | null => {
  const p = props.pattern
  if (!p || p.estimatedPeakHour == null) return null
  const cfs = p.peakCfs != null ? ` (~${p.peakCfs.toLocaleString()} cfs)` : ''
  return `Est. peak ${formatHour(p.estimatedPeakHour)}${cfs}`
})

const swingText = computed((): string | null => {
  const swing = props.pattern?.swingPct
  return swing != null ? `${swing}% daily swing` : null
})

// ---- Hour strip -------------------------------------------------------------

interface HourBar {
  hour:      number
  heightPct: number
  opacity:   number
  hasData:   boolean
  title:     string
}

/**
 * One bar per local hour, scaled between yesterday's quietest and busiest hour.
 * Hours with no reading render as a low neutral stub — never interpolated.
 */
const bars = computed((): HourBar[] => {
  const hourly = props.pattern?.hourly
  if (!hourly || hourly.length === 0) return []

  const vals = hourly.filter((v): v is number => v != null)
  if (vals.length === 0) return []

  const min  = Math.min(...vals)
  const span = Math.max(...vals) - min

  return hourly.map((v, hour): HourBar => {
    if (v == null) {
      return {
        hour,
        heightPct: 6,
        opacity:   0.45,
        hasData:   false,
        title:     `${formatHour(hour)} — no reading`,
      }
    }
    const f = span > 0 ? (v - min) / span : 0.5
    return {
      hour,
      heightPct: Math.round(28 + f * 72),
      opacity:   Number((0.2 + f * 0.55).toFixed(2)),
      hasData:   true,
      title:     `Yesterday ${formatHour(hour)} — ${Math.round(v).toLocaleString()} cfs avg`,
    }
  })
})

function formatHour(h: number): string {
  const ampm = h >= 12 ? 'pm' : 'am'
  return `${h % 12 === 0 ? 12 : h % 12}${ampm}`
}
</script>
