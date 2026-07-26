// Shared TS shapes for GET /plans/{handle}/{slug} (+ /plans/{id} alias) —
// Trip Calendar #246 W4, reworked web#354 A1/W1. Mirrors planRun.ts's
// pattern: a plain .ts module (not exported from a .vue SFC) so
// plans/[handle]/[slug].vue, PlanItinerary, PlanMembersRow, PlanCrewMeter/
// Panel, InviteSheet all import the same canonical shape instead of
// drifting local copies.

// planRunSummary (Go) and PlanRunDetail (TS) are the identical field set —
// itinerary rows reuse PlanRunDetail rather than a second drifting type.
import type { PlanRunDetail } from '~/utils/planRun'

// CalendarEventDetail (was PlanDetail) — web#354 A1/W1: `type` and
// `visibility` dropped entirely (event-type + visibility concepts removed).
// Events are owner-only now; looking_for_crew/max_crew live on
// PlanRunDetail (per-run, #246 W5 remodel), never here.
export interface CalendarEventDetail {
  id: string
  slug: string
  name: string
  start_date: string
  end_date: string
  location?: string | null
  host_owner_id: string
  host_handle: string
  created_at: string
  updated_at: string
}

export interface PlanItineraryDay {
  date: string
  runs: PlanRunDetail[]
}

// One row per (member, plan_run) — membership is run-scoped for BOTH
// origins (invite/request) per the remodel: an invite fans out to one row
// per invited run, each independently accepted/declined.
export interface PlanMemberRunStatus {
  plan_run_id: string
  plan_run_name?: string | null
  status: string // invited | requested | accepted | declined
}

// One row per PERSON, aggregating their per-run rows — this is what
// PlanMembersRow renders ("@maya · 2/3 runs" / email chip + invited count).
// A person is either a bound account (handle) or an unresolved email invite
// (invite_email, member_owner_id still NULL server-side).
export interface PlanMemberSummary {
  handle?: string | null
  invite_email?: string | null
  runs: PlanMemberRunStatus[]
  accepted_count: number
  total_count: number
}

// The wire shape GET /plans/{handle}/{slug} actually emits (renderPlan /
// planMember, plans.go): ONE FLAT ROW PER (person, run) — never aggregated
// server-side. `plan_run_id` is null for a plan-level (runless) row.
// PlanMembersRow wants PlanMemberSummary (per-person); use
// aggregatePlanMembers() to bridge the two, rather than teaching the
// component about the flat shape.
//
// TODO(W2): the api's renderPlan (web#354 A1) no longer returns a `members`
// key at all (event-level members/invite plumbing moved off this response —
// invites are per-run, plan_members query dropped from renderPlan). This
// type + aggregatePlanMembers() are effectively dead until W2 removes
// PlanMembersRow's event-page usage per the plan (§4); left in place so
// PlanMembersRow/InviteSheet still compile in the interim (they render an
// always-empty member list, degrading gracefully rather than crashing).
export interface PlanMemberRow {
  handle?: string | null
  invite_email?: string | null
  status: string // invited | requested | accepted | declined
  plan_run_id?: string | null
}

// Groups the API's flat per-(person,run) rows into one PlanMemberSummary per
// person, keyed by handle (falling back to invite_email for unbound
// invitees) — mirrors the "@handle · N/M runs" / "M invited" rollup
// PlanMembersRow renders.
export function aggregatePlanMembers(rows: PlanMemberRow[]): PlanMemberSummary[] {
  const byKey = new Map<string, PlanMemberSummary>()
  for (const row of rows) {
    const key = row.handle ?? row.invite_email
    if (!key) continue // no stable identity to group on — drop rather than fabricate a per-row entry
    let summary = byKey.get(key)
    if (!summary) {
      summary = { handle: row.handle, invite_email: row.invite_email, runs: [], accepted_count: 0, total_count: 0 }
      byKey.set(key, summary)
    }
    if (row.plan_run_id) {
      summary.runs.push({ plan_run_id: row.plan_run_id, status: row.status })
    }
    summary.total_count += 1
    if (row.status === 'accepted') summary.accepted_count += 1
  }
  return Array.from(byKey.values())
}

export interface PlanCrewMeterInfo {
  filled: number
  max?: number | null
}

// One pending run row resolved via a forwarded ?token= — the token-holder's
// plan_members rows aren't bound to member_owner_id yet (e.g. signed up with
// a different email than the invite was sent to), so they won't surface via
// the itinerary's normal my_rsvp/my_member_id resolution (owner_id match)
// or via /me/invites. Carries enough to render its own accept/decline row
// without cross-referencing the itinerary.
//
// TODO(W2): the api's renderPlan (web#354 A1) dropped the `?invite=` token
// carve-out from the event page entirely — it now lives on the run page
// (GET /plan-runs/{param}) per §1. `invite_token_runs` is never populated by
// the current event-detail response; kept so InviteAcceptCard's prop still
// typechecks until W2 moves this plumbing to plan-runs/[id].vue.
export interface PlanInviteTokenRun {
  member_id: string
  plan_run_id: string
  run_name?: string | null
  run_date: string
  run_time?: string | null
}

// web#354 A1 JSON wrapper rename (user-approved): `plan`→`event`. The
// current renderPlan response no longer includes `members`/
// `invite_token_runs` at all (see TODOs above) — kept as optional here so
// consumers degrade to an empty list rather than failing to compile.
export interface PlanDetailResponse {
  event: CalendarEventDetail
  itinerary: PlanItineraryDay[]
  // Flat per-(person,run) rows as emitted by the API — see PlanMemberRow.
  // Pass through aggregatePlanMembers() before handing to PlanMembersRow.
  members?: PlanMemberRow[]
  // Present only when a valid ?invite=<token> was forwarded on the request.
  invite_token_runs?: PlanInviteTokenRun[]
}

// ── GET /plan-runs/{id}/crew (host-only roster, run-scoped) ─────────────

export interface CrewRequest {
  member_id: string
  status: string
  origin: string // request | invite
  message?: string | null
  created_at: string
  handle: string
}

export interface CrewListResponse {
  members: CrewRequest[]
  meter: PlanCrewMeterInfo
}
