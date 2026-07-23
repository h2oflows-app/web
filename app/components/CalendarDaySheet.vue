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
        v-if="open"
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
            v-if="open"
            class="w-full sm:max-w-md max-h-[85vh] flex flex-col bg-white dark:bg-neutral-900 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden pb-[env(safe-area-inset-bottom)]"
          >
            <div class="flex justify-center pt-3 pb-1 sm:hidden">
              <div class="w-9 h-1 rounded-full bg-neutral-200 dark:bg-neutral-700" />
            </div>

            <div class="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between shrink-0">
              <div>
                <h2 class="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{{ title }}</h2>
                <p class="text-xs text-neutral-400 mt-0.5">{{ subline }}</p>
              </div>
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

            <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              <template v-if="loading">
                <div v-for="i in 2" :key="i" class="h-14 rounded-xl bg-neutral-100 dark:bg-neutral-800 animate-pulse" />
              </template>

              <template v-else>
                <!-- Plans spanning this day — each can log a run against it -->
                <div v-if="plans.length" class="flex flex-col gap-2">
                  <div
                    v-for="plan in plans"
                    :key="plan.id"
                    class="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/50"
                  >
                    <PlanTypeBadge :type="plan.type" />
                    <span class="min-w-0 flex-1 text-sm font-medium text-neutral-700 dark:text-neutral-200 truncate">{{ plan.name }}</span>
                    <button
                      v-if="plan.role === 'own'"
                      type="button"
                      class="shrink-0 text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
                      @click="addRunTo(plan.id)"
                    >+ Add a run</button>
                  </div>
                </div>

                <div class="flex flex-col gap-2">
                  <PlanRunItem
                    v-for="run in runs"
                    :key="run.id"
                    :run="run"
                    :date="date ?? ''"
                  />
                  <p v-if="!runs.length" class="text-sm text-neutral-400 text-center py-8">Nothing here yet.</p>
                </div>
              </template>
            </div>

            <div class="p-4 border-t border-neutral-100 dark:border-neutral-800 shrink-0">
              <button
                type="button"
                class="w-full py-2.5 rounded-xl border-2 border-dashed border-primary-300 dark:border-primary-700 text-primary-600 dark:text-primary-400 text-sm font-medium hover:bg-primary-50/50 dark:hover:bg-primary-950/30 transition-colors"
                @click="$emit('new-plan-here')"
              >+ New plan here</button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CalendarPlan, CalendarRun } from '~/composables/useCalendar'
import { fmtDate } from '~/utils/calendarDate'
import { usePlanRunLogSheet } from '~/composables/usePlanRunLogSheet'

const props = defineProps<{
  open: boolean
  date: string | null
  runs: CalendarRun[]
  // Plans whose [start_date, end_date] spans this day (own + member) — the
  // day sheet lists each with its own "Add a run" button (fixes "made a
  // plan, tapped its day, sheet looked empty" — real user feedback).
  plans: CalendarPlan[]
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:open': [boolean]
  'new-plan-here': []
}>()

const planRunLogSheet = usePlanRunLogSheet()

function close() {
  emit('update:open', false)
}

const title = computed(() => {
  if (!props.date) return ''
  return fmtDate(props.date, { weekday: 'long', month: 'short', day: 'numeric' })
})

const subline = computed(() => {
  if (props.loading) return 'Loading…'
  const n = props.runs.length
  return n === 0 ? 'Nothing planned yet' : `${n} run${n === 1 ? '' : 's'}`
})

function addRunTo(planId: string) {
  close()
  planRunLogSheet.openCreate(planId, props.date ?? undefined)
}
</script>
