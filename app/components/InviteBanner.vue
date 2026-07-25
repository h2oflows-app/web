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
      <p class="text-sm font-medium truncate">@{{ invite.plan.host_handle }} invited you to {{ invite.plan.name }}</p>
      <p class="text-xs text-white/80 truncate">
        {{ fmtRange(invite.plan.start_date, invite.plan.end_date) }}
        <template v-if="extraCount > 0"> · +{{ extraCount }} more</template>
      </p>
    </div>

    <NuxtLink
      :to="`/plans/${invite.plan.host_handle}/${invite.plan.slug}`"
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
import { useInvites } from '~/composables/useInvites'
import { fmtRange } from '~/utils/calendarDate'

const { invites, firstPending, dismiss } = useInvites()
const invite = firstPending

// "+N more" — every OTHER still-pending invite beyond the one shown.
const extraCount = computed(() => {
  const pendingCount = invites.value.filter(i => i.status === 'invited' && !i.dismissed_at).length
  return Math.max(0, pendingCount - 1)
})

const dismissing = ref(false)

async function onDismiss() {
  if (!invite.value || dismissing.value) return
  dismissing.value = true
  await dismiss(invite.value.member_id)
  dismissing.value = false
}
</script>
