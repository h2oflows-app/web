import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

// usePlanWizard — ephemeral New-event form state (the unified create sheet's
// event branch, PlanRunLogSheet.vue). Setup-store, non-persisted, mirrors
// runWizard.ts's pattern (complex multi-field workflow that should NOT
// survive a reload, unlike watchlist/theme).
//
// web#354 W1: `type` and `visibility` dropped entirely (event-type concept
// removed, visibility concept removed) — an event is just name/date-range/
// location now. PlanCreateSheet.vue (the old dedicated sheet) is deleted;
// PlanRunLogSheet absorbs event creation as one branch of the unified
// "+ New" sheet.
export const usePlanWizard = defineStore('planWizard', () => {
  const name = ref('')
  const startDate = ref('') // YYYY-MM-DD
  const endDate = ref('')   // YYYY-MM-DD
  const location = ref('')

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
    startDate.value = ''
    endDate.value = ''
    location.value = ''
  }

  return {
    name, startDate, endDate, location,
    dateError, isValid, prefillDate, reset,
  }
})
