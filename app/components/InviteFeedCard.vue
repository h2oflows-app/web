<template>
  <div
    class="flex items-start gap-3 rounded-xl border px-4 py-3.5 transition-colors"
    :class="isDismissed
      ? 'border-neutral-100 dark:border-neutral-800/60 opacity-60'
      : 'border-neutral-200 dark:border-neutral-700'"
  >
    <div class="w-9 h-9 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase">
      {{ invite.plan.host_handle.slice(0, 2) }}
    </div>

    <div class="min-w-0 flex-1 space-y-1">
      <div class="flex items-center gap-1.5 flex-wrap">
        <PlanTypeBadge :type="invite.plan.type" />
        <span class="text-xs text-neutral-400">{{ reltime(invite.created_at) }}</span>
      </div>
      <p class="text-sm text-neutral-700 dark:text-neutral-300">
        <strong class="text-neutral-900 dark:text-white">@{{ invite.plan.host_handle }}</strong>
        invited you to <strong class="text-neutral-900 dark:text-white">{{ invite.plan.name }}</strong>
      </p>
      <p class="text-xs text-neutral-400">
        {{ fmtRange(invite.plan.start_date, invite.plan.end_date) }}<template v-if="invite.plan.location"> · {{ invite.plan.location }}</template>
      </p>

      <span
        v-if="invite.status === 'accepted'"
        class="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-1"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>
        Accepted
      </span>
      <span v-else-if="invite.status === 'declined'" class="inline-block text-xs font-medium text-neutral-400 mt-1">Declined</span>
      <span v-else-if="isDismissed" class="inline-block text-xs font-medium text-neutral-400 mt-1">Dismissed</span>

      <div v-if="invite.status === 'invited' && !isDismissed" class="flex items-center gap-2 pt-1.5">
        <button
          type="button"
          class="text-xs font-medium px-3 py-1.5 rounded-full border border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 transition-colors"
          :disabled="busy"
          @click="$emit('dismiss', invite.member_id)"
        >Dismiss</button>
        <button
          type="button"
          class="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50 transition-colors"
          :disabled="busy"
          @click="$emit('accept', invite.member_id)"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>
          {{ busy ? '…' : 'Accept' }}
        </button>
      </div>
      <NuxtLink
        v-else
        :to="`/plans/${invite.plan.host_handle}/${invite.plan.slug}`"
        class="inline-block text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline pt-1"
      >View plan →</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Invite } from '~/composables/useInvites'
import { fmtRange } from '~/utils/calendarDate'

const props = defineProps<{
  invite: Invite
  busy?: boolean
}>()

defineEmits<{ accept: [string]; dismiss: [string] }>()

const isDismissed = computed(() => !!props.invite.dismissed_at)

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
