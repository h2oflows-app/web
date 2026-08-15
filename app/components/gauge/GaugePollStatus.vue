<template>
  <div class="flex items-center gap-1.5 min-w-0" @click.stop>
    <!-- Status badge -->
    <span v-if="badgeText" :class="['text-[10px] leading-none font-mono whitespace-nowrap', badgeClass]">
      {{ badgeText }}
    </span>

    <!-- Refresh button — always shown unless retired -->
    <button
      v-if="showRefresh"
      :disabled="refreshing || justRefreshed"
      class="shrink-0 text-neutral-400 hover:text-primary-500 dark:hover:text-primary-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      :title="justRefreshed ? 'Refreshed' : 'Refresh now'"
      @click.stop="doRefresh"
    >
      <svg
        class="w-3 h-3"
        :class="refreshing ? 'animate-spin' : ''"
        viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
      >
        <path d="M13.5 8A5.5 5.5 0 1 1 10 3.07"/>
        <path d="M10 2v3h3"/>
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { formatRelativeAge } from '~/utils/relativeTime'

const props = defineProps<{
  gaugeId: string
  pollHealth?: 'healthy' | 'degraded' | 'stale' | 'unreachable' | null
  readingStale?: boolean
  lastReadingAt?: string | null
  status?: string | null
  historyLoading?: boolean
}>()

const emit = defineEmits<{
  (e: 'refreshed'): void
}>()

const { apiBase } = useRuntimeConfig().public
const refreshing    = ref(false)
const justRefreshed = ref(false)
const localReadingAt = ref<string | null>(null)  // set after successful refresh

const effectiveReadingAt = computed(() => localReadingAt.value ?? props.lastReadingAt ?? null)

function ageMinutes(isoStr: string): number {
  return Math.floor((Date.now() - new Date(isoStr).getTime()) / 60_000)
}

// Coarse: this is a compact status chip, and it composes into strings like
// "Stale · 3h ago". It passes minutes rather than the timestamp because
// badgeText below branches on the age before formatting it.
function fmtAge(mins: number): string {
  return formatRelativeAge(mins)
}

const badgeText = computed((): string | null => {
  if (props.status === 'retired') return 'Decommissioned'
  if (props.status === 'seasonal' && props.pollHealth !== 'healthy') return 'Seasonal · off-season'
  if (props.historyLoading) return 'History loading…'
  if (justRefreshed.value) return `Updated just now`
  const at = effectiveReadingAt.value
  if (props.pollHealth === 'unreachable') return at ? `Offline · ${fmtAge(ageMinutes(at))}` : 'Offline'
  if (!at) return null
  const mins = ageMinutes(at)
  // Reachable, but the source has stopped publishing (api#208). Worded apart
  // from "Offline" on purpose: every poll is succeeding, so a reader who sees
  // "Offline" and checks the source themselves would find it up and be more
  // confused, not less. This is the case poll_health cannot see at all — it
  // counts fetch failures, and there aren't any.
  if (props.readingStale)              return `Not updating · ${fmtAge(mins)}`
  if (props.pollHealth === 'stale')    return `Stale · ${fmtAge(mins)}`
  if (props.pollHealth === 'degraded') return `Updated ${fmtAge(mins)}`
  if (mins > 60) return `Updated ${fmtAge(mins)}`
  return null
})

const badgeClass = computed((): string => {
  if (props.status === 'retired')              return 'text-neutral-400 dark:text-neutral-500'
  if (props.pollHealth === 'unreachable')      return 'text-red-500 dark:text-red-400'
  if (props.pollHealth === 'stale')            return 'text-amber-500 dark:text-amber-400'
  if (props.readingStale)                      return 'text-amber-500 dark:text-amber-400'
  if (justRefreshed.value)                     return 'text-green-500 dark:text-green-400'
  return 'text-neutral-400 dark:text-neutral-500'
})

// Show for everything except explicitly retired gauges.
// Unreachable gauges especially need the ability to force a retry.
const showRefresh = computed(() => props.status !== 'retired')

async function doRefresh() {
  if (refreshing.value || justRefreshed.value) return
  refreshing.value = true
  try {
    await fetch(`${apiBase}/api/v1/gauges/${props.gaugeId}/refresh`, { method: 'POST' })
    localReadingAt.value = new Date().toISOString()
    justRefreshed.value = true
    emit('refreshed')
    setTimeout(() => { justRefreshed.value = false }, 60_000)
  } catch { /* silent */ } finally {
    refreshing.value = false
  }
}
</script>
