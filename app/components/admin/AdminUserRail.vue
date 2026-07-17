<template>
  <div class="space-y-4">
    <!-- Load failure — a 404/network error must not read as "no users" -->
    <div
      v-if="loadError"
      class="rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-xs text-amber-700 dark:text-amber-300"
    >
      {{ loadError }}
    </div>

    <!-- ROLES -->
    <div class="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden">
      <p class="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Roles</p>
      <div class="p-2 pt-0">
        <button
          v-for="r in systemRoles" :key="r.name"
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
        <p v-if="systemRoles.length === 0" class="px-2 py-2 text-xs text-neutral-400">No roles loaded.</p>
      </div>
    </div>

    <!-- SPECIAL USERS -->
    <div class="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden">
      <div class="flex items-center justify-between px-4 pt-3 pb-1">
        <p class="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Special users</p>
        <button class="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline" @click="$emit('new-special-user')">+ New</button>
      </div>
      <div class="p-2 pt-0">
        <div v-if="specialUsersLoading && specialUsers.length === 0" class="space-y-1.5 px-2 py-1">
          <div v-for="i in 2" :key="i" class="h-10 rounded-md bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
        </div>
        <p v-else-if="specialUsers.length === 0" class="px-2 py-2 text-xs text-neutral-400">No special users yet.</p>
        <button
          v-for="su in specialUsers" :key="su.id"
          class="w-full flex items-center gap-3 px-2 py-2 rounded-md text-left transition-colors min-h-11"
          :class="isSelected('special', su.id) ? 'bg-primary-50 dark:bg-primary-950/50 ring-1 ring-primary-300 dark:ring-primary-700' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/60'"
          @click="select({ kind: 'special', id: su.id })"
        >
          <span class="shrink-0 w-8 h-8 rounded-full bg-primary-50 dark:bg-primary-950 flex items-center justify-center text-primary-500 dark:text-primary-400">
            <svg v-if="su.handle === 'h2oflows'" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12c2-4 4-6 6-6s4 6 6 6 4-6 6-6" stroke-linecap="round"/></svg>
            <svg v-else class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M4 21V7l8-4 8 4v14M9 21v-6h6v6M4 21h16"/></svg>
          </span>
          <span class="flex-1 min-w-0">
            <span class="block text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">{{ userLabel(su.display_name, su.handle) }}</span>
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
    </div>

    <!-- ALL USERS — server-searched + paginated (directory excludes special users) -->
    <div class="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden">
      <p class="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">All users</p>
      <div class="px-3 pb-2">
        <UInput
          v-model="query"
          icon="i-heroicons-magnifying-glass"
          placeholder="Search users…"
          size="sm"
          class="w-full"
          @input="onQueryInput"
        />
      </div>
      <div class="p-2 pt-0 max-h-96 overflow-y-auto">
        <div v-if="directoryLoading" class="space-y-1.5 px-2 py-1">
          <div v-for="i in 3" :key="i" class="h-10 rounded-md bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
        </div>
        <p v-else-if="directoryUsers.length === 0" class="px-2 py-2 text-xs text-neutral-400">
          {{ query ? 'No users match.' : 'No users.' }}
        </p>
        <button
          v-for="du in directoryUsers" :key="du.owner_id"
          class="w-full flex items-center gap-3 px-2 py-2 rounded-md text-left transition-colors min-h-11"
          :class="isSelected('user', du.owner_id) ? 'bg-primary-50 dark:bg-primary-950/50 ring-1 ring-primary-300 dark:ring-primary-700' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/60'"
          @click="selectDirectory(du)"
        >
          <span class="shrink-0 w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">
            {{ userInitials(du.display_name, du.handle) }}
          </span>
          <span class="flex-1 min-w-0">
            <span class="block text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">{{ userLabel(du.display_name, du.handle) }}</span>
            <span class="block text-xs text-neutral-400 font-mono truncate">@{{ du.handle }}</span>
          </span>
        </button>
      </div>
      <!-- Pagination — Prev/Next on the server-side limit/offset; a full page implies more -->
      <div
        v-if="page > 0 || hasMore"
        class="flex items-center justify-between px-3 py-2 border-t border-neutral-100 dark:border-neutral-800"
      >
        <UButton size="xs" variant="ghost" color="neutral" icon="i-heroicons-chevron-left" :disabled="page === 0 || directoryLoading" @click="prevPage">Prev</UButton>
        <span class="text-[11px] text-neutral-400 tabular-nums">Page {{ page + 1 }}</span>
        <UButton size="xs" variant="ghost" color="neutral" trailing-icon="i-heroicons-chevron-right" :disabled="!hasMore || directoryLoading" @click="nextPage">Next</UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAdminUsersRoles, roleLabel, userInitials, userLabel, type AdminSelection, type DirectoryUser } from '~/composables/useAdminUsersRoles'

const selection = defineModel<AdminSelection | null>('selection', { default: null })
const emit = defineEmits<{ 'new-special-user': [] }>()

const {
  roles, specialUsers, specialUsersLoading,
  directoryUsers, directoryLoading, loadError,
  searchDirectory, selectDirectoryUser,
} = useAdminUsersRoles()

const systemRoles = computed(() => roles.value.filter(r => r.system))

// ── All-users search + pagination (server-side) ─────────────────────────────
const PAGE_SIZE = 10
const query = ref('')
const page = ref(0)
// Heuristic: a full page implies (probably) another. Avoids a COUNT
// round-trip; worst case Next lands on one empty page.
const hasMore = computed(() => directoryUsers.value.length === PAGE_SIZE)

function loadPage() {
  searchDirectory(query.value.trim(), PAGE_SIZE, page.value * PAGE_SIZE)
}
function nextPage() { page.value += 1; loadPage() }
function prevPage() { if (page.value > 0) { page.value -= 1; loadPage() } }

let searchTimer: ReturnType<typeof setTimeout> | null = null
function onQueryInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { page.value = 0; loadPage() }, 300)
}

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

onMounted(() => {
  loadPage()
})
</script>
