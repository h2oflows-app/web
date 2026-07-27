// Shared TS shapes for GET /plans/{handle}/{slug} (+ /plans/{id} alias) —
// Trip Calendar #246 W4, reworked web#354 A1/W1. Mirrors planRun.ts's
// pattern: a plain .ts module (not exported from a .vue SFC) so
// plans/[handle]/[slug].vue, PlanItinerary, PlanCrewMeter/Panel, InviteSheet
// all import the same canonical shape instead of drifting local copies.

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

export interface PlanCrewMeterInfo {
  filled: number
  max?: number | null
}

// web#354 A1 JSON wrapper rename (user-approved): `plan`→`event`. Matches
// the current renderPlan response exactly (plans.go) — events are
// owner-only now, so there's no `members`/`invite_token_runs` key at all
// (event-level membership/invite plumbing is gone; invites are per-run, see
// web#354 A2 / invites.go). The `?invite=` token carve-out that used to
// populate a token-run list here moved to the run page (GET
// /plan-runs/{param}) entirely — see planRun.ts / plan-runs/[id].vue.
export interface PlanDetailResponse {
  event: CalendarEventDetail
  itinerary: PlanItineraryDay[]
}

// ── GET /plan-runs/{id}/crew (host-only roster, run-scoped) ─────────────

export interface CrewRequest {
  member_id: string
  status: string
  origin: string // request | invite
  message?: string | null
  created_at: string
  handle: string
  // Owner-only: set only on a still-pending EMAIL invite row (origin=invite,
  // status=invited) — invites.go RunCrewList's "host feedback gap fix"
  // (web#354 A2 review). A handle-based pending invite has `handle` instead
  // and this stays undefined.
  invite_email?: string | null
}

export interface CrewListResponse {
  members: CrewRequest[]
  meter: PlanCrewMeterInfo
}
