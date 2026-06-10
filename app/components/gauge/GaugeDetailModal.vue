<template>
  <UModal v-model:open="open" :ui="{ content: 'sm:max-w-xl max-sm:!inset-0 max-sm:!w-auto max-sm:!max-w-none max-sm:!rounded-none max-sm:!ring-0 max-sm:!translate-x-0 max-sm:!translate-y-0 focus:outline-none' }">
    <template #header>
      <div class="flex items-start justify-between gap-3 w-full">
        <div class="min-w-0 flex-1">
          <!-- Reach mode: reach name links to reach page; gauge info as subtitle -->
          <template v-if="mode === 'reach' && reachTitle">
            <NuxtLink
              v-if="reachNavPath"
              :to="reachNavPath"
              class="text-lg font-bold text-neutral-900 dark:text-white truncate leading-tight hover:text-primary-600 dark:hover:text-primary-400 transition-colors block focus:outline-none"
              @click="open = false"
            >{{ reachTitle }}</NuxtLink>
            <h2 v-else class="text-lg font-bold text-neutral-900 dark:text-white truncate leading-tight">{{ reachTitle }}</h2>
            <p class="text-xs text-neutral-400 truncate mt-0.5 flex items-center gap-1 flex-wrap">
              <span v-if="gauge.contextReachAuthorHandle" class="text-neutral-500 dark:text-neutral-400">@{{ gauge.contextReachAuthorHandle }}</span>
              <span v-if="gauge.contextReachAuthorHandle" class="opacity-40">·</span>
              {{ gaugeName }} ·
              <a :href="sourceUrl" target="_blank" rel="noopener" class="hover:text-primary-400 underline underline-offset-2">
                {{ gauge.source.toUpperCase() }} {{ gauge.externalId }}
              </a>
            </p>
          </template>
          <!-- Gauge mode (default): gauge name as title, no reach context -->
          <template v-else>
            <h2 class="text-lg font-bold text-neutral-900 dark:text-white truncate leading-tight">{{ gaugeName }}</h2>
            <p class="text-xs text-neutral-400 truncate mt-0.5">
              <a :href="sourceUrl" target="_blank" rel="noopener" class="hover:text-primary-400 underline underline-offset-2">
                {{ gauge.source.toUpperCase() }} · {{ gauge.externalId }}
              </a>
              <span v-if="gauge.watershedName"> · {{ gauge.watershedName }}</span>
            </p>
          </template>
        </div>
        <!-- View reach + close buttons -->
        <div class="flex items-center gap-1 shrink-0">
          <NuxtLink
            v-if="mode === 'reach' && reachNavPath"
            :to="reachNavPath"
            class="p-1.5 rounded-md text-neutral-400 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
            :title="`View ${reachTitle ?? 'run'} details`"
            @click="open = false"
          >
            <svg class="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 10h10M11 6l4 4-4 4"/>
            </svg>
          </NuxtLink>
          <button
            class="p-1 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors focus:outline-none focus-visible:outline-none"
            aria-label="Close"
            @click="open = false"
          >
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
    </template>

    <template #body>
      <div class="space-y-3">
        <!-- CFS + trend arrow — left-aligned, prominent -->
        <div>
          <div class="flex items-baseline gap-2 flex-wrap">
            <span class="text-3xl font-bold tabular-nums leading-none text-neutral-900 dark:text-white">
              {{ displayCfs != null ? displayCfs.toLocaleString() : '—' }}
            </span>
            <span class="text-sm text-neutral-500">cfs</span>
            <TrendArrow v-if="displayCfs != null" :gauge-id="gauge.id" class="text-lg" />
            <!-- Flow band badge — reach mode, uses live band when available -->
            <span
              v-if="mode === 'reach' && (liveBand?.flowStatus !== 'unknown' || liveBand?.flowBandLabel || gauge.flowStatus !== 'unknown' || gauge.flowBandLabel)"
              :class="['inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium', bandBadgeClass(liveBand?.flowBandLabel ?? gauge.flowBandLabel, liveBand?.flowStatus ?? gauge.flowStatus)]"
            >{{ flowBandLabel(liveBand?.flowBandLabel ?? gauge.flowBandLabel, liveBand?.flowStatus ?? gauge.flowStatus) }}</span>
          </div>
          <p v-if="gauge.lastReadingAt" class="text-xs text-neutral-400 mt-0.5">Last reading {{ lastReadingRelative }}</p>
        </div>

        <!-- Diurnal cycle banner — hoisted above graph when detected -->
        <div
          v-if="diurnalData?.detected"
          class="flex items-center gap-2 rounded-lg px-3 py-2 text-xs bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300"
        >
          <span class="text-base">🌡</span>
          <span>
            <strong>Diurnal cycle</strong> —
            {{ diurnalPhaseLabel }}
            <template v-if="diurnalData.estimatedPeakHour != null">
              · Est. peak {{ formatHour(diurnalData.estimatedPeakHour) }}
              (~{{ diurnalData.peakCfs?.toLocaleString() }} cfs)
            </template>
            <template v-if="diurnalData.swingPct != null">
              · {{ diurnalData.swingPct }}% daily swing
            </template>
          </span>
        </div>

        <!-- Graph:
             reach mode — colored line + flow band fills + legend (below chart)
             gauge mode — neutral blue, no ranges, no legend -->
        <GaugeGraph
          :gauge-id="gauge.id"
          :current-cfs="displayCfs"
          :reach-slug="graphReachSlug"
          :no-ranges="mode !== 'reach'"
          :color="mode !== 'reach' ? '#3b82f6' : undefined"
          :height="280"
          hide-diurnal
          @latest-cfs="liveCfs = $event"
          @live-flow-band="liveBand = $event"
          @diurnal="diurnalData = $event"
        />

      </div>
    </template>

  </UModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { WatchedGauge } from '~/stores/watchlist'
import { flowBandLabel } from '~/utils/flowBand'
import { type DiurnalPattern } from '~/composables/useDiurnalPattern'

const { bandBadgeClass } = useFlowBandPalette()

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{
  gauge: WatchedGauge
  mode?: 'gauge' | 'reach'  // 'gauge' = neutral blue, no bands; 'reach' = colored + reach name + bands
}>()

const liveCfs    = ref<number | null>(null)
const liveBand   = ref<{ flowBandLabel: string | null; flowStatus: string } | null>(null)
const diurnalData = ref<DiurnalPattern | null>(null)
watch(open, (v) => { if (!v) { liveCfs.value = null; liveBand.value = null; diurnalData.value = null } })

const displayCfs = computed(() => liveCfs.value ?? props.gauge.currentCfs)

const gaugeName = computed(() =>
  props.gauge.name ?? `${props.gauge.source.toUpperCase()} ${props.gauge.externalId}`
)

// Reach title (reach mode header) — prefer common name, fall back to put-in→take-out
const reachTitle = computed(() =>
  props.gauge.contextReachCommonName
    ?? props.gauge.contextReachFullName
    ?? null
)

// Slug used for "View this reach" link and the header NuxtLink
const reachSlugForLink = computed(() =>
  props.gauge.contextReachSlug
    ?? props.gauge.reachSlug
    ?? props.gauge.reachSlugs?.[0]
    ?? null
)

// Full nav path for reach link: /runs/{handle}/{slug}
const reachNavPath = computed(() => {
  const slug = reachSlugForLink.value
  if (!slug) return null
  const handle = props.gauge.contextReachAuthorHandle ?? 'h2oflows'
  return `/runs/${handle}/${slug}`
})

// Reach slug passed to GaugeGraph only in reach mode — drives flow band coloring + legend.
// null in gauge mode forces neutral blue graph with no bands.
const graphReachSlug = computed(() =>
  props.mode === 'reach'
    ? (props.gauge.contextReachSlug ?? props.gauge.reachSlug ?? null)
    : null
)

// ── Diurnal helpers ───────────────────────────────────────────────────────
const diurnalPhaseLabel = computed(() => {
  switch (diurnalData.value?.phase) {
    case 'rising':      return 'Rising'
    case 'falling':     return 'Falling'
    case 'near_peak':   return 'Near peak'
    case 'near_trough': return 'Near trough'
    default:            return 'Stable'
  }
})

function formatHour(h: number): string {
  const ampm = h >= 12 ? 'pm' : 'am'
  return `${h % 12 === 0 ? 12 : h % 12}${ampm}`
}

const sourceUrl = computed(() => gaugeSourceUrl(props.gauge.source, props.gauge.externalId) ?? '#')


const lastReadingRelative = computed(() => {
  if (!props.gauge.lastReadingAt) return ''
  const ms = Date.now() - new Date(props.gauge.lastReadingAt).getTime()
  const m = Math.floor(ms / 60_000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m ago`
})
</script>
