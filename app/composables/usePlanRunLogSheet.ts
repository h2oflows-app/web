/**
 * usePlanRunLogSheet — shared open/mode state for PlanRunLogSheet.vue, the
 * UNIFIED "+ New" create sheet (web#354 W1 — absorbs the deleted
 * PlanCreateSheet.vue). Mirrors the old usePlanCreateSheet's useState
 * pattern so the sheet can be mounted once globally (AppCreateOverlay) and
 * triggered from anywhere: the calendar "+ New" button, CalendarDaySheet's
 * day-scoped "+ New", PlanRunItem's "Edit" affordance on a planned
 * (unpaddled) run, NudgeCard's "Paddled it".
 *
 * Modes:
 *  - create: unified — the sheet opens with the library-run picker
 *    prominent, plus an explicit "No run — create an Event" branch toggle.
 *    Picking a run -> POSTs the new standalone POST /plan-runs (no parent
 *    event; web#354 decoupled runs entirely, no plan_id). Not picking a run
 *    -> the Event branch (name/date-range/location only, no type pills, no
 *    visibility) -> POSTs POST /plans. Kind is fixed at creation — no
 *    morphing between the two afterward.
 *  - edit: an EXISTING *planned* (unpaddled) run — freely editable
 *    (run_date/run_time/notes/companions), and can flip paddled:true here.
 *    Paddled runs are edited on their own /plan-runs/{id} detail page
 *    instead (24h notes-only lock lives there, not in this sheet).
 *  - confirm: a Tier-A nudge candidate (GET /me/nudge/candidate) — NOT a
 *    calendar_runs row the caller already has open in the sheet's other
 *    senses; posts POST /me/nudge/confirm {user_reach_id,run_date,notes?}
 *    instead of createRun/patchRun. No fetch needed (the candidate is
 *    already fully resolved by nudges.go), no run picker/date/crew/meetup —
 *    just a read-only summary + optional notes. See PlanRunLogSheet.vue's
 *    top-level `mode === 'confirm'` template branch.
 *
 * web#354 W1: `openCreate` drops the old `planId`/`visibility` params (runs
 * are standalone now, no parent event to attach to; the client-side
 * "crew requires a public plan" hint is gone too — the api's only crew gate
 * is a run's own looking_for_crew, see invites.go JoinRun). `openCreateEvent`
 * is new — entry points that want the sheet to open straight into the Event
 * branch (the old "+ New plan" buttons) call this instead of openCreate.
 */
export type PlanRunSheetMode = 'create' | 'edit' | 'confirm'

// Which half of the unified create sheet is showing — only meaningful in
// 'create' mode. Fixed once a run is picked or the "No run" toggle is hit;
// see PlanRunLogSheet.vue's branch-switching guard.
export type PlanRunSheetBranch = 'run' | 'event'

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
  // create-mode branch: 'run' (library-run picker, default) or 'event' (no
  // run picked / entry points that jump straight to event fields).
  const branch = useState<PlanRunSheetBranch>('plan-run-log-sheet:branch', () => 'run')
  const runId = useState<string | null>('plan-run-log-sheet:run-id', () => null)
  const prefillDate = useState<string | null>('plan-run-log-sheet:prefill-date', () => null)
  const confirmMember = useState<ConfirmSheetMember | null>('plan-run-log-sheet:confirm-member', () => null)

  // create mode, run branch (default) — date prefill only; no planId (runs
  // are standalone, web#354).
  function openCreate(date?: string) {
    mode.value = 'create'
    branch.value = 'run'
    runId.value = null
    prefillDate.value = date ?? null
    confirmMember.value = null
    isOpen.value = true
  }

  // create mode, event branch — replaces the deleted PlanCreateSheet's
  // open(date?). Used by every former "+ New plan" entry point.
  function openCreateEvent(date?: string) {
    mode.value = 'create'
    branch.value = 'event'
    runId.value = null
    prefillDate.value = date ?? null
    confirmMember.value = null
    isOpen.value = true
  }

  function openEdit(targetRunId: string) {
    mode.value = 'edit'
    branch.value = 'run'
    runId.value = targetRunId
    prefillDate.value = null
    confirmMember.value = null
    isOpen.value = true
  }

  function openConfirm(member: ConfirmSheetMember) {
    mode.value = 'confirm'
    branch.value = 'run'
    runId.value = null
    prefillDate.value = null
    confirmMember.value = member
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  // Bumped by PlanRunLogSheet after every successful save — pages that render
  // their own itinerary fetch (the event detail page) watch this to refetch.
  // The sheet only refreshes the CALENDAR store itself, which left the event
  // page stale until a manual reload (prod bug, 2026-07-25).
  const savedCount = useState('plan-run-log-sheet:saved-count', () => 0)
  function markSaved() {
    savedCount.value++
  }

  return {
    isOpen, mode, branch, runId, prefillDate, confirmMember,
    savedCount, markSaved, openCreate, openCreateEvent, openEdit, openConfirm, close,
  }
}
