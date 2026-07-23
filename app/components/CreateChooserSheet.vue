<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
        @click.self="close"
      >
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="translate-y-full sm:translate-y-4 sm:opacity-0"
          enter-to-class="translate-y-0 sm:opacity-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="translate-y-0 sm:opacity-100"
          leave-to-class="translate-y-full sm:translate-y-4 sm:opacity-0"
        >
          <div
            v-if="isOpen"
            class="w-full sm:max-w-sm bg-white dark:bg-neutral-900 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden pb-[env(safe-area-inset-bottom)]"
          >
            <!-- Drag handle — mobile only -->
            <div class="flex justify-center pt-3 pb-1 sm:hidden">
              <div class="w-9 h-1 rounded-full bg-neutral-200 dark:bg-neutral-700" />
            </div>

            <div class="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
              <h2 class="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Create</h2>
              <button
                class="p-1 rounded text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                aria-label="Close"
                @click="close"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div class="p-4 flex flex-col gap-3">
              <!-- Option 1: New plan -->
              <button
                class="flex items-center gap-4 px-4 py-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-primary-50/50 dark:hover:bg-primary-950/30 text-left transition-colors group"
                @click="chooseNewPlan"
              >
                <div class="shrink-0 w-9 h-9 rounded-lg bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center text-primary-600 dark:text-primary-400 group-hover:bg-primary-200 dark:group-hover:bg-primary-900 transition-colors">
                  <svg class="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-neutral-800 dark:text-neutral-100">New plan</p>
                  <p class="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">Schedule a trip on your calendar</p>
                </div>
              </button>

              <!-- Option 2: Create a run -->
              <button
                class="flex items-center gap-4 px-4 py-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-primary-50/50 dark:hover:bg-primary-950/30 text-left transition-colors group"
                @click="chooseCreateRun"
              >
                <div class="shrink-0 w-9 h-9 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 dark:text-neutral-400 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/50 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  <svg class="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Create a run</p>
                  <p class="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">Draw or import a new river run</p>
                </div>
              </button>

              <!-- Option 3: Find a run -->
              <button
                class="flex items-center gap-4 px-4 py-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-primary-50/50 dark:hover:bg-primary-950/30 text-left transition-colors group"
                @click="chooseFindRun"
              >
                <div class="shrink-0 w-9 h-9 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 dark:text-neutral-400 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/50 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  <svg class="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                </div>
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-neutral-800 dark:text-neutral-100">Find a run</p>
                  <p class="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">Browse and fork an existing run</p>
                </div>
              </button>
            </div>

            <div class="px-4 pb-4 flex justify-end">
              <button
                class="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                @click="close"
              >Cancel</button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const { isOpen, close } = useCreateMenu()

// TODO(W2): "New plan" should open PlanCreateSheet directly instead of
// navigating to the (still-placeholder) /calendar page once it lands.
function chooseNewPlan() {
  close()
  navigateTo('/calendar')
}

function chooseCreateRun() {
  close()
  navigateTo('/my/runs/new')
}

function chooseFindRun() {
  close()
  navigateTo('/explore')
}
</script>
