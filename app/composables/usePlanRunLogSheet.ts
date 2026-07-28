/**
 * usePlanRunLogSheet — shared open/mode state for PlanRunLogSheet.vue, the
 * UNIFIED "+ New" create sheet (web#354 W1 — absorbs the deleted
 * PlanCreateSheet.vue; W5 — collapses the old explicit "Pick a run" / "No
 * run — create an Event" branch toggle into one form). Mirrors the old
 * usePlanCreateSheet's useState pattern so the sheet can be mounted once
 * globally (AppCreateOverlay) and triggered from anywhere: the calendar
 * "+ New" button, CalendarDaySheet's day-scoped "+ New", the global "+"
 * chooser (CreateChooserSheet), PlanRunItem's "Edit" affordance on a planned
 * (unpaddled) run, NudgeCard's "Paddled it".
 *
 * Modes:
 *  - create: ONE form. Opens with the event fields (name/date-range/
 *    location) plus an optional inline "Run" field — tap "Add a run" to open
 *    the My runs | Community picker. No run picked at save time -> POSTs
 *    POST /plans (an Event). A run picked -> the name/date-range/location
 *    fields hide (the run supplies the name; its date collapses to a single
 *    day) and the run-specific fields (date/time/meetup/crew/log) appear ->
 *    POSTs the standalone POST /plan-runs (no parent event; web#354 decoupled
 *    runs entirely, no plan_id). Clearing a picked run restores the event
 *    fields with whatever was already typed intact. Kind is decided in-sheet
 *    by whether a run ends up picked, not by which opener was called — there
 *    is only one create opener now (see openCreate below).
 *  - edit: an EXISTING *planned* (unpaddled) run — freely editable
 *    (run_date/run_time/notes/companions), and can flip paddled:true here.
 *    Paddled runs are edited on their own /plan-runs/{id} detail page
 *    instead (24h notes-only lock lives there, not in this sheet). No event
 *    editing exists yet — this mode only ever targets a run.
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
 * is a run's own looking_for_crew, see invites.go JoinRun).
 *
 * web#354 W5: `openCreateEvent` and the `branch` state it drove are REMOVED
 * — every entry point that used to jump straight to the event branch now
 * calls the same `openCreate(date?)` the neutral "+ New" always used, since
 * the unified form shows the event fields by default regardless (the run
 * picker is an optional add-on, not a fork).
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
  const runId = useState<string | null>('plan-run-log-sheet:run-id', () => null)
  const prefillDate = useState<string | null>('plan-run-log-sheet:prefill-date', () => null)
  const confirmMember = useState<ConfirmSheetMember | null>('plan-run-log-sheet:confirm-member', () => null)

  // create mode, the ONLY create opener (web#354 W5) — date prefill only; no
  // planId (runs are standalone), no branch (the sheet itself decides Event
  // vs Run based on whether the optional Run field ends up picked).
  function openCreate(date?: string) {
    mode.value = 'create'
    runId.value = null
    prefillDate.value = date ?? null
    confirmMember.value = null
    isOpen.value = true
  }

  function openEdit(targetRunId: string) {
    mode.value = 'edit'
    runId.value = targetRunId
    prefillDate.value = null
    confirmMember.value = null
    isOpen.value = true
  }

  function openConfirm(member: ConfirmSheetMember) {
    mode.value = 'confirm'
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
    isOpen, mode, runId, prefillDate, confirmMember,
    savedCount, markSaved, openCreate, openEdit, openConfirm, close,
  }
}
