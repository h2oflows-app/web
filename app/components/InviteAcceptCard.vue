<template>
  <div class="rounded-xl border border-violet-200 dark:border-violet-900/50 bg-violet-50/60 dark:bg-violet-950/20 px-4 py-3.5 space-y-3">
    <div class="flex items-start gap-3">
      <div class="w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center shrink-0">
        <svg class="w-4.5 h-4.5 text-violet-600 dark:text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
        </svg>
      </div>
      <div class="min-w-0">
        <!-- #246 W5: RSVPs are per-run — name the run(s), not just the plan. -->
        <p class="text-sm font-medium text-neutral-800 dark:text-neutral-100">
          @{{ plan.host_handle }} invited you to
          <strong v-if="soleRun">run {{ soleRun.run_name ?? 'a run' }}</strong>
          <strong v-else>{{ runs.length }} runs on {{ plan.name }}</strong>
        </p>
        <p class="text-xs text-neutral-400 mt-0.5">{{ fmtRange(plan.start_date, plan.end_date) }}<template v-if="plan.location"> · {{ plan.location }}</template></p>
      </div>
    </div>

    <div v-if="!isAuthenticated" class="flex items-center gap-2">
      <NuxtLink :to="`/login?redirect=${encodeURIComponent(route.fullPath)}`" class="flex-1 text-center py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-colors">
        Sign in to accept
      </NuxtLink>
    </div>

    <!-- Authenticated: one accept/decline row per invited run. -->
    <div v-else class="space-y-1.5">
      <div v-for="r in runs" :key="r.member_id" class="flex items-center justify-between gap-2 rounded-lg bg-white/60 dark:bg-neutral-900/40 px-2.5 py-1.5">
        <p class="text-xs font-medium text-neutral-700 dark:text-neutral-300 truncate min-w-0">
          {{ r.run_name ?? 'Untitled run' }}
          <span class="text-neutral-400 font-normal">· {{ fmtDate(r.run_date) }}<template v-if="r.run_time"> · {{ fmtTime(r.run_time) }}</template></span>
        </p>

        <span v-if="resolved[r.member_id] === 'accepted'" class="shrink-0 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Accepted</span>
        <span v-else-if="resolved[r.member_id] === 'dismissed'" class="shrink-0 text-[11px] font-medium text-neutral-400">Dismissed</span>
        <div v-else class="shrink-0 flex items-center gap-1.5">
          <button
            type="button"
            class="py-1 px-2.5 rounded-full border border-neutral-200 dark:border-neutral-700 text-[11px] font-medium text-neutral-600 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-800 disabled:opacity-50 transition-colors"
            :disabled="busy === r.member_id"
            @click="onDismiss(r)"
          >Dismiss</button>
          <button
            type="button"
            class="py-1 px-2.5 rounded-full bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-semibold disabled:opacity-50 transition-colors"
            :disabled="busy === r.member_id"
            @click="onAccept(r)"
          >{{ busy === r.member_id ? '…' : 'Accept' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CalendarEventDetail, PlanInviteTokenRun } from '~/utils/plan'
import { fmtDate, fmtRange, fmtTime } from '~/utils/calendarDate'
import { useInvites } from '~/composables/useInvites'

const props = defineProps<{
  plan: CalendarEventDetail
  runs: PlanInviteTokenRun[]
  // ?invite=<token> from the email link, when present — threaded through to
  // accept() so a signed-up-with-a-different-email invitee (member_owner_id
  // still NULL on these rows) can still accept (review finding, #246 W4;
  // per-run rows, #246 W5).
  token?: string
}>()

const emit = defineEmits<{ resolved: [] }>()

const { isAuthenticated } = useAuth()
const route = useRoute()
const { accept, dismiss } = useInvites()

const busy = ref<string | null>(null)
const resolved = ref<Record<string, 'accepted' | 'dismissed'>>({})
const soleRun = computed(() => (props.runs.length === 1 ? props.runs[0] : null))

async function onAccept(r: PlanInviteTokenRun) {
  if (busy.value) return
  busy.value = r.member_id
  const ok = await accept(r.member_id, props.token)
  busy.value = null
  if (ok) {
    resolved.value = { ...resolved.value, [r.member_id]: 'accepted' }
    emit('resolved')
  }
}

async function onDismiss(r: PlanInviteTokenRun) {
  if (busy.value) return
  busy.value = r.member_id
  const ok = await dismiss(r.member_id)
  busy.value = null
  if (ok) {
    resolved.value = { ...resolved.value, [r.member_id]: 'dismissed' }
    emit('resolved')
  }
}
</script>
