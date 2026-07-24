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
          @{{ plan.host_handle }} invited you to <strong>{{ plan.name }}</strong>
        </p>
        <p class="text-xs text-neutral-400 mt-0.5">{{ fmtRange(plan.start_date, plan.end_date) }}<template v-if="plan.location"> · {{ plan.location }}</template></p>
      </div>
    </div>

    <div v-if="!isAuthenticated" class="flex items-center gap-2">
      <NuxtLink :to="`/login?redirect=${encodeURIComponent(route.fullPath)}`" class="flex-1 text-center py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-colors">
        Sign in to accept
      </NuxtLink>
    </div>
    <div v-else class="flex items-center gap-2">
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
import type { PlanDetail } from '~/utils/plan'
import { fmtRange } from '~/utils/calendarDate'
import { useInvites } from '~/composables/useInvites'

const props = defineProps<{
  plan: PlanDetail
  memberId: string
}>()

const emit = defineEmits<{ accepted: []; dismissed: [] }>()

const { isAuthenticated } = useAuth()
const route = useRoute()
const { accept, dismiss } = useInvites()

const busy = ref(false)

async function onAccept() {
  if (busy.value) return
  busy.value = true
  const ok = await accept(props.memberId)
  busy.value = false
  if (ok) emit('accepted')
}

async function onDismiss() {
  if (busy.value) return
  busy.value = true
  const ok = await dismiss(props.memberId)
  busy.value = false
  if (ok) emit('dismissed')
}
</script>
