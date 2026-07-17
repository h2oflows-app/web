<template>
  <UModal v-model:open="open" title="Add member">
    <template #body>
      <div class="space-y-3">
        <p class="text-xs text-neutral-400">Search by handle to grant membership in <span class="font-mono">@{{ roleName }}</span>.</p>
        <UInput v-model="query" icon="i-heroicons-magnifying-glass" placeholder="Search handle…" size="sm" class="w-full" @input="onInput" />

        <div v-if="loading" class="space-y-1.5">
          <div v-for="i in 3" :key="i" class="h-10 rounded-md bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
        </div>
        <p v-else-if="results.length === 0" class="px-2 py-6 text-center text-xs text-neutral-400">
          {{ query ? 'No matching users.' : 'Type to search.' }}
        </p>
        <div v-else class="divide-y divide-neutral-100 dark:divide-neutral-800 max-h-72 overflow-y-auto">
          <button
            v-for="u in results" :key="u.owner_id"
            class="w-full flex items-center gap-3 py-2 text-left disabled:opacity-50"
            :disabled="isExcluded(u.owner_id) || addingId === u.owner_id"
            @click="add(u.owner_id)"
          >
            <span class="shrink-0 w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">
              {{ userInitials(u.display_name, u.handle) }}
            </span>
            <span class="flex-1 min-w-0">
              <span class="block text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">{{ userLabel(u.display_name, u.handle) }}</span>
              <span class="block text-xs text-neutral-400 font-mono truncate">@{{ u.handle }}</span>
            </span>
            <span class="shrink-0 text-xs text-neutral-400">{{ isExcluded(u.owner_id) ? 'Added' : addingId === u.owner_id ? '…' : '+ Add' }}</span>
          </button>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end">
        <UButton variant="ghost" color="neutral" @click="close">Done</UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useAdminUsersRoles, userInitials, userLabel, type DirectoryUser } from '~/composables/useAdminUsersRoles'

const props = defineProps<{
  roleName: string
  excludeIds: string[]
}>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ added: [] }>()

const { addRoleMember } = useAdminUsersRoles()
const { apiBase } = useRuntimeConfig().public
const { getToken } = useAuth()
const toast = useToast()

const query = ref('')
const results = ref<DirectoryUser[]>([])
const loading = ref(false)
const addingId = ref<string | null>(null)
const locallyAdded = ref<Set<string>>(new Set())

function isExcluded(id: string): boolean {
  return props.excludeIds.includes(id) || locallyAdded.value.has(id)
}


async function search() {
  loading.value = true
  try {
    const token = await getToken()
    const params = new URLSearchParams({ limit: '20', offset: '0' })
    if (query.value) params.set('q', query.value)
    const res = await fetch(`${apiBase}/api/v1/admin/users?${params}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (res.ok) results.value = await res.json()
  } catch { /* non-fatal */ } finally {
    loading.value = false
  }
}

let timer: ReturnType<typeof setTimeout> | null = null
function onInput() {
  if (timer) clearTimeout(timer)
  timer = setTimeout(search, 300)
}

async function add(userId: string) {
  addingId.value = userId
  try {
    const ok = await addRoleMember(props.roleName, userId)
    if (ok) {
      locallyAdded.value.add(userId)
      toast.add({ title: 'Member added', color: 'success', duration: 2500 })
      emit('added')
    } else {
      toast.add({ title: 'Failed to add member', color: 'error', duration: 4000 })
    }
  } finally {
    addingId.value = null
  }
}

watch(open, (v) => {
  if (v) {
    query.value = ''
    locallyAdded.value = new Set()
    search()
  }
})

function close() {
  open.value = false
}
</script>
