// Shared TS shapes for GET /plans/{handle}/{slug} (+ /plans/{id} alias) —
// Trip Calendar #246 W4. Mirrors planRun.ts's pattern: a plain .ts module (not
// exported from a .vue SFC) so plans/[handle]/[slug].vue, PlanItinerary,
// PlanMembersRow, PlanCrewMeter/Panel, InviteSheet all import the same
// canonical shape instead of drifting local copies. Never bare `Plan` —
// these ARE the canonical `Plan`/`PlanMember` types per the naming rules.

// planRunSummary (Go) and PlanRunDetail (TS) are the identical field set —
// itinerary rows reuse PlanRunDetail rather than a second drifting type.
import type { PlanRunDetail } from '~/utils/planRun'

// #246 W5 remodel (IMPLEMENTATION_PLAN.md §6 REVISED 2026-07-25): a plan is
// just the container — looking_for_crew/max_crew/crew live on PlanRunDetail
// now, never on PlanDetail.
export interface PlanDetail {
  id: string
  slug: string
  name: string
  type: string
  visibility: string
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
export interface PlanInviteTokenRun {
  member_id: string
  plan_run_id: string
  run_name?: string | null
  run_date: string
  run_time?: string | null
}

export interface PlanDetailResponse {
  plan: PlanDetail
  itinerary: PlanItineraryDay[]
  members: PlanMemberSummary[]
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
