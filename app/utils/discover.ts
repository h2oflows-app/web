// Shared TS shapes for GET /discover/plans (#246 W5). Kept as a plain .ts
// module (not exported from a .vue SFC), mirroring plan.ts/planRun.ts's
// pattern, so discover/index.vue and DiscoverPlanCard import the same
// canonical shape instead of drifting local copies.
//
// #246 W5 remodel (IMPLEMENTATION_PLAN.md §6 REVISED 2026-07-25): crew is
// per-run now, so a discover card lists ALL of a plan's crew-call runs
// (`runs_looking_for_crew`), each with its own crew meter + Join button —
// not a single "first upcoming run" summary like the pre-remodel A4 shape.
import type { PlanRunCrew, PlanRunRsvpStatus } from '~/utils/planRun'

export interface DiscoverRun {
  plan_run_id: string
  name?: string | null
  run_date: string
  run_time?: string | null
  class_min?: number | null
  class_max?: number | null
  flow_band?: string | null
  flow_color?: string | null
  gauge_cfs?: number | null
  crew: PlanRunCrew
  // The signed-in caller's own RSVP against this specific run, if any —
  // drives the Join button's optimistic Requested/full-disabled state
  // surviving a page reload (rather than resetting on every fetch).
  my_rsvp?: PlanRunRsvpStatus | null
}

export interface DiscoverPlan {
  id: string
  slug: string
  name: string
  type: string
  host_handle: string
  location?: string | null
  start_date: string
  end_date: string
  runs_looking_for_crew: DiscoverRun[]
}

export interface DiscoverPlansResponse {
  items: DiscoverPlan[]
  has_more: boolean
  next_offset: number
}
