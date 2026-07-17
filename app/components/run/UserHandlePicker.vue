<template>
  <div>
    <!-- "Browse user runs" trigger button — shown when picker is closed -->
    <button
      v-if="!expanded"
      class="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
      @click="openPicker"
    >
      <svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="9" cy="9" r="6"/><path d="M15 15l3 3"/>
      </svg>
      Browse user runs
    </button>

    <!-- Inline picker — shown when expanded -->
    <div v-else class="flex flex-col gap-1">
      <div class="flex gap-1 items-center">
        <input
          ref="inputRef"
          v-model="inputVal"
          type="text"
          placeholder="@h2oflows"
          class="flex-1 text-sm bg-neutral-100 dark:bg-neutral-900 rounded-md px-3 py-1.5 text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-primary-500 min-w-0"
          @keydown.enter.prevent="navigate"
          @keydown.escape.prevent="cancel"
        />
        <button
          class="shrink-0 px-2.5 py-1.5 rounded-md text-xs font-medium bg-primary-500 hover:bg-primary-600 text-white transition-colors"
          @click="navigate"
        >Go</button>
        <button
          class="shrink-0 p-1.5 rounded-md text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          @click="cancel"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4l12 12M16 4 4 16" stroke-linecap="round"/></svg>
        </button>
      </div>

      <!-- Suggestions dropdown -->
      <div
        v-if="suggestions.length > 0 || showDefault"
        class="rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden"
      >
        <!-- @h2oflows always at top when input is empty or matches -->
        <button
          v-if="showDefault"
          class="w-full text-left px-3 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex items-center gap-1"
          @click="pick('h2oflows')"
        >
          <span class="text-primary-500 font-medium">@h2oflows</span>
        </button>
        <button
          v-for="h in suggestions"
          :key="h"
          class="w-full text-left px-3 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          @click="pick(h)"
        >@{{ h }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, nextTick, onUnmounted } from 'vue'

const router = useRouter()
const { apiBase } = useRuntimeConfig().public

const expanded    = ref(false)
const inputVal    = ref('')
const suggestions = ref<string[]>([])
const inputRef    = ref<HTMLInputElement | null>(null)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

// Show @h2oflows as default when input is empty or when typing and h2oflows matches
const showDefault = computed(() => {
  const q = inputVal.value.trim().replace(/^@/, '').toLowerCase()
  if (!q) return true
  // Show default slot if 'h2oflows' starts with the query and it's not already in suggestions
  return 'h2oflows'.startsWith(q) && !suggestions.value.includes('h2oflows')
})

watch(inputVal, (val) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  const q = val.trim().replace(/^@/, '').toLowerCase()
  if (q.length < 2) {
    suggestions.value = []
    return
  }
  debounceTimer = setTimeout(async () => {
    try {
      const res = await fetch(`${apiBase}/api/v1/users/search?q=${encodeURIComponent(q)}`)
      if (res.ok) {
        const data = await res.json() as { handle: string }[]
        // Filter out h2oflows from suggestions since we show it as default
        suggestions.value = data.map(d => d.handle).filter(h => h !== 'h2oflows')
      }
    } catch {}
  }, 250)
})

async function openPicker() {
  expanded.value = true
  inputVal.value = ''
  suggestions.value = []
  await nextTick()
  inputRef.value?.focus()
}

function cancel() {
  expanded.value = false
  inputVal.value = ''
  suggestions.value = []
}

function pick(handle: string) {
  const clean = handle.replace(/^@/, '').toLowerCase()
  expanded.value = false
  inputVal.value = ''
  suggestions.value = []
  if (!clean) return
  // Already viewing this user — just collapse (avoids redundant navigation).
  if (router.currentRoute.value.path === `/explore/${clean}`) return
  router.push(`/explore/${clean}`)
}

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})

function navigate() {
  const q = inputVal.value.trim().replace(/^@/, '').toLowerCase()
  if (!q) {
    // Default to h2oflows when nothing typed
    pick('h2oflows')
    return
  }
  pick(q)
}
</script>
