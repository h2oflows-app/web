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

  function openCreate(targetPlanId: string, date?: string) {
    mode.value = 'create'
    planId.value = targetPlanId
    runId.value = null
    prefillDate.value = date ?? null
    isOpen.value = true
  }

  function openEdit(targetRunId: string) {
    mode.value = 'edit'
    runId.value = targetRunId
    planId.value = null
    prefillDate.value = null
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  return { isOpen, mode, planId, runId, prefillDate, openCreate, openEdit, close }
}
