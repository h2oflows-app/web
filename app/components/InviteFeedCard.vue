<template>
  <div
    class="flex items-start gap-3 rounded-xl border px-4 py-3.5 transition-colors"
    :class="allResolved
      ? 'border-neutral-100 dark:border-neutral-800/60 opacity-60'
      : 'border-neutral-200 dark:border-neutral-700'"
  >
    <div class="w-9 h-9 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase">
      {{ invite.event.host_handle.slice(0, 2) }}
    </div>

    <div class="min-w-0 flex-1 space-y-1">
      <div class="flex items-center gap-1.5 flex-wrap">
        <span class="text-xs text-neutral-400">{{ reltime(invite.created_at) }}</span>
      </div>
      <p class="text-sm text-neutral-700 dark:text-neutral-300">
        <strong class="text-neutral-900 dark:text-white">@{{ invite.event.host_handle }}</strong>
        invited you to <strong class="text-neutral-900 dark:text-white">{{ invite.event.name }}</strong>
        <template v-if="invite.runs.length > 1"> · {{ invite.runs.length }} runs</template>
      </p>
      <p class="text-xs text-neutral-400">
        {{ fmtRange(invite.event.start_date, invite.event.end_date) }}<template v-if="invite.event.location"> · {{ invite.event.location }}</template>
      </p>

      <!-- #246 W5: one row per invited RUN, each with its own accept
           button — RSVPs are per-run now, not per-plan. -->
      <div class="space-y-1.5 pt-1">
        <div v-for="r in invite.runs" :key="r.member_id" class="flex items-center justify-between gap-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/40 px-2.5 py-1.5">
          <div class="min-w-0">
            <p class="text-xs font-medium text-neutral-700 dark:text-neutral-300 truncate">
              {{ r.run_name ?? 'Untitled run' }}
              <span class="text-neutral-400 font-normal">· {{ fmtDate(r.run_date) }}<template v-if="r.run_time"> · {{ fmtTime(r.run_time) }}</template></span>
            </p>
          </div>

          <span v-if="r.status === 'accepted'" class="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>
            Accepted
          </span>
          <span v-else-if="r.status === 'declined'" class="shrink-0 text-[11px] font-medium text-neutral-400">Declined</span>
          <span v-else-if="r.dismissed_at" class="shrink-0 text-[11px] font-medium text-neutral-400">Dismissed</span>
          <div v-else class="shrink-0 flex items-center gap-1.5">
            <button
              type="button"
              class="text-[11px] font-medium px-2.5 py-1 rounded-full border border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 transition-colors"
              :disabled="busy === r.member_id"
              @click="$emit('dismiss', r.member_id)"
            >Dismiss</button>
            <button
              type="button"
              class="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50 transition-colors"
              :disabled="busy === r.member_id"
              @click="$emit('accept', r.member_id)"
            >
              <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>
              {{ busy === r.member_id ? '…' : 'Accept' }}
            </button>
          </div>
        </div>
      </div>

      <NuxtLink
        :to="`/plans/${invite.event.host_handle}/${invite.event.slug}`"
        class="inline-block text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline pt-1"
      >View plan →</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Invite } from '~/composables/useInvites'
import { fmtDate, fmtRange, fmtTime } from '~/utils/calendarDate'

const props = defineProps<{
  invite: Invite
  // The member_id of whichever run-row is currently in flight, or null.
  busy?: string | null
}>()

defineEmits<{ accept: [string]; dismiss: [string] }>()

const allResolved = computed(() => props.invite.runs.every(r => r.status !== 'invited' || !!r.dismissed_at))

function reltime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
</script>
