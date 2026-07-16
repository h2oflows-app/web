<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4">
      <div class="flex items-center gap-3">
        <span class="shrink-0 w-11 h-11 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 dark:text-neutral-400">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </span>
        <div class="min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <h2 class="text-lg font-bold text-neutral-900 dark:text-white truncate">{{ label.title }}</h2>
            <span class="shrink-0 text-[10px] font-semibold rounded-full px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-500">System role</span>
          </div>
          <p class="text-xs text-neutral-400 font-mono mt-0.5">@{{ label.handle }}</p>
        </div>
      </div>
    </div>

    <!-- Callout (verbatim per #314 permissions change) -->
    <div class="rounded-lg border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-950/40 p-4 text-sm text-primary-800 dark:text-primary-200">
      Members can open this admin panel — managing users &amp; roles, gauges, and moderation.
      <strong>Admins are not automatically granted edit access to special-account runs</strong> (e.g. <span class="font-mono">@h2oflows</span>).
      To edit an account's runs, join that account's role.
    </div>

    <!-- Members -->
    <div class="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Members</h3>
        <UButton size="xs" icon="i-heroicons-plus" @click="$emit('add-member', role.name, memberIds)">Add member</UButton>
      </div>

      <div v-if="role.members.length === 0" class="px-3 py-6 text-center text-xs text-neutral-400 rounded-md bg-neutral-50 dark:bg-neutral-800/40">
        No members yet.
      </div>
      <div v-else class="divide-y divide-neutral-100 dark:divide-neutral-800">
        <MemberRow v-for="m in role.members" :key="m.user_id" :member="m" @remove="removeMember" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAdminUsersRoles, roleLabel, type Role } from '~/composables/useAdminUsersRoles'

const props = defineProps<{ role: Role }>()
defineEmits<{ 'add-member': [roleName: string, excludeIds: string[]] }>()

const { removeRoleMember } = useAdminUsersRoles()
const toast = useToast()

const label = computed(() => roleLabel(props.role.name))
const memberIds = computed(() => props.role.members.map(m => m.user_id))

async function removeMember(userId: string) {
  if (import.meta.client && !confirm('Remove this member from the role?')) return
  const ok = await removeRoleMember(props.role.name, userId)
  toast.add({ title: ok ? 'Member removed' : 'Failed to remove member', color: ok ? 'success' : 'error', duration: 3000 })
}
</script>
