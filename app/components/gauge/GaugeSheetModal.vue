<!--
  GaugeSheetModal — shared presentational shell for the three gauge modals (#361).

  Used as <GaugeSheetModal> (nuxt.config sets pathPrefix:false, so the FILENAME
  is the tag — never <GaugeGaugeSheetModal>).

  Purely presentational: no fetching, no gauge ids, no band logic. Three modals
  with three different data sources compose it, so anything data-shaped arrives
  as a prop or a slot.

    A. GaugeDetailModal mode="reach"   — run title + author, View/Edit, band chip, trend
    B. GaugeDetailModal mode="gauge"   — "View gauge", watershed, seasonal reference lines
    C. UserRunCustomGaugeModal         — calculated series + input strips in #foot

  Layout (the graph IS the modal):
    ┌──────────────────────────────┐
    │ header scrim  (absolute, z-20)│ title/subtitle/actions · readout · meta
    │                              │
    │        #chart  flex-1 min-h-0│ ← fills every remaining pixel, edge to edge
    │                              │
    │        #foot   (in flow)     │ ← custom-gauge input strips, bleeds both edges
    │ x-axis strip  (absolute, z-10)│ ← upward scrim + 5 relative labels
    │ #drawer       (absolute, z-30)│ ← "Season & cycle", scrim-dismissable
    └──────────────────────────────┘

  Slot styling: wrappers carry the type/color, so a bare <NuxtLink> in #title or
  a bare <span> in #subtitle inherits the right size and hue without repeating it.
-->
<template>
  <UModal
    v-model:open="open"
    :ui="{ content: 'sm:max-w-xl sm:h-[min(880px,92dvh)] sm:rounded-2xl divide-y-0 max-sm:!inset-0 max-sm:!w-auto max-sm:!max-w-none max-sm:!rounded-none max-sm:!ring-0 max-sm:!translate-x-0 max-sm:!translate-y-0 focus:outline-none' }"
  >
    <template #content>
      <div class="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-white dark:bg-neutral-950">

        <!-- ── Chart — fills all remaining height, no gutters ─────────────── -->
        <div class="relative min-h-0 flex-1 [&>*]:h-full">
          <slot name="chart" />
        </div>

        <!-- ── Foot — below the chart, above the x-axis strip, full bleed ───
             The ceiling and the scroller live here, not in the slot content:
             only the shell's root has a definite height, so a percentage cap
             inside a content-sized wrapper resolves to `none` and tall foot
             content crushes the chart and then gets clipped by overflow-hidden
             with no way to scroll to it. pb clears the absolute x-axis strip. -->
        <div v-if="slots.foot" class="relative max-h-[45%] min-h-0 overflow-y-auto overscroll-contain pb-11.5">
          <slot name="foot" />
        </div>

        <!-- ── X axis — 5 relative labels on the bottom edge + upward scrim ─ -->
        <div
          class="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex h-11.5 items-end justify-between gap-1 bg-linear-to-t from-white/70 to-transparent px-4 pb-3 text-[10px] font-semibold tracking-[0.07em] text-neutral-400 uppercase tabular-nums dark:from-neutral-950/60 dark:text-neutral-500"
        >
          <span
            v-for="(label, i) in xAxisLabels"
            :key="i"
            :class="i === xAxisLabels.length - 1 ? 'text-neutral-600 dark:text-neutral-300' : ''"
          >{{ label }}</span>
        </div>

        <!-- ── Header — scrim over the plot; only controls take pointers ──── -->
        <div class="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-3.5 bg-linear-to-b from-white from-45% via-white/70 via-78% to-transparent px-4 pt-4 pb-7 dark:from-neutral-950 dark:via-neutral-950/60">

          <!-- Title / subtitle / actions -->
          <div class="flex items-start gap-2.5">
            <div class="flex min-w-0 flex-1 flex-col gap-0.5">
              <div class="pointer-events-auto w-fit max-w-full truncate text-base leading-tight font-bold tracking-tight text-neutral-900 dark:text-white">
                <slot name="title" />
              </div>
              <!-- Wraps rather than truncates: the reach subtitle ends in the
                   USGS/DWR deep link, which a single nowrap line clips away
                   entirely at phone width. gap-x supplies the spacing that flex
                   trims off the "·" separators. -->
              <div
                v-if="slots.subtitle"
                class="pointer-events-auto flex w-fit max-w-full flex-wrap items-center gap-x-1 text-xs leading-tight text-neutral-400 dark:text-neutral-500"
              >
                <slot name="subtitle" />
              </div>
            </div>
            <div class="pointer-events-auto flex shrink-0 items-center gap-1.5">
              <slot name="actions" />
              <button
                type="button"
                class="inline-flex size-6.5 cursor-pointer items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 focus:outline-none focus-visible:outline-none dark:text-neutral-500 dark:hover:bg-white/10 dark:hover:text-white"
                aria-label="Close"
                @click="open = false"
              >
                <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Readout + band chip + range switch -->
          <div class="flex items-center gap-3">
            <!-- pointer-events-auto keeps the value selectable and TrendArrow's
                 native title tooltip alive; the box is content-width, so it
                 costs almost no chart hover area. -->
            <div class="pointer-events-auto flex items-baseline gap-1.5">
              <span class="text-2xl leading-none font-semibold tracking-tight tabular-nums text-neutral-900 dark:text-white">{{ displayValue }}</span>
              <span class="text-xs font-medium text-neutral-400 dark:text-neutral-500">{{ unit }}</span>
              <span v-if="slots.trend" class="ml-0.5 text-xs leading-none font-bold"><slot name="trend" /></span>
            </div>
            <span
              v-if="bandLabel"
              :class="['inline-flex h-5 shrink-0 items-center rounded-md px-1.5 text-[10.5px] font-bold tracking-[0.03em]', bandClass ?? '']"
            >{{ bandLabel }}</span>
            <div
              v-if="!hideRangeSwitch"
              class="pointer-events-auto ml-auto flex shrink-0 gap-0.5 rounded-lg bg-neutral-100 p-0.5 dark:bg-white/[0.07]"
              role="group"
              aria-label="Time range"
            >
              <button
                v-for="[h, label] in RANGES"
                :key="h"
                type="button"
                :aria-pressed="hours === h"
                class="h-5.5 cursor-pointer rounded-md px-2 text-[10.5px] font-semibold transition-colors"
                :class="hours === h
                  ? 'bg-white text-neutral-900 shadow-sm dark:bg-white/15 dark:text-white dark:shadow-none'
                  : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'"
                @click="hours = h"
              >{{ label }}</button>
            </div>
          </div>

          <!-- Meta row + drawer link -->
          <div v-if="metaText || drawerLabel" class="flex items-center gap-2 text-xs text-neutral-400 dark:text-neutral-500">
            <span v-if="metaText" class="truncate">{{ metaText }}</span>
            <span v-if="metaText && drawerLabel" class="opacity-50" aria-hidden="true">·</span>
            <button
              v-if="drawerLabel"
              type="button"
              class="pointer-events-auto inline-flex shrink-0 cursor-pointer items-center gap-1 font-semibold text-neutral-500 underline underline-offset-[3px] transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
              @click="drawerOpen = true"
            >
              {{ drawerLabel }}
              <svg class="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">
                <path d="M7 17 17 7M9 7h8v8" />
              </svg>
            </button>
          </div>
        </div>

        <!-- ── Drawer — over the chart; close button AND scrim tap dismiss ──
             backdropDown/backdropUp (not @click.self) so a drag that starts
             inside the drawer and releases on the scrim does not close it. -->
        <Transition
          enter-active-class="transition-opacity duration-200 ease-out"
          enter-from-class="opacity-0"
          leave-active-class="transition-opacity duration-150 ease-in"
          leave-to-class="opacity-0"
        >
          <div
            v-if="drawerLabel && drawerOpen"
            class="absolute inset-0 z-30 bg-black/45"
            @pointerdown="backdropDown"
            @pointerup="backdropUp($event) && (drawerOpen = false)"
          >
            <div class="absolute inset-x-0 bottom-0 flex max-h-[85%] flex-col gap-4 rounded-t-2xl border-t border-neutral-200 bg-white px-4.5 pt-3 pb-5 shadow-2xl dark:border-white/10 dark:bg-neutral-900">
              <div class="mx-auto h-1 w-8.5 shrink-0 rounded-full bg-neutral-300 dark:bg-white/20" />
              <div class="flex shrink-0 items-center justify-between gap-2.5">
                <span class="text-[13px] font-bold text-neutral-900 dark:text-white">{{ drawerLabel }}</span>
                <button
                  type="button"
                  class="inline-flex size-6 cursor-pointer items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 focus:outline-none focus-visible:outline-none dark:text-neutral-500 dark:hover:bg-white/10 dark:hover:text-white"
                  aria-label="Close"
                  @click="drawerOpen = false"
                >
                  <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div class="min-h-0 flex-1 overflow-y-auto">
                <slot name="drawer" />
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { backdropDown, backdropUp } from '~/utils/backdrop'

type Hours = 12 | 24 | 168 | 720

const open  = defineModel<boolean>('open', { default: false })
const hours = defineModel<Hours>('hours', { default: 24 })

const props = withDefaults(defineProps<{
  valueCfs?: number | null        // readout value; renders an em-dash when null
  unit?: string                   // readout unit
  bandLabel?: string | null       // chip text; chip is hidden when null
  bandClass?: string | null       // classes from useFlowBandPalette().bandBadgeClass
  metaText?: string | null        // e.g. 'Last reading 12m ago'
  drawerLabel?: string | null     // e.g. 'Season & cycle'; link + drawer hidden when null
  hideRangeSwitch?: boolean       // suppress the 12h/1d/1w/1m segmented control
}>(), {
  valueCfs:        null,
  unit:            'cfs',
  bandLabel:       null,
  bandClass:       null,
  metaText:        null,
  drawerLabel:     null,
  hideRangeSwitch: false,
})

const slots = defineSlots<{
  title(): unknown              // required — run name or gauge name
  subtitle?(): unknown          // author handle / source / watershed
  actions?(): unknown           // View / Edit buttons (close is owned by the shell)
  trend?(): unknown             // TrendArrow
  chart(): unknown              // required — GaugeGraph variant="sheet"
  foot?(): unknown              // custom-gauge input strips
  drawer?(): unknown            // seasonal + diurnal content
}>()

const RANGES = [[12, '12h'], [24, '1d'], [168, '1w'], [720, '1m']] as const

// X labels derive from the window alone — 5 stops, last one is "now".
const X_AXIS_LABELS: Record<Hours, readonly string[]> = {
  12:  ['-12H', '-9H', '-6H', '-3H', 'NOW'],
  24:  ['-24H', '-18H', '-12H', '-6H', 'NOW'],
  168: ['-7D', '-5D', '-3D', '-1D', 'NOW'],
  720: ['-30D', '-22D', '-15D', '-7D', 'NOW'],
}

const xAxisLabels = computed(() => X_AXIS_LABELS[hours.value])

const displayValue = computed(() =>
  props.valueCfs != null ? props.valueCfs.toLocaleString() : '—',
)

// Drawer state is local to the shell — nothing upstream needs it, and a ref
// published through defineExpose would arrive unwrapped/undefined anyway.
const drawerOpen = ref(false)
watch(open, (v) => { if (!v) drawerOpen.value = false })
</script>
