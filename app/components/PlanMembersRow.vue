<template>
  <div class="rounded-xl overflow-hidden" :class="planTypeMeta(planType).tintClass">
    <div class="flex items-center justify-between gap-3 px-3.5 py-3">
      <div class="flex items-center gap-2.5 min-w-0">
        <div class="flex -space-x-2 shrink-0">
          <span
            v-for="m in visibleChips"
            :key="chipKey(m)"
            class="w-6 h-6 rounded-full ring-2 ring-white dark:ring-neutral-900 bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-[10px] font-semibold text-neutral-600 dark:text-neutral-300 uppercase"
            :title="chipTitle(m)"
          >{{ (m.handle ?? m.invite_email ?? '??').slice(0, 2) }}</span>
          <span
            v-if="overflowCount > 0"
            class="w-6 h-6 rounded-full ring-2 ring-white dark:ring-neutral-900 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-[10px] font-semibold text-neutral-500 dark:text-neutral-400"
          >+{{ overflowCount }}</span>
        </div>
        <p class="text-xs text-neutral-600 dark:text-neutral-300 truncate">
          You<template v-if="anyAcceptedCount"> + {{ anyAcceptedCount }}</template><template v-if="pendingCount"> · {{ pendingCount }} invited</template>
        </p>
      </div>

      <button
        v-if="isHost"
        type="button"
        class="shrink-0 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-3 py-1 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:border-primary-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
        @click="$emit('invite')"
      >Invite</button>
    </div>

    <!-- Per-run RSVP summary — crew is run-scoped now (#246 W5), so each
         person's status is really N/M runs, not a single plan-wide status. -->
    <div v-if="members.length" class="divide-y divide-white/40 dark:divide-black/20 border-t border-white/40 dark:border-black/20">
      <div v-for="m in members" :key="chipKey(m)" class="flex items-center justify-between gap-3 px-3.5 py-2">
        <p class="text-xs text-neutral-700 dark:text-neutral-300 truncate">
          <span v-if="m.handle" class="font-medium">@{{ m.handle }}</span>
          <span v-else class="font-medium">{{ m.invite_email }}</span>
          <span class="text-neutral-400"> · {{ m.accepted_count }}/{{ m.total_count }} run{{ m.total_count === 1 ? '' : 's' }}</span>
        </p>

        <button
          v-if="isHost && !m.handle && m.invite_email"
          type="button"
          class="shrink-0 text-[11px] font-medium text-primary-600 dark:text-primary-400 hover:underline disabled:opacity-50 disabled:no-underline"
          :disabled="resendingEmail === m.invite_email"
          @click="onResend(m.invite_email)"
        >{{ resendingEmail === m.invite_email ? 'Sending…' : 'Resend email' }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { PlanMemberSummary } from '~/utils/plan'
import { planTypeMeta } from '~/utils/planType'
import { usePlans } from '~/composables/usePlans'

const props = defineProps<{
  members: PlanMemberSummary[]
  planType: string
  planId: string
  isHost: boolean
}>()

defineEmits<{ invite: [] }>()

const { resendInvite } = usePlans()

function chipKey(m: PlanMemberSummary): string {
  return m.handle ?? m.invite_email ?? Math.random().toString(36)
}

function chipTitle(m: PlanMemberSummary): string {
  const who = m.handle ? `@${m.handle}` : m.invite_email ?? ''
  return `${who} · ${m.accepted_count}/${m.total_count} runs`
}

const anyAcceptedMembers = computed(() => props.members.filter(m => m.accepted_count > 0))
const anyAcceptedCount = computed(() => anyAcceptedMembers.value.length)
// "Invited" here = has at least one run still awaiting a response (not yet
// accepted on any invited run).
const pendingCount = computed(() => props.members.filter(m => m.accepted_count < m.total_count).length)

const visibleChips = computed(() => props.members.slice(0, 4))
const overflowCount = computed(() => Math.max(0, props.members.length - visibleChips.value.length))

const resendingEmail = ref<string | null>(null)

async function onResend(email: string) {
  if (resendingEmail.value) return
  resendingEmail.value = email
  await resendInvite(props.planId, email)
  resendingEmail.value = null
}
</script>
