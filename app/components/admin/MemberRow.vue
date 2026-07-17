<template>
  <div class="flex items-center gap-3 py-2">
    <span class="shrink-0 w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">
      {{ userInitials(member.display_name, member.handle) }}
    </span>
    <div class="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
      <span class="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">{{ userLabel(member.display_name, member.handle) }}</span>
      <span class="text-xs text-neutral-400 font-mono truncate">@{{ member.handle }}</span>
      <span v-if="isMe" class="text-[10px] font-semibold rounded-full px-1.5 py-0.5 bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-400">You</span>
      <span v-if="member.is_bot" class="text-[10px] font-semibold rounded-full px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-500">service</span>
    </div>
    <button class="shrink-0 text-xs text-red-400 hover:text-red-600 transition-colors px-2 py-1 rounded min-h-9" @click="$emit('remove', member.user_id)">Remove</button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { userInitials, userLabel, type RoleMember } from '~/composables/useAdminUsersRoles'

const props = defineProps<{ member: RoleMember }>()
defineEmits<{ remove: [userId: string] }>()

const { user } = useAuth()
const isMe = computed(() => props.member.user_id === (user.value?.id ?? null))

</script>
