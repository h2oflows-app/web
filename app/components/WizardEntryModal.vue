<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm"
        @click.self="$emit('cancel')"
      >
        <div class="w-full max-w-sm bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <div class="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
            <h2 class="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Add a Run</h2>
            <button
              class="p-1 rounded text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
              @click="$emit('cancel')"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <div class="p-4 flex flex-col gap-3">
            <!-- Option 1: Search & Fork -->
            <button
              class="flex items-center gap-4 px-4 py-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-primary-50/50 dark:hover:bg-primary-950/30 text-left transition-colors group"
              @click="$emit('search-fork')"
            >
              <div class="shrink-0 w-9 h-9 rounded-lg bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center text-primary-600 dark:text-primary-400 group-hover:bg-primary-200 dark:group-hover:bg-primary-900 transition-colors">
                <svg class="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
              </div>
              <div class="min-w-0">
                <p class="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Search & Fork</p>
                <p class="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">Find an existing run and add it to your dashboard</p>
              </div>
            </button>

            <!-- Option 2: Import KML/GPX -->
            <button
              class="flex items-center gap-4 px-4 py-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-primary-50/50 dark:hover:bg-primary-950/30 text-left transition-colors group"
              @click="$emit('import')"
            >
              <div class="shrink-0 w-9 h-9 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 dark:text-neutral-400 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/50 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                <svg class="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </div>
              <div class="min-w-0">
                <p class="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Import KML / GPX</p>
                <p class="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">Upload a track from another app or device</p>
              </div>
            </button>

            <!-- Option 3: Draw on Map -->
            <button
              class="flex items-center gap-4 px-4 py-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-primary-50/50 dark:hover:bg-primary-950/30 text-left transition-colors group"
              @click="$emit('draw')"
            >
              <div class="shrink-0 w-9 h-9 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 dark:text-neutral-400 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/50 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                <svg class="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
              </div>
              <div class="min-w-0">
                <p class="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Draw on Map</p>
                <p class="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">Trace put-in, take-out, and run details on the map</p>
              </div>
            </button>
          </div>

          <div class="px-4 pb-4 flex justify-end">
            <button
              class="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
              @click="$emit('cancel')"
            >Cancel</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{ open: boolean }>()
defineEmits<{
  cancel: []
  'search-fork': []
  import: []
  draw: []
}>()
</script>
