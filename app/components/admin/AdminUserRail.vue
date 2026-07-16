<template>
  <div class="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden flex flex-col max-h-[calc(100vh-14rem)] md:max-h-[75vh]">
    <div class="p-3 border-b border-neutral-100 dark:border-neutral-800">
      <UInput
        v-model="query"
        icon="i-heroicons-magnifying-glass"
        placeholder="Search users & roles…"
        size="sm"
        class="w-full"
        @input="onQueryInput"
      />
    </div>

    <div class="overflow-y-auto flex-1 divide-y divide-neutral-100 dark:divide-neutral-800">
      <!-- ROLES -->
      <div v-if="filteredRoles.length" class="p-2">
        <p class="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Roles</p>
        <button
          v-for="r in filteredRoles" :key="r.name"
          class="w-full flex items-center gap-3 px-2 py-2 rounded-md text-left transition-colors min-h-11"
          :class="isSelected('role', r.name) ? 'bg-primary-50 dark:bg-primary-950/50 ring-1 ring-primary-300 dark:ring-primary-700' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/60'"
          @click="select({ kind: 'role', name: r.name })"
        >
          <span class="shrink-0 w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 dark:text-neutral-400">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </span>
          <span class="flex-1 min-w-0">
            <span class="block text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">{{ roleLabel(r.name).title }}</span>
            <span class="block text-xs text-neutral-400 truncate">Platform access</span>
          </span>
          <span class="shrink-0 text-xs font-medium rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 px-2 py-0.5">{{ r.members.length }}</span>
        </button>
      </div>

      <!-- SPECIAL USERS -->
      <div class="p-2">
        <div class="flex items-center justify-between px-2 pb-1">
          <p class="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Special users</p>
          <button class="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline" @click="$emit('new-special-user')">+ New</button>
        </div>
        <div v-if="specialUsersLoading && specialUsers.length === 0" class="space-y-1.5 px-2 py-1">
          <div v-for="i in 2" :key="i" class="h-10 rounded-md bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
        </div>
        <p v-else-if="filteredSpecialUsers.length === 0" class="px-2 py-2 text-xs text-neutral-400">No special users match.</p>
        <button
          v-for="su in filteredSpecialUsers" :key="su.id"
          class="w-full flex items-center gap-3 px-2 py-2 rounded-md text-left transition-colors min-h-11"
          :class="isSelected('special', su.id) ? 'bg-primary-50 dark:bg-primary-950/50 ring-1 ring-primary-300 dark:ring-primary-700' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/60'"
          @click="select({ kind: 'special', id: su.id })"
        >
          <span class="shrink-0 w-8 h-8 rounded-full bg-primary-50 dark:bg-primary-950 flex items-center justify-center text-primary-500 dark:text-primary-400">
            <svg v-if="su.handle === 'h2oflows'" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12c2-4 4-6 6-6s4 6 6 6 4-6 6-6" stroke-linecap="round"/></svg>
            <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M4 21V7l8-4 8 4v14M9 21v-6h6v6M4 21h16"/></svg>
          </span>
          <span class="flex-1 min-w-0">
            <span class="block text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">{{ su.display_name }}</span>
            <span class="block text-xs text-neutral-400 truncate">{{ su.run_count }} runs · {{ su.member_count }} members</span>
          </span>
          <span
            class="shrink-0 text-[10px] font-semibold rounded-full px-2 py-0.5"
            :class="su.public_on_map
              ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'"
          >{{ su.public_on_map ? 'Public' : 'Private' }}</span>
        </button>
      </div>

      <!-- ALL USERS -->
      <div class="p-2">
        <p class="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">All users</p>
        <div v-if="directoryLoading" class="space-y-1.5 px-2 py-1">
          <div v-for="i in 3" :key="i" class="h-10 rounded-md bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
        </div>
        <p v-else-if="directoryUsers.length === 0" class="px-2 py-2 text-xs text-neutral-400">No users match.</p>
        <button
          v-for="du in directoryUsers" :key="du.owner_id"
          class="w-full flex items-center gap-3 px-2 py-2 rounded-md text-left transition-colors min-h-11"
          :class="isSelected('user', du.owner_id) ? 'bg-primary-50 dark:bg-primary-950/50 ring-1 ring-primary-300 dark:ring-primary-700' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/60'"
          @click="selectDirectory(du)"
        >
          <span class="shrink-0 w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">
            {{ initials(du.display_name) }}
          </span>
          <span class="flex-1 min-w-0">
            <span class="block text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">{{ du.display_name }}</span>
            <span class="block text-xs text-neutral-400 font-mono truncate">@{{ du.handle }}</span>
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAdminUsersRoles, roleLabel, type AdminSelection, type DirectoryUser } from '~/composables/useAdminUsersRoles'

const selection = defineModel<AdminSelection | null>('selection', { default: null })
const emit = defineEmits<{ 'new-special-user': [] }>()

const {
  roles, specialUsers, specialUsersLoading,
  directoryUsers, directoryLoading,
  searchDirectory, selectDirectoryUser,
} = useAdminUsersRoles()

const query = ref('')

const filteredRoles = computed(() => {
  const systemRoles = roles.value.filter(r => r.system)
  const q = query.value.trim().toLowerCase()
  if (!q) return systemRoles
  return systemRoles.filter(r => roleLabel(r.name).title.toLowerCase().includes(q) || r.name.toLowerCase().includes(q))
})

const filteredSpecialUsers = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return specialUsers.value
  return specialUsers.value.filter(su => su.display_name.toLowerCase().includes(q) || su.handle.toLowerCase().includes(q))
})

function isSelected(kind: AdminSelection['kind'], id: string): boolean {
  if (!selection.value || selection.value.kind !== kind) return false
  if (kind === 'role') return selection.value.kind === 'role' && selection.value.name === id
  if (kind === 'special') return selection.value.kind === 'special' && selection.value.id === id
  return selection.value.kind === 'user' && selection.value.ownerId === id
}

function select(sel: AdminSelection) {
  selection.value = sel
}

function selectDirectory(du: DirectoryUser) {
  selectDirectoryUser(du)
  select({ kind: 'user', ownerId: du.owner_id })
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

let searchTimer: ReturnType<typeof setTimeout> | null = null
function onQueryInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => searchDirectory(query.value.trim()), 300)
}

onMounted(() => {
  if (directoryUsers.value.length === 0) searchDirectory('')
})
</script>
