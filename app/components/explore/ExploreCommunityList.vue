<template>
  <div class="flex-1 overflow-y-auto">
    <!-- Skeletons while loading a fresh set -->
    <div v-if="search.loading.value && search.runs.value.length === 0" class="space-y-2 py-2 px-2">
      <div v-for="i in 5" :key="i" class="flex items-center gap-3 px-2 py-2.5">
        <div class="flex-1 space-y-2">
          <div class="h-4 w-3/4 rounded bg-neutral-100 dark:bg-neutral-800 animate-pulse"/>
          <div class="h-3 w-1/2 rounded bg-neutral-100 dark:bg-neutral-800 animate-pulse"/>
        </div>
        <div class="h-7 w-20 rounded bg-neutral-100 dark:bg-neutral-800 animate-pulse"/>
      </div>
    </div>
    <!-- Empty states: two distinct messages, modal parity -->
    <div v-else-if="search.runs.value.length === 0" class="text-center py-10 text-neutral-400 text-sm px-4">
      {{ (search.query.value?.length ?? 0) >= 2 ? `No runs matching "${search.query.value}"` : 'No runs found. Try a different search.' }}
    </div>
    <template v-else>
      <ul class="divide-y divide-neutral-100 dark:divide-neutral-800">
        <ExploreCommunityRow
          v-for="run in search.runs.value"
          :key="run.id"
          :ref="(el) => setRowRef(run.slug, el)"
          :run="run"
          :adder="adder"
          :dashboard-id="dashboardId"
          :hovered="hoveredSlug === run.slug"
          :selected="selectedSlug === run.slug"
          :split-open="splitOpenForId === run.id"
          @hover="emit('hover', $event)"
          @select="emit('select', $event)"
          @toggle-split="splitOpenForId = splitOpenForId === $event ? null : $event"
        />
      </ul>
      <!-- Load more -->
      <div v-if="search.hasMore.value && !search.loading.value" class="py-2 text-center">
        <button
          class="text-xs text-primary-500 hover:text-primary-700 dark:text-primary-400 font-medium"
          @click="search.loadMore()"
        >Load more</button>
      </div>
      <div v-else-if="search.loading.value" class="py-2 text-center text-xs text-neutral-400">Loading…</div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import type { CommunitySearch, DiscoverRun } from '~/composables/useCommunitySearch'
import type { ExploreAdd } from '~/composables/useExploreAdd'

// Community results list (web#335): rows + Load more + the modal's two empty
// states. Split-picker open state lives here (one open at a time) and closes
// on any outside click, same discipline as the modal's closeRowMenus.
const props = defineProps<{
  search: CommunitySearch
  adder: ExploreAdd
  dashboardId: string | null
  hoveredSlug: string | null
  selectedSlug: string | null
}>()

const emit = defineEmits<{
  (e: 'hover', slug: string | null): void
  (e: 'select', run: DiscoverRun): void
}>()

// Tap-a-pin jump (mobile sheet) + selection sync: scroll the selected row
// into view when it changes from outside the list (pin click).
const rowRefs = new Map<string, HTMLElement>()
function setRowRef(slug: string, el: any) {
  const dom: HTMLElement | null = el?.$el ?? el
  if (dom) rowRefs.set(slug, dom)
  else rowRefs.delete(slug)
}
watch(() => props.selectedSlug, (slug) => {
  if (slug) nextTick(() => rowRefs.get(slug)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
})

const splitOpenForId = ref<string | null>(null)

function closeRowMenus() {
  splitOpenForId.value = null
}
watch(splitOpenForId, (s) => {
  if (s !== null) document.addEventListener('click', closeRowMenus)
  else document.removeEventListener('click', closeRowMenus)
})
</script>
