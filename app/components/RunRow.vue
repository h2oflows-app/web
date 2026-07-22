<template>
  <!-- ─── LIST density ─────────────────────────────────────────────────────────
       A single divider row; the parent owns the bordered box that wraps them. -->
  <div
    v-if="viewMode === 'list'"
    :class="[
      'flex items-center gap-2 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors border-b border-neutral-100/50 dark:border-neutral-800/50 last:border-b-0 cursor-pointer',
      variant === 'gauge-subrow' ? 'pl-5 pr-3' : 'px-3',
    ]"
    @click.stop="$emit('open')"
  >
    <div class="flex flex-col min-w-0 flex-1">
      <div class="flex items-center gap-1 min-w-0">
        <OwnerIcon placement="left" :author-handle="vm.authorHandle" :slug="vm.slug" :run-id="vm.runId" />
        <NuxtLink
          v-if="nameAsLink"
          :to="detailTo"
          :class="listNameClass"
          @click.stop
        >{{ vm.label }}</NuxtLink>
        <span v-else :class="listNameClass">{{ vm.label }}</span>
        <span
          v-if="showRiver && vm.riverName"
          class="hidden sm:inline text-[11px] text-neutral-400 dark:text-neutral-500 shrink-0 truncate"
        >· {{ vm.riverName }}</span>
        <NuxtLink v-if="showEdit" :to="editTo" class="shrink-0 p-0.5 rounded text-neutral-300 dark:text-neutral-600 hover:text-primary-500 dark:hover:text-primary-400 transition-colors" aria-label="Edit" title="Edit" @click.stop>
          <svg class="w-3 h-3" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 4l3 3-9 9-4 1 1-4 9-9z"/></svg>
        </NuxtLink>
        <NuxtLink v-if="showView" :to="detailTo" class="shrink-0 p-0.5 rounded text-neutral-300 dark:text-neutral-600 hover:text-primary-500 dark:hover:text-primary-400 transition-colors" aria-label="View" title="View" @click.stop>
          <svg class="w-3 h-3" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 3H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-5M13 3h4m0 0v4m0-4L9 11"/></svg>
        </NuxtLink>
        <OwnerIcon v-if="showOwnerRight" placement="right" :author-handle="vm.authorHandle" :slug="vm.slug" :run-id="vm.runId" />
      </div>
      <span
        v-if="showRiver && vm.riverName"
        class="sm:hidden text-[11px] text-neutral-400 dark:text-neutral-500 truncate leading-tight"
      >{{ vm.riverName }}</span>
    </div>

    <!-- Sparkline column (run rows only; gauge sub-rows carry no reading). -->
    <div v-if="variant === 'run'" class="w-44 shrink-0 hidden sm:block h-6 opacity-60 pointer-events-none">
      <GaugeSparkline
        v-if="vm.gaugeId"
        :gauge-id="vm.gaugeId"
        :flow-status="(vm.sparklineFlowStatus as any)"
        :color="colorHex"
        compact
        :poll-health="vm.pollHealth"
        :last-reading-at="vm.lastReadingAt"
        @latest-cfs="onLatestCfs"
      />
      <CustomGaugeSparkline v-else-if="vm.customGaugeSlug" :gauge-slug="vm.customGaugeSlug" compact :color="colorHex" />
    </div>

    <!-- Trailing: run rows hug the badge to the cfs value; gauge sub-rows show a
         fixed-width badge column (no cfs of their own) so trash icons align. -->
    <div v-if="variant === 'run'" class="flex items-center gap-1.5 shrink-0">
      <span :class="['inline-flex items-center justify-center min-w-14 rounded-full px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-bold', hasBadge ? badgeClass : PLACEHOLDER_BADGE]">{{ hasBadge ? badgeLabel : '–' }}</span>
      <span class="font-bold tabular-nums leading-none text-sm sm:text-base whitespace-nowrap" :style="{ color: colorHex }">{{ cfsText }}<span class="text-[10px] sm:text-xs font-normal text-neutral-400 dark:text-neutral-500"> cfs</span></span>
    </div>
    <div v-else class="w-20 shrink-0 text-center">
      <span :class="['inline-flex items-center justify-center min-w-14 rounded-full px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-bold', hasBadge ? badgeClass : PLACEHOLDER_BADGE]">{{ hasBadge ? badgeLabel : '–' }}</span>
    </div>
    <TrashButton :label="removeLabel" @click="$emit('remove')" />
  </div>

  <!-- ─── CARD density (comfortable / full) ───────────────────────────────────
       Self-contained card. One canonical layout (issue #329): inline cfs, name
       + owner icons, badge, sparkline below. -->
  <div
    v-else
    class="relative rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3 transition-all duration-200 overflow-hidden cursor-pointer"
    @click.stop="$emit('open')"
  >
    <div class="flex items-start gap-3 mb-2">
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-1.5 min-w-0">
          <OwnerIcon placement="left" :author-handle="vm.authorHandle" :slug="vm.slug" :run-id="vm.runId" />
          <NuxtLink
            v-if="nameAsLink"
            :to="detailTo"
            :class="cardNameClass"
            @click.stop
          >{{ vm.label }}</NuxtLink>
          <span v-else :class="cardNameClass">{{ vm.label }}</span>
          <OwnerIcon v-if="showOwnerRight" placement="right" :author-handle="vm.authorHandle" :slug="vm.slug" :run-id="vm.runId" />
        </div>
        <div v-if="showRiver && vm.riverName" class="mt-0.5">
          <span class="text-[11px] text-neutral-400 dark:text-neutral-500 truncate">{{ vm.riverName }}</span>
        </div>
      </div>
      <div class="shrink-0 flex items-center gap-1">
        <span v-if="hasBadge" :class="['shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold', badgeClass]">{{ badgeLabel }}</span>
        <span class="font-bold tabular-nums leading-none text-3xl" :style="{ color: colorHex }">{{ cfsText }}<span class="text-xs font-normal text-neutral-500 dark:text-neutral-400 ml-0.5">cfs</span></span>
        <TrashButton :label="removeLabel" @click="$emit('remove')" />
      </div>
    </div>
    <div v-if="vm.gaugeId || vm.customGaugeSlug" class="relative mb-1 opacity-70 pointer-events-none">
      <GaugeSparkline
        v-if="vm.gaugeId"
        :gauge-id="vm.gaugeId"
        :flow-status="(vm.sparklineFlowStatus as any)"
        :color="colorHex"
        :compact="viewMode !== 'full'"
        :poll-health="vm.pollHealth"
        :last-reading-at="vm.lastReadingAt"
        @latest-cfs="onLatestCfs"
      />
      <CustomGaugeSparkline v-else-if="vm.customGaugeSlug" :gauge-slug="vm.customGaugeSlug" :compact="viewMode !== 'full'" :color="colorHex" />
    </div>
    <p v-if="viewMode === 'full' && vm.gaugeSource && vm.gaugeExternalId" class="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">{{ vm.gaugeSource.toUpperCase() }} {{ vm.gaugeExternalId }}</p>
    <p v-if="vm.lastReadingLabel" class="text-xs text-neutral-400 mt-0.5">{{ vm.lastReadingLabel }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { RunRowVM } from '~/utils/runRow'
import { colorKeyToHex, colorKeyToBadgeClass, flowBandLabel, flowStatusForColorKey } from '~/utils/flowBand'

const props = withDefaults(defineProps<{
  vm: RunRowVM
  viewMode: 'list' | 'comfortable' | 'full'
  // 'run' rows carry their own cfs + sparkline; 'gauge-subrow' rows sit under a
  // gauge header (no independent reading) and always render list-style.
  variant?: 'run' | 'gauge-subrow'
  // Name is a link to the detail page (dashboard's own runs); otherwise a plain
  // span and the whole row click navigates.
  nameAsLink?: boolean
  showView?: boolean
  showEdit?: boolean
  showOwnerRight?: boolean
  showRiver?: boolean
  // Wire the sparkline's live cfs back into the badge/color (gauge groups do
  // this; dashboard's own rows are static from the server value).
  liveFlow?: boolean
  // External live cfs, e.g. a gauge sub-row driven by its parent gauge header's
  // sparkline (the sub-row has no sparkline of its own). Takes precedence.
  liveCfsOverride?: number | null
  removeLabel?: string
}>(), {
  variant: 'run',
  nameAsLink: false,
  showView: false,
  showEdit: false,
  showOwnerRight: false,
  showRiver: true,
  liveFlow: false,
  removeLabel: 'Remove',
})

defineEmits<{ open: []; remove: [] }>()

// Gate-false placeholder pill (list density). Distinct from colorKeyToBadgeClass('')
// (the resolved-but-bandless gray) — this is the neutral "no data" slot.
const PLACEHOLDER_BADGE = 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500'

const { bandForCfs } = useRunFlowBand()
const { bandSolid, bandBadgeClass } = useFlowBandPalette()

const liveCfs = ref<number | null>(null)
function onLatestCfs(v: number) {
  if (props.liveFlow) liveCfs.value = v
}

const effectiveCfs = computed(() => props.liveCfsOverride ?? liveCfs.value ?? props.vm.cfs)

// Primary resolution: highest user threshold ≤ cfs. Null when the run has no
// configured flow bands, in which case the per-family fallback applies.
const band = computed(() => bandForCfs(props.vm.slug, effectiveCfs.value))

const isPalette = computed(() => props.vm.fallbackFlavor === 'palette')

const badgeLabel = computed(() => {
  if (band.value) return band.value.label
  return isPalette.value
    ? flowBandLabel(props.vm.rawBand, props.vm.rawStatus)
    : props.vm.fallbackLabel
})

const colorHex = computed(() => {
  if (band.value) return colorKeyToHex(band.value.color)
  return isPalette.value ? bandSolid(props.vm.rawBand, props.vm.rawStatus) : '#9ca3af'
})

const badgeClass = computed(() => {
  if (band.value) return colorKeyToBadgeClass(band.value.color)
  return isPalette.value ? bandBadgeClass(props.vm.rawBand, props.vm.rawStatus) : colorKeyToBadgeClass('')
})

// Badge gate differs per family (preserved from the originals):
//   palette → raw flow_status/flow_band (a threshold match that the raw fields
//             don't corroborate still reads as "no badge").
//   neutral → resolved status/label.
const hasBadge = computed(() => {
  if (isPalette.value) return props.vm.rawStatus !== 'unknown' || !!props.vm.rawBand
  return flowStatusForColorKey(band.value?.color ?? null) !== 'unknown' || !!badgeLabel.value
})

const cfsText = computed(() =>
  effectiveCfs.value != null ? Math.round(effectiveCfs.value).toLocaleString() : '—',
)

const detailTo = computed(() => `/runs/${props.vm.authorHandle ?? 'h2oflows'}/${props.vm.slug}`)
const editTo = computed(() => `/my/runs/${props.vm.slug}`)

const listNameClass = computed(() => [
  'min-w-0 text-[15px] text-neutral-700 dark:text-neutral-300 truncate',
  props.nameAsLink ? 'font-medium hover:text-primary-600 dark:hover:text-primary-400 transition-colors' : '',
])

// Linked names (dashboard's own runs) inherit the default text color + get a
// hover affordance, exactly as before; plain span names (group rows) keep their
// explicit neutral color. Preserves both families' original card-name look.
const cardNameClass = computed(() => [
  'min-w-0 text-base font-semibold truncate',
  props.nameAsLink
    ? 'hover:text-primary-600 dark:hover:text-primary-400 transition-colors'
    : 'text-neutral-800 dark:text-neutral-100',
])
</script>
