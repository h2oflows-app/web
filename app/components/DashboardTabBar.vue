<template>
  <div class="hidden sm:block bg-white/95 dark:bg-neutral-950/95 backdrop-blur-sm border-b border-neutral-200 dark:border-neutral-800">
    <div class="max-w-5xl mx-auto px-4">
      <div ref="scrollerRef" class="flex items-center gap-0.5 overflow-x-auto scrollbar-none py-0.5">

        <!-- Tabs -->
        <div
          v-for="db in dashboards"
          :key="db.id"
          class="group relative flex items-center shrink-0"
        >
          <button
            class="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t transition-colors whitespace-nowrap"
            :class="db.id === activeDashboardId
              ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500 -mb-px'
              : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'"
            @click="$emit('select', db.id)"
          >
            {{ db.name }}
          </button>

          <!-- Three-dot menu trigger per tab. Always visible — holds Rename/Delete
               and (on active tab) Share + View basin map actions. -->
          <button
            :ref="(el) => setMenuButtonRef(db.id, el as HTMLElement | null)"
            class="p-1 rounded text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            :class="{ 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100': menuOpenId === db.id }"
            title="Dashboard actions"
            @click.stop="toggleMenu(db.id)"
          >
            <svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="8" cy="3" r="1.6"/><circle cx="8" cy="8" r="1.6"/><circle cx="8" cy="13" r="1.6"/>
            </svg>
          </button>
        </div>

        <!-- New dashboard button -->
        <button
          class="shrink-0 flex items-center gap-1 px-2 py-2 text-sm text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
          title="New dashboard"
          @click="$emit('new')"
        >
          <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/>
          </svg>
        </button>
      </div>
    </div>
  </div>

  <!-- Floating menu — teleported to body so it escapes the overflow-x-auto container -->
  <Teleport to="body">
    <div
      v-if="menuOpenId && menuPos"
      :style="{ position: 'fixed', top: `${menuPos.top}px`, left: `${menuPos.left}px` }"
      class="z-50 w-44 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg overflow-hidden py-1"
      @click.stop
    >
      <!-- Active-dashboard-only actions -->
      <template v-if="menuOpenId === activeDashboardId">
        <button
          class="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          @click="emitAndClose('share')"
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
        <div class="h-px bg-neutral-100 dark:bg-neutral-800 my-1" />
      </template>
      <button
        class="w-full text-left px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
        @click="startRenameById(menuOpenId)"
      >Rename</button>
      <button
        v-if="dashboards.length > 1"
        class="w-full text-left px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
        @click="confirmDeleteById(menuOpenId)"
      >Delete</button>
    </div>
  </Teleport>

  <!-- Rename / delete modals — extracted so DashboardSwitcher (mobile) can share them -->
  <DashboardRenameModal
    :open="!!renaming"
    :dashboard="renaming"
    @submit="onRenameSubmit"
    @cancel="renaming = null"
  />
  <DashboardDeleteModal
    :open="!!deleting"
    :dashboard="deleting"
    @submit="confirmDelete"
    @cancel="deleting = null"
  />
</template>

<script setup lang="ts">
import type { Dashboard } from '~/composables/useDashboards'

const props = defineProps<{
  dashboards: Dashboard[]
  activeDashboardId: string | null
}>()

const emit = defineEmits<{
  select: [id: string]
  new: []
  delete: [slug: string]
  rename: [slug: string, name: string]
  share: []
}>()

function emitAndClose(event: 'share') {
  closeMenu()
  emit(event)
}

const menuOpenId = ref<string | null>(null)
const menuPos = ref<{ top: number; left: number } | null>(null)
const menuButtonRefs = new Map<string, HTMLElement>()
const renaming = ref<Dashboard | null>(null)
const deleting = ref<Dashboard | null>(null)
const scrollerRef = ref<HTMLElement | null>(null)

function setMenuButtonRef(id: string, el: HTMLElement | null) {
  if (el) menuButtonRefs.set(id, el)
  else menuButtonRefs.delete(id)
}

function toggleMenu(id: string) {
  if (menuOpenId.value === id) {
    menuOpenId.value = null
    menuPos.value = null
    return
  }
  const btn = menuButtonRefs.get(id)
  if (!btn) return
  const rect = btn.getBoundingClientRect()
  menuPos.value = { top: rect.bottom + 4, left: rect.left }
  menuOpenId.value = id
}

function closeMenu() {
  menuOpenId.value = null
  menuPos.value = null
}

function startRenameById(id: string) {
  const db = props.dashboards.find(d => d.id === id)
  if (!db) return
  renaming.value = db
  closeMenu()
}

function onRenameSubmit(name: string) {
  if (!renaming.value) return
  emit('rename', renaming.value.slug, name)
  renaming.value = null
}

function confirmDeleteById(id: string) {
  const db = props.dashboards.find(d => d.id === id)
  if (!db) return
  deleting.value = db
  closeMenu()
}

function confirmDelete() {
  if (!deleting.value) return
  emit('delete', deleting.value.slug)
  deleting.value = null
}

// Close menu on outside click or scroll
if (import.meta.client) {
  document.addEventListener('click', closeMenu)
  // Reposition closed if user scrolls the tab strip — simpler than tracking scroll
  onMounted(() => {
    scrollerRef.value?.addEventListener('scroll', closeMenu)
  })
  onUnmounted(() => {
    document.removeEventListener('click', closeMenu)
    scrollerRef.value?.removeEventListener('scroll', closeMenu)
  })
}
</script>
