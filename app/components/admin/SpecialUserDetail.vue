<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4">
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-start gap-3 min-w-0">
          <span class="shrink-0 w-11 h-11 rounded-full bg-primary-50 dark:bg-primary-950 flex items-center justify-center text-primary-500 dark:text-primary-400">
            <svg v-if="specialUser.handle === 'h2oflows'" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12c2-4 4-6 6-6s4 6 6 6 4-6 6-6" stroke-linecap="round"/></svg>
            <svg v-else class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M4 21V7l8-4 8 4v14M9 21v-6h6v6M4 21h16"/></svg>
          </span>

          <div v-if="!editing" class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h2 class="text-lg font-bold text-neutral-900 dark:text-white truncate">{{ specialUser.display_name }}</h2>
              <span
                class="shrink-0 text-[10px] font-semibold rounded-full px-2 py-0.5"
                :class="specialUser.public_on_map
                  ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'"
              >{{ specialUser.public_on_map ? 'Public' : 'Private' }}</span>
            </div>
            <p class="text-xs text-neutral-400 mt-0.5">
              <span class="font-mono">@{{ specialUser.handle }}</span>
              <span class="mx-1">·</span>Special account — no login
            </p>
          </div>

          <div v-else class="min-w-0 space-y-2 flex-1">
            <UInput v-model="draftName" size="sm" placeholder="Display name" />
            <UInput v-model="draftHandle" size="sm" placeholder="handle" class="font-mono" @input="sanitizeHandle" />
          </div>
        </div>

        <div class="shrink-0 flex items-center gap-2">
          <template v-if="editing">
            <UButton size="xs" variant="ghost" color="neutral" @click="cancelEdit">Cancel</UButton>
            <UButton size="xs" :loading="savingHeader" @click="saveEdit">Save</UButton>
          </template>
          <UButton v-else size="xs" variant="outline" color="neutral" icon="i-heroicons-pencil-square" @click="startEdit">Edit</UButton>
        </div>
      </div>
    </div>

    <!-- Stat tiles -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div class="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3">
        <p class="text-[10px] font-medium uppercase tracking-wide text-neutral-400">Runs</p>
        <p class="text-xl font-bold text-neutral-900 dark:text-white tabular-nums">{{ specialUser.run_count }}</p>
      </div>
      <div class="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3">
        <p class="text-[10px] font-medium uppercase tracking-wide text-neutral-400">Members</p>
        <p class="text-xl font-bold text-neutral-900 dark:text-white tabular-nums">{{ specialUser.member_count }}</p>
      </div>
      <div class="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3">
        <p class="text-[10px] font-medium uppercase tracking-wide text-neutral-400">API this hr</p>
        <p class="text-xl font-bold text-neutral-900 dark:text-white tabular-nums">{{ specialUser.usage_hour }}</p>
      </div>
      <div class="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3">
        <p class="text-[10px] font-medium uppercase tracking-wide text-neutral-400">Created</p>
        <p class="text-sm font-semibold text-neutral-700 dark:text-neutral-200 mt-1">{{ createdLabel }}</p>
      </div>
    </div>

    <!-- Public map toggle -->
    <div class="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4">
      <div class="flex items-start gap-3">
        <svg class="w-5 h-5 shrink-0 text-neutral-400 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18"/></svg>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-3">
            <p class="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Show runs on public maps</p>
            <USwitch v-model="publicToggle" :loading="togglingPublic" @update:model-value="onTogglePublic" />
          </div>
          <p class="text-xs text-neutral-400 mt-1">
            When on, non-authenticated visitors see this account's runs on the <strong>Explore map</strong> and the
            <strong>landing-page hero map</strong>. Runs from accounts without this flag stay private to logged-in members.
          </p>
        </div>
      </div>
    </div>

    <!-- Members -->
    <div class="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Members</h3>
        <UButton size="xs" icon="i-heroicons-plus" @click="$emit('add-member', specialUser.handle, memberIds)">Add member</UButton>
      </div>
      <p class="text-xs text-neutral-400 mb-3">Members of the <span class="font-mono">@{{ specialUser.handle }}</span> role can create and edit this account's runs.</p>

      <div v-if="members.length === 0" class="px-3 py-6 text-center text-xs text-neutral-400 rounded-md bg-neutral-50 dark:bg-neutral-800/40">
        No members yet.
      </div>
      <div v-else class="divide-y divide-neutral-100 dark:divide-neutral-800">
        <MemberRow v-for="m in members" :key="m.user_id" :member="m" @remove="removeMember" />
      </div>
    </div>

    <!-- Bulk API access -->
    <BulkApiPanel :owner-id="specialUser.id" :is-special="true" />

    <!-- Danger zone -->
    <div class="rounded-lg border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 p-4">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p class="text-sm font-semibold text-red-700 dark:text-red-400">Delete special user</p>
          <p class="text-xs text-red-500 dark:text-red-400/80 mt-0.5">
            Also removes the <span class="font-mono">@{{ specialUser.handle }}</span> role and all memberships.
            <template v-if="specialUser.run_count > 0"> Runs must be reassigned first.</template>
          </p>
        </div>
        <UButton size="sm" color="error" :disabled="specialUser.run_count > 0" :loading="deleting" @click="handleDelete">Delete</UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useAdminUsersRoles, type SpecialUser } from '~/composables/useAdminUsersRoles'

const props = defineProps<{ specialUser: SpecialUser }>()
const emit = defineEmits<{
  'add-member': [roleName: string, excludeIds: string[]]
  'deleted': []
}>()

const { roles, updateSpecialUser, deleteSpecialUser, removeRoleMember } = useAdminUsersRoles()
const toast = useToast()

const role = computed(() => roles.value.find(r => r.name === props.specialUser.handle) ?? null)
const members = computed(() => role.value?.members ?? [])
const memberIds = computed(() => members.value.map(m => m.user_id))

const createdLabel = computed(() => {
  try {
    return new Date(props.specialUser.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  } catch { return '—' }
})

async function removeMember(userId: string) {
  if (import.meta.client && !confirm('Remove this member? They will lose edit access to this account\'s runs.')) return
  const ok = await removeRoleMember(props.specialUser.handle, userId)
  toast.add({ title: ok ? 'Member removed' : 'Failed to remove member', color: ok ? 'success' : 'error', duration: 3000 })
}

// ── Header edit ──────────────────────────────────────────────────────────
const editing = ref(false)
const savingHeader = ref(false)
const draftName = ref('')
const draftHandle = ref('')

function startEdit() {
  draftName.value = props.specialUser.display_name
  draftHandle.value = props.specialUser.handle
  editing.value = true
}
function cancelEdit() {
  editing.value = false
}
function sanitizeHandle() {
  draftHandle.value = draftHandle.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
}
async function saveEdit() {
  savingHeader.value = true
  try {
    const ok = await updateSpecialUser(props.specialUser.id, { display_name: draftName.value, handle: draftHandle.value })
    if (ok) {
      editing.value = false
      toast.add({ title: 'Saved', color: 'success', duration: 2500 })
    } else {
      toast.add({ title: 'Failed to save', color: 'error', duration: 4000 })
    }
  } finally {
    savingHeader.value = false
  }
}

// ── Public toggle ────────────────────────────────────────────────────────
const publicToggle = ref(props.specialUser.public_on_map)
const togglingPublic = ref(false)
watch(() => props.specialUser.public_on_map, (v) => { publicToggle.value = v })

async function onTogglePublic(val: boolean) {
  togglingPublic.value = true
  const prev = props.specialUser.public_on_map
  try {
    const ok = await updateSpecialUser(props.specialUser.id, { public_on_map: val })
    if (!ok) {
      publicToggle.value = prev
      toast.add({ title: 'Failed to update visibility', color: 'error', duration: 4000 })
    }
  } finally {
    togglingPublic.value = false
  }
}

// ── Delete ───────────────────────────────────────────────────────────────
const deleting = ref(false)
async function handleDelete() {
  if (props.specialUser.run_count > 0) return
  if (import.meta.client && !confirm(`Delete @${props.specialUser.handle}? This removes the account, its role, and all memberships.`)) return
  deleting.value = true
  try {
    const res = await deleteSpecialUser(props.specialUser.id)
    if (res.ok) {
      toast.add({ title: 'Special user deleted', color: 'success', duration: 3000 })
      emit('deleted')
    } else {
      toast.add({ title: res.error ?? 'Failed to delete', color: 'error', duration: 4000 })
    }
  } finally {
    deleting.value = false
  }
}
</script>
