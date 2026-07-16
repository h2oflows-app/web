<template>
  <div class="space-y-4">
    <div v-if="!du" class="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-8 text-center text-sm text-neutral-400">
      Loading user…
    </div>

    <template v-else>
      <!-- Profile -->
      <div class="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4">
        <div class="flex items-center gap-3">
          <span class="shrink-0 w-11 h-11 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-sm font-semibold text-neutral-600 dark:text-neutral-300">
            {{ initials(du.display_name) }}
          </span>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <h2 class="text-lg font-bold text-neutral-900 dark:text-white truncate">{{ du.display_name }}</h2>
              <span v-if="du.is_special" class="shrink-0 text-[10px] font-semibold rounded-full px-2 py-0.5 bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-400">Special account</span>
            </div>
            <p class="text-xs text-neutral-400 mt-0.5">
              <span class="font-mono">@{{ du.handle }}</span>
              <span class="mx-1">·</span>Created {{ createdLabel }}
            </p>
          </div>
        </div>
      </div>

      <!-- Stat: run count -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3">
          <p class="text-[10px] font-medium uppercase tracking-wide text-neutral-400">Runs</p>
          <p class="text-xl font-bold text-neutral-900 dark:text-white tabular-nums">{{ du.run_count }}</p>
        </div>
        <div class="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3">
          <p class="text-[10px] font-medium uppercase tracking-wide text-neutral-400">API this hr</p>
          <p class="text-xl font-bold text-neutral-900 dark:text-white tabular-nums">{{ du.usage_hour }}</p>
        </div>
        <div class="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3">
          <p class="text-[10px] font-medium uppercase tracking-wide text-neutral-400">Roles</p>
          <p class="text-xl font-bold text-neutral-900 dark:text-white tabular-nums">{{ du.roles.length }}</p>
        </div>
      </div>

      <!-- Roles — inline toggle pill row (add/remove membership) -->
      <div class="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4">
        <h3 class="text-sm font-semibold text-neutral-800 dark:text-neutral-100 mb-1">Roles</h3>
        <p class="text-xs text-neutral-400 mb-3">Click a role to grant or revoke membership. Joining a special account's role grants edit access to that account's runs.</p>
        <div v-if="allRoles.length === 0" class="text-xs text-neutral-400">No roles defined yet.</div>
        <div v-else class="flex flex-wrap gap-2">
          <button
            v-for="r in allRoles" :key="r.name"
            class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-colors min-h-9 disabled:opacity-50"
            :class="hasRole(r.name)
              ? 'bg-primary-50 dark:bg-primary-950 border-primary-300 dark:border-primary-700 text-primary-600 dark:text-primary-400'
              : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-primary-300 hover:text-primary-600 dark:hover:text-primary-400'"
            :disabled="togglingRole === r.name"
            @click="toggleRole(r.name)"
          >
            <svg v-if="hasRole(r.name)" class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
            <span :class="r.system ? '' : 'font-mono'">{{ r.system ? roleLabel(r.name).title : r.name }}</span>
          </button>
        </div>
      </div>

      <!-- Bulk API access -->
      <BulkApiPanel :owner-id="du.owner_id" :is-special="du.is_special" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAdminUsersRoles, roleLabel } from '~/composables/useAdminUsersRoles'

const props = defineProps<{ ownerId: string }>()

const { roles, selectedDirectoryUser, addRoleMember, removeRoleMember, patchSelectedDirectoryUser } = useAdminUsersRoles()
const toast = useToast()

const du = computed(() => selectedDirectoryUser.value?.owner_id === props.ownerId ? selectedDirectoryUser.value : null)
const allRoles = computed(() => roles.value)

const createdLabel = computed(() => {
  if (!du.value) return '—'
  try {
    return new Date(du.value.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  } catch { return '—' }
})

function hasRole(name: string): boolean {
  return du.value?.roles.includes(name) ?? false
}

function initials(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

const togglingRole = ref<string | null>(null)
async function toggleRole(name: string) {
  if (!du.value) return
  togglingRole.value = name
  const currentlyMember = hasRole(name)
  try {
    const ok = currentlyMember
      ? await removeRoleMember(name, du.value.owner_id)
      : await addRoleMember(name, du.value.owner_id)
    if (ok) {
      const nextRoles = currentlyMember
        ? du.value.roles.filter(r => r !== name)
        : [...du.value.roles, name]
      patchSelectedDirectoryUser({ roles: nextRoles })
    } else {
      toast.add({ title: 'Failed to update role', color: 'error', duration: 4000 })
    }
  } finally {
    togglingRole.value = null
  }
}
</script>
