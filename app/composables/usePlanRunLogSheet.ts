/**
 * usePlanRunLogSheet — shared open/mode state for PlanRunLogSheet.vue
 * (Trip Calendar #246 W3, confirm mode added W6). Mirrors usePlanCreateSheet's
 * useState pattern so the sheet can be mounted once globally (AppCreateOverlay)
 * and triggered from anywhere: CalendarDaySheet's per-plan "Add a run",
 * PlanRunItem's "Edit" affordance on a planned (unpaddled) run, NudgeCard's
 * "Paddled it".
 *
 * Three modes — mirrors the contract's own split:
 *  - create: a NEW plan_runs row under an existing plan (planId + optional
 *    prefill date, e.g. from "+ Add a run" on a specific day).
 *  - edit: an EXISTING *planned* (unpaddled) run — freely editable
 *    (run_date/run_time/notes/companions), and can flip paddled:true here.
 *    Paddled runs are edited on their own /plan-runs/{id} detail page
 *    instead (24h notes-only lock lives there, not in this sheet).
 *  - confirm: a Tier-A nudge candidate (GET /me/nudge/candidate) — NOT a
 *    plan_runs row the caller already has open in the sheet's other senses;
 *    posts POST /me/nudge/confirm {user_reach_id,run_date,notes?} instead of
 *    addRun/patchRun. No fetch needed (the candidate is already fully
 *    resolved by nudges.go), no run picker/date/crew/meetup — just a
 *    read-only summary + optional notes. See PlanRunLogSheet.vue's top-level
 *    `mode === 'confirm'` template branch.
 */
export type PlanRunSheetMode = 'create' | 'edit' | 'confirm'

// Minimal shape needed to render the confirm-mode summary — matches
// useNudge.ts's NudgeMember field-for-field (kept as a local structural type,
// not an import, so this composable never needs to know about useNudge).
export interface ConfirmSheetMember {
  user_reach_id: string
  run_name: string
  run_date: string
  flow_band: string
  gauge_cfs?: number | null
}

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
  const confirmMember = useState<ConfirmSheetMember | null>('plan-run-log-sheet:confirm-member', () => null)

  function openCreate(targetPlanId: string, date?: string, visibility?: string) {
    mode.value = 'create'
    planId.value = targetPlanId
    runId.value = null
    prefillDate.value = date ?? null
    planVisibility.value = visibility ?? null
    confirmMember.value = null
    isOpen.value = true
  }

  function openEdit(targetRunId: string) {
    mode.value = 'edit'
    runId.value = targetRunId
    planId.value = null
    prefillDate.value = null
    planVisibility.value = null // resolved from the fetch response in edit mode
    confirmMember.value = null
    isOpen.value = true
  }

  function openConfirm(member: ConfirmSheetMember) {
    mode.value = 'confirm'
    runId.value = null
    planId.value = null
    prefillDate.value = null
    planVisibility.value = null
    confirmMember.value = member
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  // Bumped by PlanRunLogSheet after every successful save — pages that render
  // their own itinerary fetch (the plan detail page) watch this to refetch.
  // The sheet only refreshes the CALENDAR store itself, which left the plan
  // page stale until a manual reload (prod bug, 2026-07-25).
  const savedCount = useState('plan-run-log-sheet:saved-count', () => 0)
  function markSaved() {
    savedCount.value++
  }

  return {
    isOpen, mode, planId, runId, prefillDate, planVisibility, confirmMember,
    savedCount, markSaved, openCreate, openEdit, openConfirm, close,
  }
}
