import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { PlanType } from '~/utils/planType'

// usePlanWizard — ephemeral New-plan form state (PlanCreateSheet). Setup-store,
// non-persisted, mirrors runWizard.ts's pattern (complex multi-field workflow
// that should NOT survive a reload, unlike watchlist/theme).
//
// #246 W5 (IMPLEMENTATION_PLAN.md §6 REVISED 2026-07-25): looking_for_crew/
// max_crew moved OFF the plan onto each plan_run (mig 000144) — a plan is
// just the container now. The crew toggle + max-crew stepper live in
// PlanRunLogSheet instead; this store keeps only what's still plan-level.
export const usePlanWizard = defineStore('planWizard', () => {
  const name = ref('')
  const type = ref<PlanType>('personal')
  const startDate = ref('') // YYYY-MM-DD
  const endDate = ref('')   // YYYY-MM-DD
  const location = ref('')
  const visibility = ref<'public' | 'private'>('public')

  const dateError = computed(() => {
    if (!startDate.value || !endDate.value) return null
    return endDate.value < startDate.value ? 'End date must be on or after start date' : null
  })

  const isValid = computed(() =>
    name.value.trim().length > 0 &&
    !!startDate.value && !!endDate.value &&
    !dateError.value
  )

  function prefillDate(date: string) {
    startDate.value = date
    endDate.value = date
  }

  function reset() {
    name.value = ''
    type.value = 'personal'
    startDate.value = ''
    endDate.value = ''
    location.value = ''
    visibility.value = 'public'
  }

  return {
    name, type, startDate, endDate, location, visibility,
    dateError, isValid, prefillDate, reset,
  }
})
