<template>
  <div class="rounded-xl border border-violet-200 dark:border-violet-900/50 bg-violet-50/60 dark:bg-violet-950/20 px-4 py-3.5 space-y-3">
    <div class="flex items-start gap-3">
      <div class="w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center shrink-0">
        <svg class="w-4.5 h-4.5 text-violet-600 dark:text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
        </svg>
      </div>
      <div class="min-w-0">
        <p class="text-sm font-medium text-neutral-800 dark:text-neutral-100">
          You're invited to run <strong>{{ run.name }}</strong>
        </p>
        <!-- Attached library run's own name (web#354 A4/W6) — secondary
             only, and only when it differs from the calendar run's own name
             (avoid "Foxton — Foxton" dupes). -->
        <p v-if="run.reach_name && run.reach_name !== run.name" class="text-xs text-neutral-400 mt-0.5">{{ run.reach_name }}</p>
        <p class="text-xs text-neutral-400 mt-0.5">
          {{ fmtDate(run.run_date) }}<template v-if="run.run_time"> · {{ fmtTime(run.run_time) }}</template>
        </p>
      </div>
    </div>

    <div v-if="!isAuthenticated" class="flex items-center gap-2">
      <NuxtLink :to="`/login?redirect=${encodeURIComponent(route.fullPath)}`" class="flex-1 text-center py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-colors">
        Sign in to accept
      </NuxtLink>
    </div>

    <div v-else-if="resolved" class="text-xs font-medium" :class="resolved === 'accepted' ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-400'">
      {{ resolved === 'accepted' ? 'Accepted' : 'Dismissed' }}
    </div>

    <!-- Authenticated + bound to this account (run.my_member_id) — see the
         gating note below for why an unbound token holder never reaches
         this branch. -->
    <div v-else-if="run.my_rsvp === 'invited' && run.my_member_id" class="flex items-center gap-2">
      <button
        type="button"
        class="flex-1 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-800 disabled:opacity-50 transition-colors"
        :disabled="busy"
        @click="onDismiss"
      >Dismiss</button>
      <button
        type="button"
        class="flex-1 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
        :disabled="busy"
        @click="onAccept"
      >{{ busy ? '…' : 'Accept' }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { PlanRunDetail } from '~/utils/planRun'
import { fmtDate, fmtTime } from '~/utils/calendarDate'
import { useInvites } from '~/composables/useInvites'

// InviteAcceptCard — run-scoped rewrite (web#354 W4; was the #246 W5/A1
// grouped-plan version, which took a `plan` + `runs: PlanInviteTokenRun[]`
// pair — both gone with the event/invite model split (PlanInviteTokenRun
// itself was already dropped from utils/plan.ts by W2, leaving this file's
// import dangling until now). Invites live on run_invites keyed by run_id
// only (A2) — this card renders against a SINGLE run's own
// GET /plan-runs/{id} response, the same PlanRunDetail shape
// PlanRunDetailCard consumes, so the run page (plan-runs/[id].vue) needs no
// second fetch to drive it.
//
// Accept/Dismiss are gated on run.my_member_id (populated by
// renderPlanRun's `me` LATERAL — a real ownerID or JWT-email match against
// the invite row), NOT on the raw ?invite= token: the api's
// AcceptInvite/DismissInvite endpoints still need a run_invites row id to
// target, and the current api (plan_runs.go runInviteTokenGrant) only ever
// surfaces a boolean grant for a token match, never the row id, for an
// anonymous or unbound-email caller. So an anon viewer (or a signed-in
// account whose email doesn't match the invite) only ever sees the sign-in
// prompt above / nothing at all — never a broken Accept button with no id
// behind it. `token` is still threaded through to accept() as a defensive
// fallback match once my_member_id IS present, mirroring AcceptInvite's own
// three-way allowed check (member_owner_id / email / token).
const props = defineProps<{
  run: PlanRunDetail
  // ?invite=<token> from the email link, when present.
  token?: string
}>()

const emit = defineEmits<{ resolved: [] }>()

const { isAuthenticated } = useAuth()
const route = useRoute()
const { accept, dismiss } = useInvites()

const busy = ref(false)
const resolved = ref<'accepted' | 'dismissed' | null>(null)

async function onAccept() {
  if (busy.value || !props.run.my_member_id) return
  busy.value = true
  const ok = await accept(props.run.my_member_id, props.token)
  busy.value = false
  if (ok) {
    resolved.value = 'accepted'
    emit('resolved')
  }
}

async function onDismiss() {
  if (busy.value || !props.run.my_member_id) return
  busy.value = true
  const ok = await dismiss(props.run.my_member_id)
  busy.value = false
  if (ok) {
    resolved.value = 'dismissed'
    emit('resolved')
  }
}
</script>
