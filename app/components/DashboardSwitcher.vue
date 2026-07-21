<template>
  <div class="dashboard-switcher-anchor relative min-w-0">
    <!-- No @click.stop on this root, unlike DashboardMembershipPicker. This
         lives inside AppHeader next to the user menu, which closes via its own
         document listener — swallowing the click would leave both panels open
         at once. The closest() check in onDocClick is enough to keep us open.

         Keep this a single root element: dashboard.vue passes class="sm:hidden"
         and attribute fallthrough is what applies it. -->
    <button
      class="flex items-center gap-1 min-w-0 max-w-[45vw] px-2 py-1 rounded-md text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
      @click="open = !open"
    >
      <span class="truncate text-sm font-medium">{{ db.activeDashboard.value?.name }}</span>
      <svg
        class="w-3 h-3 shrink-0 transition-transform"
        :class="open ? 'rotate-180' : ''"
        viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
      >
        <path d="M4 6l4 4 4-4"/>
      </svg>
    </button>

    <div
      v-if="open"
      class="absolute left-0 top-full mt-1 z-40 w-56 max-h-[60vh] overflow-y-auto rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg"
    >
      <!-- One row per dashboard -->
      <div class="py-1">
        <button
          v-for="d in db.dashboards.value"
          :key="d.id"
          class="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          @click="selectDashboard(d.id)"
        >
          <svg v-if="d.id === db.activeDashboardId.value" class="w-3.5 h-3.5 shrink-0 text-primary-500" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
          </svg>
          <span v-else class="w-3.5 h-3.5 shrink-0" />
          <span class="truncate text-neutral-700 dark:text-neutral-300">{{ d.name }}</span>
        </button>
      </div>

      <div class="h-px bg-neutral-100 dark:bg-neutral-800" />

      <!-- New dashboard -->
      <button
        class="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
        @click="emitNew"
      >
        <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/>
        </svg>
        New dashboard
      </button>

      <div class="h-px bg-neutral-100 dark:bg-neutral-800" />

      <!-- Actions for the active dashboard only -->
      <template v-if="db.activeDashboard.value">
        <button
          class="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          @click="emitShare"
        >
          <svg class="w-3.5 h-3.5 shrink-0 text-neutral-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="13" cy="3" r="1.5"/>
            <circle cx="3" cy="8" r="1.5"/>
            <circle cx="13" cy="13" r="1.5"/>
            <line x1="4.5" y1="7.2" x2="11.5" y2="4"/>
            <line x1="4.5" y1="8.8" x2="11.5" y2="12"/>
          </svg>
          Share dashboard
        </button>
        <button
          class="w-full text-left px-3 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          @click="startRename"
        >Rename</button>
        <button
          v-if="db.dashboards.value.length > 1"
          class="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          @click="startDelete"
        >Delete</button>
      </template>
    </div>

    <DashboardRenameModal
      :open="!!renaming"
      :dashboard="renaming"
      @submit="onRenameSubmit"
      @cancel="renaming = null"
    />
    <DashboardDeleteModal
      :open="!!deleting"
      :dashboard="deleting"
      @submit="onDeleteSubmit"
      @cancel="deleting = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { Dashboard } from '~/composables/useDashboards'

// Module-level refs from the composable — usable directly, no props needed.
const db = useDashboards()

const emit = defineEmits<{
  select: [id: string]
  new: []
  delete: [slug: string]
  rename: [slug: string, name: string]
  share: []
}>()

const open = ref(false)
const renaming = ref<Dashboard | null>(null)
const deleting = ref<Dashboard | null>(null)

// Emit only — dashboard.vue's onSelectDashboard also runs activateDashboard +
// refresh; calling db.setActive() here would swap the id without refetching.
function selectDashboard(id: string) {
  open.value = false
  emit('select', id)
}

function emitNew() {
  open.value = false
  emit('new')
}

function emitShare() {
  open.value = false
  emit('share')
}

function startRename() {
  if (!db.activeDashboard.value) return
  renaming.value = db.activeDashboard.value
  open.value = false
}

function onRenameSubmit(name: string) {
  if (!renaming.value) return
  emit('rename', renaming.value.slug, name)
  renaming.value = null
}

function startDelete() {
  if (!db.activeDashboard.value) return
  deleting.value = db.activeDashboard.value
  open.value = false
}

function onDeleteSubmit() {
  if (!deleting.value) return
  emit('delete', deleting.value.slug)
  deleting.value = null
}

function onDocClick(e: MouseEvent) {
  if (open.value && !(e.target as HTMLElement).closest('.dashboard-switcher-anchor')) {
    open.value = false
  }
}

onMounted(() => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))
</script>
