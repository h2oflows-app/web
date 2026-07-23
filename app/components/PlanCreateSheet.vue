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
        @click.self="cancel"
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
            class="w-full sm:max-w-md max-h-[90vh] flex flex-col bg-white dark:bg-neutral-900 rounded-t-2xl sm:rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden pb-[env(safe-area-inset-bottom)]"
          >
            <div class="flex justify-center pt-3 pb-1 sm:hidden">
              <div class="w-9 h-1 rounded-full bg-neutral-200 dark:bg-neutral-700" />
            </div>

            <div class="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between shrink-0">
              <h2 class="text-sm font-semibold text-neutral-800 dark:text-neutral-100">New plan</h2>
              <button
                class="p-1 rounded text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                aria-label="Close"
                @click="cancel"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div class="flex-1 overflow-y-auto p-4 space-y-4">
              <!-- Name -->
              <div>
                <label class="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Name</label>
                <input
                  v-model="wizard.name"
                  type="text"
                  placeholder="e.g. Gore Canyon weekend"
                  class="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                />
              </div>

              <!-- Type pill row -->
              <div>
                <label class="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1.5">Type</label>
                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-for="t in PLAN_TYPES"
                    :key="t"
                    type="button"
                    class="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
                    :class="wizard.type === t
                      ? `${planTypeMeta(t).badgeClass} border-transparent`
                      : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600'"
                    @click="wizard.type = t"
                  >{{ planTypeMeta(t).label }}</button>
                </div>
              </div>

              <!-- Date range -->
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Start date</label>
                  <input
                    v-model="wizard.startDate"
                    type="date"
                    class="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                  />
                </div>
                <div>
                  <label class="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">End date</label>
                  <input
                    v-model="wizard.endDate"
                    type="date"
                    :min="wizard.startDate || undefined"
                    class="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                  />
                </div>
              </div>
              <p v-if="wizard.dateError" class="text-xs text-red-500 -mt-2">{{ wizard.dateError }}</p>

              <!-- Location -->
              <div>
                <label class="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">Location <span class="text-neutral-400">(optional)</span></label>
                <input
                  v-model="wizard.location"
                  type="text"
                  placeholder="e.g. Pumphouse to State Bridge"
                  class="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                />
              </div>

              <!-- Visibility & crew -->
              <div class="rounded-xl border border-neutral-100 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800">
                <div class="flex items-center justify-between gap-3 px-3.5 py-3">
                  <div>
                    <p class="text-sm font-medium text-neutral-800 dark:text-neutral-100">{{ wizard.visibility === 'public' ? 'Public' : 'Private' }}</p>
                    <p class="text-[11px] text-neutral-400 mt-0.5">Anyone can view public plans</p>
                  </div>
                  <USwitch
                    :model-value="wizard.visibility === 'public'"
                    :disabled="wizard.lookingForCrew"
                    @update:model-value="(v: boolean) => wizard.visibility = v ? 'public' : 'private'"
                  />
                </div>

                <div class="flex items-center justify-between gap-3 px-3.5 py-3">
                  <div>
                    <p class="text-sm font-medium text-neutral-800 dark:text-neutral-100">Looking for crew</p>
                    <p class="text-[11px] text-neutral-400 mt-0.5">Show in Discover · paddlers can Join Run</p>
                  </div>
                  <USwitch
                    :model-value="wizard.lookingForCrew"
                    @update:model-value="wizard.setLookingForCrew"
                  />
                </div>

                <div v-if="wizard.lookingForCrew" class="flex items-center justify-between gap-3 px-3.5 py-3">
                  <p class="text-sm font-medium text-neutral-800 dark:text-neutral-100">Max crew</p>
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      class="w-7 h-7 rounded-full border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-30"
                      :disabled="wizard.maxCrew <= 1"
                      @click="wizard.maxCrew = Math.max(1, wizard.maxCrew - 1)"
                    >−</button>
                    <span class="w-6 text-center text-sm font-semibold text-neutral-800 dark:text-neutral-100">{{ wizard.maxCrew }}</span>
                    <button
                      type="button"
                      class="w-7 h-7 rounded-full border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-30"
                      :disabled="wizard.maxCrew >= 20"
                      @click="wizard.maxCrew = Math.min(20, wizard.maxCrew + 1)"
                    >+</button>
                  </div>
                </div>
              </div>

              <!-- TODO(W4): invite-by-handle/email section lands with InviteSheet -->
            </div>

            <div class="p-4 border-t border-neutral-100 dark:border-neutral-800 shrink-0">
              <button
                type="button"
                class="w-full py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
                :disabled="!wizard.isValid || submitting"
                @click="submit"
              >{{ submitting ? 'Creating…' : 'Create plan' }}</button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { usePlanWizard } from '~/stores/planWizard'
import { usePlanCreateSheet } from '~/composables/usePlanCreateSheet'
import { usePlans } from '~/composables/usePlans'
import { useCalendarFocusDate } from '~/composables/useCalendar'
import { PLAN_TYPES, planTypeMeta } from '~/utils/planType'
import { todayYMD } from '~/utils/calendarDate'

const wizard = usePlanWizard()
const { isOpen, prefillDate, close } = usePlanCreateSheet()
const { createPlan } = usePlans()
const focusDate = useCalendarFocusDate()
const route = useRoute()

const submitting = ref(false)

watch(isOpen, (open) => {
  if (!open) return
  if (prefillDate.value) {
    wizard.prefillDate(prefillDate.value)
  } else if (!wizard.startDate) {
    wizard.prefillDate(todayYMD())
  }
})

function cancel() {
  close()
  wizard.reset()
}

async function submit() {
  if (!wizard.isValid || submitting.value) return
  submitting.value = true
  const result = await createPlan({
    name: wizard.name.trim(),
    type: wizard.type,
    start_date: wizard.startDate,
    end_date: wizard.endDate,
    location: wizard.location.trim() || undefined,
    visibility: wizard.visibility,
    looking_for_crew: wizard.lookingForCrew,
    max_crew: wizard.lookingForCrew ? wizard.maxCrew : undefined,
  })
  submitting.value = false
  if (!result) return // error toast already shown by usePlans

  focusDate.value = wizard.startDate
  close()
  wizard.reset()
  if (route.path !== '/calendar') await navigateTo('/calendar')
}
</script>
