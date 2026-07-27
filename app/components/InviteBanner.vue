<template>
  <div
    v-if="invite"
    class="flex items-center gap-3 rounded-xl bg-gradient-to-r from-violet-500 to-primary-600 px-4 py-3 text-white shadow-sm"
  >
    <div class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
      </svg>
    </div>

    <div class="min-w-0 flex-1">
      <!-- #246 W5: headline names the RUN, not the plan (invite RSVPs are
           per-run) — e.g. "@maya invited you to run Foxton on 7/26". Falls
           back to the plan name if no run row could be resolved. -->
      <p class="text-sm font-medium truncate">
        @{{ invite.event.host_handle }} invited you to
        <template v-if="firstRun">run {{ firstRun.run_name ?? 'a run' }} on {{ fmtDate(firstRun.run_date) }}</template>
        <template v-else>{{ invite.event.name }}</template>
      </p>
      <p class="text-xs text-white/80 truncate">
        {{ invite.event.name }} · {{ fmtRange(invite.event.start_date, invite.event.end_date) }}
        <template v-if="extraCount > 0"> · +{{ extraCount }} more</template>
      </p>
    </div>

    <NuxtLink
      v-if="firstRun"
      :to="`/plan-runs/${firstRun.plan_run_id}`"
      class="shrink-0 rounded-full bg-white/20 hover:bg-white/30 px-3 py-1.5 text-xs font-semibold transition-colors"
    >View</NuxtLink>

    <button
      type="button"
      class="shrink-0 p-1 rounded-full hover:bg-white/20 transition-colors disabled:opacity-50"
      aria-label="Dismiss"
      :disabled="dismissing"
      @click="onDismiss"
    >
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useInvites, type InviteRun } from '~/composables/useInvites'
import { fmtDate, fmtRange } from '~/utils/calendarDate'

const { invites, firstPending, firstPendingRun, isPendingRun, dismiss } = useInvites()
const invite = firstPending

const firstRun = computed<InviteRun | undefined>(() => invite.value ? firstPendingRun(invite.value) : undefined)

// "+N more" — every OTHER still-pending RUN invite beyond the one named
// above (whether from this same plan or another pending invite entirely).
const extraCount = computed(() => {
  const totalPendingRuns = invites.value.reduce((n, i) => n + i.runs.filter(isPendingRun).length, 0)
  return Math.max(0, totalPendingRuns - 1)
})

const dismissing = ref(false)

async function onDismiss() {
  if (!invite.value || !firstRun.value || dismissing.value) return
  dismissing.value = true
  await dismiss(firstRun.value.member_id)
  dismissing.value = false
}
</script>
