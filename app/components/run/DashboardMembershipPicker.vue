<template>
  <div class="dashboard-picker-anchor relative" @click.stop>
    <button
      class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors"
      :class="membershipIds.size > 0
        ? 'bg-primary-50 dark:bg-primary-950 border-primary-300 dark:border-primary-700 text-primary-600 dark:text-primary-400'
        : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-primary-300 hover:text-primary-600 dark:hover:text-primary-400'"
      :title="membershipIds.size > 0 ? 'In ' + membershipIds.size + ' dashboard(s)' : 'Add to dashboard'"
      @click="toggle"
    >
      <svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <rect x="2" y="3" width="16" height="13" rx="2"/>
        <path d="M8 16v2M12 16v2M5 19h10"/>
      </svg>
      <span v-if="membershipIds.size > 0" class="tabular-nums">{{ membershipIds.size }}</span>
    </button>

    <div
      v-if="open"
      class="absolute right-0 top-full mt-1 z-40 min-w-44 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg overflow-hidden"
    >
      <div v-if="loading" class="px-3 py-2 text-xs text-neutral-400">Loading…</div>
      <template v-else-if="db.dashboards.value.length > 0">
        <button
          v-for="d in db.dashboards.value"
          :key="d.id"
          class="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          :disabled="toggling === d.id"
          @click="toggleDashboard(d.id)"
        >
          <svg
            class="w-3.5 h-3.5 shrink-0 transition-colors"
            :class="membershipIds.has(d.id) ? 'text-primary-500' : 'text-neutral-300 dark:text-neutral-600'"
            viewBox="0 0 20 20" fill="currentColor"
          >
            <path v-if="membershipIds.has(d.id)" fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            <circle v-else cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
          </svg>
          <span class="truncate text-neutral-700 dark:text-neutral-300">{{ d.name }}</span>
          <svg v-if="toggling === d.id" class="w-3 h-3 ml-auto animate-spin text-neutral-400 shrink-0" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="31.4" stroke-dashoffset="10" stroke-linecap="round"/></svg>
        </button>
      </template>
      <div v-else class="px-3 py-2 text-xs text-neutral-400">No dashboards yet.</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  slug:     string
  reachId?: string
}>()

const { apiBase } = useRuntimeConfig().public
const { getToken } = useAuth()
const db = useDashboards()
const toast = useToast()

const open        = ref(false)
const loading     = ref(false)
const toggling    = ref<string | null>(null)
const membershipIds = ref<Set<string>>(new Set())

async function loadMembership() {
  loading.value = true
  try {
    const token = await getToken()
    if (!token) return
    const res = await fetch(`${apiBase}/api/v1/watchlist`, {
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => null)
    if (!res?.ok) return
    const data = await res.json()
    const ids = new Set<string>()
    for (const item of data.items ?? []) {
      if (item.reach_slug === props.slug && item.dashboard_id) ids.add(item.dashboard_id)
    }
    membershipIds.value = ids
  } finally {
    loading.value = false
  }
}

async function toggleDashboard(dashboardId: string) {
  toggling.value = dashboardId
  try {
    const token = await getToken()
    if (!token) return
    if (membershipIds.value.has(dashboardId)) {
      const db = encodeURIComponent(dashboardId)
      await fetch(`${apiBase}/api/v1/watchlist/${encodeURIComponent(props.slug)}?kind=reach&dashboard_id=${db}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {})
      toast.add({ title: 'Removed from dashboard', color: 'neutral' })
    } else {
      await fetch(`${apiBase}/api/v1/watchlist`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reach_slug: props.slug, dashboard_id: dashboardId }),
      }).catch(() => {})
      // Clear per-dashboard hidden flag so re-added reach appears immediately
      if (import.meta.client && props.reachId) {
        const key = `h2oflow_hidden_reaches_${dashboardId}`
        try {
          const set = new Set<string>(JSON.parse(localStorage.getItem(key) ?? '[]'))
          if (set.delete(props.reachId)) localStorage.setItem(key, JSON.stringify([...set]))
        } catch {}
      }
      toast.add({ title: 'Added to dashboard', color: 'success' })
    }
    await loadMembership()
  } finally {
    toggling.value = null
  }
}

function toggle() {
  open.value = !open.value
  if (open.value) loadMembership()
}

function onDocClick(e: MouseEvent) {
  if (open.value && !(e.target as HTMLElement).closest('.dashboard-picker-anchor')) {
    open.value = false
  }
}

onMounted(() => {
  if (!db.loaded.value) db.load()
  document.addEventListener('click', onDocClick)
})
onUnmounted(() => document.removeEventListener('click', onDocClick))
</script>
