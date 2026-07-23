import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { PlanType } from '~/utils/planType'

// usePlanWizard — ephemeral New-plan form state (PlanCreateSheet). Setup-store,
// non-persisted, mirrors runWizard.ts's pattern (complex multi-field workflow
// that should NOT survive a reload, unlike watchlist/theme).
export const usePlanWizard = defineStore('planWizard', () => {
  const name = ref('')
  const type = ref<PlanType>('personal')
  const startDate = ref('') // YYYY-MM-DD
  const endDate = ref('')   // YYYY-MM-DD
  const location = ref('')
  const visibility = ref<'public' | 'private'>('public')
  const lookingForCrew = ref(false)
  const maxCrew = ref<number>(4)

  // Truth table (contract §6.4 / implementation plan §3): turning crew ON
  // force-flips visibility to public — invalid state is unreachable, not
  // just blocked at submit.
  function setLookingForCrew(v: boolean) {
    lookingForCrew.value = v
    if (v) visibility.value = 'public'
  }

  const dateError = computed(() => {
    if (!startDate.value || !endDate.value) return null
    return endDate.value < startDate.value ? 'End date must be on or after start date' : null
  })

  const crewError = computed(() => {
    if (!lookingForCrew.value) return null
    return maxCrew.value >= 1 ? null : 'Max crew must be at least 1'
  })

  const isValid = computed(() =>
    name.value.trim().length > 0 &&
    !!startDate.value && !!endDate.value &&
    !dateError.value && !crewError.value
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
    lookingForCrew.value = false
    maxCrew.value = 4
  }

  return {
    name, type, startDate, endDate, location, visibility, lookingForCrew, maxCrew,
    setLookingForCrew, dateError, crewError, isValid, prefillDate, reset,
  }
})
