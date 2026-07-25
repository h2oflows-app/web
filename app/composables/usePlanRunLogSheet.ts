/**
 * usePlanRunLogSheet — shared open/mode state for PlanRunLogSheet.vue
 * (Trip Calendar #246 W3). Mirrors usePlanCreateSheet's useState pattern so
 * the sheet can be mounted once globally (AppCreateOverlay) and triggered
 * from anywhere: CalendarDaySheet's per-plan "Add a run", PlanRunItem's
 * "Edit" affordance on a planned (unpaddled) run.
 *
 * Two modes only — mirrors the contract's own split:
 *  - create: a NEW plan_runs row under an existing plan (planId + optional
 *    prefill date, e.g. from "+ Add a run" on a specific day).
 *  - edit: an EXISTING *planned* (unpaddled) run — freely editable
 *    (run_date/run_time/notes/companions), and can flip paddled:true here.
 *    Paddled runs are edited on their own /plan-runs/{id} detail page
 *    instead (24h notes-only lock lives there, not in this sheet).
 */
export type PlanRunSheetMode = 'create' | 'edit'

export function usePlanRunLogSheet() {
  const isOpen = useState('plan-run-log-sheet:open', () => false)
  const mode = useState<PlanRunSheetMode>('plan-run-log-sheet:mode', () => 'create')
  const planId = useState<string | null>('plan-run-log-sheet:plan-id', () => null)
  const runId = useState<string | null>('plan-run-log-sheet:run-id', () => null)
  const prefillDate = useState<string | null>('plan-run-log-sheet:prefill-date', () => null)
  // #246 W5: the crew toggle moved into this sheet (from PlanCreateSheet) and
  // the client rule "crew run requires public plan" needs the PARENT plan's
  // visibility to gate/hint — create mode gets it from the caller (already
  // has the plan in hand, e.g. PlanItinerary); edit mode reads it off the
  // GET /plan-runs/{id} response's embedded `plan` alongside the run itself.
  const planVisibility = useState<string | null>('plan-run-log-sheet:plan-visibility', () => null)

  function openCreate(targetPlanId: string, date?: string, visibility?: string) {
    mode.value = 'create'
    planId.value = targetPlanId
    runId.value = null
    prefillDate.value = date ?? null
    planVisibility.value = visibility ?? null
    isOpen.value = true
  }

  function openEdit(targetRunId: string) {
    mode.value = 'edit'
    runId.value = targetRunId
    planId.value = null
    prefillDate.value = null
    planVisibility.value = null // resolved from the fetch response in edit mode
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  return { isOpen, mode, planId, runId, prefillDate, planVisibility, openCreate, openEdit, close }
}
