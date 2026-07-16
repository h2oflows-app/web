<template>
  <UModal v-model:open="open" title="New special user">
    <template #body>
      <div class="space-y-3">
        <UFormField label="Handle">
          <UInput v-model="handle" placeholder="handle" class="font-mono" @input="sanitizeHandle">
            <template #leading><span class="text-neutral-400">@</span></template>
          </UInput>
        </UFormField>
        <UFormField label="Display name">
          <UInput v-model="displayName" placeholder="H2OFlows" />
        </UFormField>
        <UFormField label="Bulk write limit (runs / hour)">
          <UInput v-model.number="runsPerHour" type="number" min="0" />
        </UFormField>
        <div class="flex items-center justify-between rounded-lg border border-neutral-200 dark:border-neutral-700 px-3 py-2">
          <span class="text-sm text-neutral-700 dark:text-neutral-300">Show runs on public maps</span>
          <USwitch v-model="publicOnMap" />
        </div>
        <div class="rounded-lg bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800 px-3 py-2 text-xs text-primary-700 dark:text-primary-300">
          A matching role <span class="font-mono">@{{ handle || 'handle' }}</span> is created automatically. Add members afterward to grant edit access.
        </div>

        <div v-if="createdKey" class="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 p-3">
          <p class="text-xs font-semibold text-amber-700 dark:text-amber-400">API key — copy it now, it won't be shown again</p>
          <div class="flex items-center gap-2 mt-1.5">
            <code class="flex-1 min-w-0 truncate px-2 py-1 rounded bg-white dark:bg-neutral-900 border border-amber-200 dark:border-amber-800 text-xs font-mono">{{ createdKey }}</code>
            <UButton size="xs" color="warning" variant="outline" @click="copyKey">Copy</UButton>
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton variant="ghost" color="neutral" @click="close">{{ createdKey ? 'Done' : 'Cancel' }}</UButton>
        <UButton v-if="!createdKey" :loading="creating" :disabled="!handle || !displayName" @click="create">Create</UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAdminUsersRoles } from '~/composables/useAdminUsersRoles'

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ created: [id: string] }>()

const { createSpecialUser } = useAdminUsersRoles()
const toast = useToast()

const handle = ref('')
const displayName = ref('')
const runsPerHour = ref(500)
const publicOnMap = ref(false)
const creating = ref(false)
const createdKey = ref<string | null>(null)

function sanitizeHandle() {
  handle.value = handle.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
}

function reset() {
  handle.value = ''
  displayName.value = ''
  runsPerHour.value = 500
  publicOnMap.value = false
  createdKey.value = null
}

watch(open, (v) => { if (v) reset() })

async function create() {
  creating.value = true
  try {
    const res = await createSpecialUser({
      handle: handle.value,
      display_name: displayName.value,
      public_on_map: publicOnMap.value,
      runs_per_hour: runsPerHour.value,
    })
    if (!res) {
      toast.add({ title: 'Failed to create special user', color: 'error', duration: 4000 })
      return
    }
    if ('error' in res) {
      toast.add({ title: res.error, color: 'error', duration: 4000 })
      return
    }
    createdKey.value = res.api_key
    toast.add({ title: `@${res.handle} created`, color: 'success', duration: 3000 })
    emit('created', res.id)
  } finally {
    creating.value = false
  }
}

function copyKey() {
  if (createdKey.value && import.meta.client && navigator.clipboard) {
    navigator.clipboard.writeText(createdKey.value).then(() => toast.add({ title: 'Copied', color: 'success', duration: 2000 }))
  }
}

function close() {
  open.value = false
}
</script>
