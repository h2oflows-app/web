<template>
  <!-- "Adding to [dashboard ▾]" chip — lifted from GaugeSearchModal so the
       explore rail carries the same add-target affordance (web#335). -->
  <div class="flex items-center gap-2">
    <span class="text-xs text-neutral-500 dark:text-neutral-400 shrink-0">Adding to</span>
    <div ref="dashChipWrap" class="relative">
      <button
        class="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-700 hover:bg-primary-200 dark:hover:bg-primary-900/80 transition-colors min-h-[28px]"
        @click="chipOpen = !chipOpen"
      >
        <svg class="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="4" rx="1"/><rect x="14" y="10" width="7" height="11" rx="1"/><rect x="3" y="13" width="7" height="8" rx="1"/>
        </svg>
        <span class="truncate max-w-[160px]">{{ selectedName }}</span>
        <svg class="w-3 h-3 shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd"/>
        </svg>
      </button>
      <div
        v-if="chipOpen"
        class="absolute top-full left-0 mt-1 z-50 min-w-[180px] rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg py-1"
      >
        <button
          v-for="d in db.dashboards.value"
          :key="d.id"
          class="w-full text-left px-3 py-1.5 text-xs transition-colors"
          :class="dashboardId === d.id
            ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 font-medium'
            : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800'"
          @click="dashboardId = d.id; chipOpen = false"
        >{{ d.name }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

// Target-dashboard state is owned by the parent (v-model:dashboardId) so every
// scope's add path reads one ref. Same contract as the modal it replaces:
// initialised from the active dashboard, self-repairs if the selected
// dashboard is deleted, and deliberately NOT persisted — picking a target here
// must not switch the dashboard page's own active tab.
const dashboardId = defineModel<string | null>('dashboardId', { default: null })

const db = useDashboards()

if (!dashboardId.value) dashboardId.value = db.activeDashboardId.value
watch(() => db.activeDashboardId.value, (id) => {
  if (!dashboardId.value || !db.dashboards.value.find(d => d.id === dashboardId.value)) {
    dashboardId.value = id
  }
})

const selectedName = computed(() => {
  if (!dashboardId.value) return 'dashboard'
  return db.dashboards.value.find(d => d.id === dashboardId.value)?.name ?? 'dashboard'
})

const chipOpen = ref(false)
const dashChipWrap = ref<HTMLElement | null>(null)

function onOutsideClick(e: MouseEvent) {
  if (dashChipWrap.value && !dashChipWrap.value.contains(e.target as Node)) {
    chipOpen.value = false
  }
}
watch(chipOpen, (open) => {
  if (open) document.addEventListener('click', onOutsideClick)
  else document.removeEventListener('click', onOutsideClick)
})
</script>
