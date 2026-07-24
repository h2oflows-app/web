<template>
  <div class="space-y-2">
    <!-- Chips -->
    <div v-if="handles.length" class="flex flex-wrap gap-1.5">
      <span
        v-for="h in handles"
        :key="h"
        class="inline-flex items-center gap-1 rounded-full bg-primary-50 dark:bg-primary-950/50 text-primary-700 dark:text-primary-400 pl-2.5 pr-1.5 py-1 text-xs font-medium"
      >
        @{{ h }}
        <button type="button" class="hover:text-primary-900 dark:hover:text-primary-200" :aria-label="`Remove @${h}`" @click="remove(h)">
          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </span>
    </div>

    <!-- Search input -->
    <input
      v-model="query"
      type="text"
      placeholder="Search by @handle…"
      class="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
    />

    <!-- Results -->
    <div v-if="query.trim().length >= 2" class="rounded-lg border border-neutral-100 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800 max-h-40 overflow-y-auto">
      <div v-if="searching" class="px-3 py-3 text-xs text-neutral-400 text-center">Searching…</div>
      <div v-else-if="!results.length" class="px-3 py-3 text-xs text-neutral-400 text-center">No paddlers found.</div>
      <button
        v-for="r in results"
        :key="r.handle"
        type="button"
        class="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-40"
        :disabled="handles.includes(r.handle)"
        @click="add(r.handle)"
      >
        <span class="text-sm text-neutral-800 dark:text-neutral-100">@{{ r.handle }}</span>
        <span v-if="handles.includes(r.handle)" class="text-xs text-emerald-500">Added ✓</span>
        <span v-else class="text-xs text-primary-600 dark:text-primary-400">Add</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const handles = defineModel<string[]>({ default: () => [] })

const { apiBase } = useRuntimeConfig().public

const query = ref('')
const results = ref<{ handle: string }[]>([])
const searching = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

watch(query, (q) => {
  if (timer) clearTimeout(timer)
  const trimmed = q.trim()
  if (trimmed.length < 2) {
    results.value = []
    searching.value = false
    return
  }
  searching.value = true
  timer = setTimeout(async () => {
    const res = await fetch(`${apiBase}/api/v1/users/search?q=${encodeURIComponent(trimmed)}`).catch(() => null)
    results.value = res?.ok ? await res.json().catch(() => []) : []
    searching.value = false
  }, 250)
})

function add(handle: string) {
  if (handles.value.includes(handle)) return
  handles.value = [...handles.value, handle]
}

function remove(handle: string) {
  handles.value = handles.value.filter(h => h !== handle)
}
</script>
