// Shared TS shapes for GET /plan-runs/{id} (plan_runs #246 W3). Kept as a
// plain .ts module (not exported from a .vue SFC) so every consumer —
// PlanRunDetailCard, PlanRunLogSheet's edit-mode fetch, plan-runs/[id].vue —
// imports the same canonical type instead of drifting local copies.

// #246 W5 remodel (IMPLEMENTATION_PLAN.md §6 REVISED 2026-07-25, mig 000144):
// looking_for_crew/max_crew move plans -> plan_runs; crew + the viewer's own
// RSVP are now per-run. `crew` present only when looking_for_crew is true.
export interface PlanRunCrew {
  filled: number
  max?: number | null
}

export type PlanRunRsvpStatus = 'invited' | 'requested' | 'accepted' | 'declined'

export interface PlanRunDetail {
  id: string
  slug: string
  user_reach_id?: string | null
  name?: string | null
  run_date: string
  run_time?: string | null
  sort_order: number
  gauge_cfs?: number | null
  flow_band?: string | null
  flow_color?: string | null
  class_min?: number | null
  class_max?: number | null
  paddled: boolean
  paddled_at?: string | null
  notes?: string | null
  companions?: string | null
  created_at: string
  looking_for_crew: boolean
  max_crew?: number | null
  // Present when looking_for_crew — filled/max for this run's crew meter.
  crew?: PlanRunCrew | null
  // The signed-in viewer's OWN plan_members row against THIS run, if any
  // (invited/requested/accepted/declined) — drives the itinerary row's
  // Join / Accept-Decline / "You're in" state. Absent (undefined) means no
  // relationship yet (host sees their own runs with this always absent).
  my_rsvp?: PlanRunRsvpStatus | null
  // The plan_members row id backing my_rsvp — target for accept/decline.
  my_member_id?: string | null
}

export interface PlanRunDetailPlan {
  id: string
  slug: string
  name: string
  host_handle: string
  visibility: string
  start_date: string
  end_date: string
}
