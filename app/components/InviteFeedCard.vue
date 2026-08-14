<template>
  <div
    class="flex items-start gap-3 rounded-xl border px-4 py-3.5 transition-colors"
    :class="resolved
      ? 'border-neutral-100 dark:border-neutral-800/60 opacity-60'
      : 'border-neutral-200 dark:border-neutral-700'"
  >
    <div class="w-9 h-9 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase">
      {{ invite.run.host_handle.slice(0, 2) }}
    </div>

    <div class="min-w-0 flex-1 space-y-1">
      <div class="flex items-center gap-1.5 flex-wrap">
        <span class="text-xs text-neutral-400">{{ reltime(invite.created_at) }}</span>
      </div>

      <!-- web#354 W4: one card = one run now (invites.go MyInvites is flat)
           — no more inner per-run row loop. -->
      <p class="text-sm text-neutral-700 dark:text-neutral-300">
        <strong class="text-neutral-900 dark:text-white">{{ displayLabel(invite.run.host_display_name, invite.run.host_handle) }}</strong>
        invited you to run <strong class="text-neutral-900 dark:text-white">{{ invite.run.name }}</strong>
      </p>
      <p class="text-xs text-neutral-400">
        <template v-if="subtitleText">{{ subtitleText }} · </template>{{ fmtDate(invite.run.run_date) }}<template v-if="invite.run.run_time"> · {{ fmtTime(invite.run.run_time) }}</template>
      </p>
      <p v-if="invite.run.meetup_spot" class="flex items-center gap-1 text-xs text-neutral-400 truncate">
        <svg class="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-6.5-7-11a7 7 0 1 1 14 0c0 4.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>
        <span class="truncate">Meet: {{ invite.run.meetup_spot }}</span>
      </p>

      <div v-if="invite.run.flow_band || invite.run.gauge_cfs != null || invite.run.crew.max != null" class="flex items-center gap-2 pt-0.5 flex-wrap">
        <span
          v-if="invite.run.flow_band || invite.run.gauge_cfs != null"
          class="shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full"
          :class="colorKeyToBadgeClass(invite.run.flow_color ?? '')"
        >{{ flowBandLabel(invite.run.flow_band) }}<template v-if="invite.run.gauge_cfs != null"> · {{ Math.round(invite.run.gauge_cfs).toLocaleString() }}</template></span>
        <span v-if="invite.run.crew.max != null" class="shrink-0 text-[11px] font-medium text-neutral-400">{{ invite.run.crew.filled }}/{{ invite.run.crew.max }} crew</span>
      </div>

      <div class="pt-1">
        <span v-if="invite.status === 'accepted'" class="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>
          Accepted
        </span>
        <span v-else-if="invite.status === 'declined'" class="text-[11px] font-medium text-neutral-400">Declined</span>
        <span v-else-if="invite.dismissed_at" class="text-[11px] font-medium text-neutral-400">Dismissed</span>
        <div v-else class="flex items-center gap-1.5">
          <button
            type="button"
            class="text-[11px] font-medium px-2.5 py-1 rounded-full border border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 transition-colors"
            :disabled="busy === invite.id"
            @click="$emit('dismiss', invite.id)"
          >Dismiss</button>
          <button
            type="button"
            class="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50 transition-colors"
            :disabled="busy === invite.id"
            @click="$emit('accept', invite.id)"
          >
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>
            {{ busy === invite.id ? '…' : 'Accept' }}
          </button>
        </div>
      </div>

      <NuxtLink
        :to="`/plan-runs/${invite.run.run_id}`"
        class="inline-block text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline pt-1"
      >View run →</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Invite } from '~/composables/useInvites'
import { formatRelativeAge } from '~/utils/relativeTime'
import { fmtDate, fmtTime } from '~/utils/calendarDate'
import { flowBandLabel, colorKeyToBadgeClass } from '~/utils/flowBand'
import { displayLabel } from '~/utils/displayLabel'

const props = defineProps<{
  invite: Invite
  // The id of whichever invite is currently in flight, or null.
  busy?: string | null
}>()

defineEmits<{ accept: [string]; dismiss: [string] }>()

// Local, matching PlanRunLogSheet.vue's identical one-liner (not a shared
// util — there is no riverLine.ts module in this codebase).
function riverLine(river?: string | null, state?: string | null): string {
  return [river, state].filter(Boolean).join(' · ')
}
const riverLineText = computed(() => riverLine(props.invite.run.river_name, props.invite.run.state_abbr))

// Attached library run's own name (web#354 A4/W6) — only when it adds
// context beyond the headline's own `name` (avoid "Foxton — Foxton" dupes).
// The river line stays untouched; this just prepends the reach name to that
// same subtitle row.
const reachNameText = computed(() => {
  const run = props.invite.run
  return run.reach_name && run.reach_name !== run.name ? run.reach_name : ''
})
const subtitleText = computed(() => [reachNameText.value, riverLineText.value].filter(Boolean).join(' · '))

const resolved = computed(() => props.invite.status !== 'invited' || !!props.invite.dismissed_at)

// This one was already the most complete of the six — "Yesterday", and an
// absolute date once a day count stops being something you can picture. Its
// behaviour is preserved exactly; those two traits became the shared options.
function reltime(iso: string): string {
  return formatRelativeAge(iso, { yesterday: true, absoluteAfterDays: 7 })
}
</script>
