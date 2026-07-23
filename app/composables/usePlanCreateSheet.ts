/**
 * usePlanCreateSheet — shared open/prefill state for PlanCreateSheet.vue.
 *
 * PlanCreateSheet is mounted globally (AppCreateOverlay, nested under
 * CreateChooserSheet) so it can be triggered from anywhere: the tab-bar "+"
 * chooser ("New plan"), or CalendarDaySheet's "+ New plan here" (which also
 * passes a prefill date). Mirrors useCreateMenu's useState pattern.
 */
export function usePlanCreateSheet() {
  const isOpen = useState('plan-create-sheet:open', () => false)
  const prefillDate = useState<string | null>('plan-create-sheet:prefill-date', () => null)

  function open(date?: string) {
    prefillDate.value = date ?? null
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  return { isOpen, prefillDate, open, close }
}
