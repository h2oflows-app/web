<template>
  <div class="flex items-center justify-between gap-3 rounded-xl px-3.5 py-3" :class="planTypeMeta(planType).tintClass">
    <div class="flex items-center gap-2.5 min-w-0">
      <div class="flex -space-x-2 shrink-0">
        <span
          v-for="m in visibleChips"
          :key="m.handle"
          class="w-6 h-6 rounded-full ring-2 ring-white dark:ring-neutral-900 bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-[10px] font-semibold text-neutral-600 dark:text-neutral-300 uppercase"
          :title="`@${m.handle}`"
        >{{ m.handle.slice(0, 2) }}</span>
        <span
          v-if="overflowCount > 0"
          class="w-6 h-6 rounded-full ring-2 ring-white dark:ring-neutral-900 bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-[10px] font-semibold text-neutral-500 dark:text-neutral-400"
        >+{{ overflowCount }}</span>
      </div>
      <p class="text-xs text-neutral-600 dark:text-neutral-300 truncate">
        You<template v-if="acceptedCount"> + {{ acceptedCount }} accepted</template><template v-if="invitedCount"> · {{ invitedCount }} invited</template>
      </p>
    </div>

    <button
      v-if="isHost"
      type="button"
      class="shrink-0 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-3 py-1 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:border-primary-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
      @click="$emit('invite')"
    >Invite</button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PlanMember } from '~/utils/plan'
import { planTypeMeta } from '~/utils/planType'

const props = defineProps<{
  members: PlanMember[]
  planType: string
  isHost: boolean
}>()

defineEmits<{ invite: [] }>()

const acceptedMembers = computed(() => props.members.filter(m => m.status === 'accepted'))
const acceptedCount = computed(() => acceptedMembers.value.length)
const invitedCount = computed(() => props.members.filter(m => m.status === 'invited').length)

const visibleChips = computed(() => acceptedMembers.value.slice(0, 4))
const overflowCount = computed(() => Math.max(0, acceptedMembers.value.length - visibleChips.value.length))
</script>
