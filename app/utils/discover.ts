// Shared TS shapes for GET /discover/plans (#246 W5, reworked web#354 A1/A2
// — see discover.go's ListPlans doc comment). Kept as a plain .ts module
// (not exported from a .vue SFC), mirroring plan.ts/planRun.ts's pattern, so
// discover/index.vue and DiscoverRunCard import the same canonical shape
// instead of drifting local copies.
//
// web#354 A1 regrouped this endpoint entirely: events dropped the
// visibility concept and are owner-only now, so there's no more per-event
// public gate to browse by. The response is a flat, run_date-sorted list of
// crew-seeking calendar_runs directly (discoverCrewRun) — not
// DiscoverPlan[] each carrying `runs_looking_for_crew`. The route path is
// unchanged (`/discover/plans`), only the shape moved.
import type { PlanCrewMeterInfo } from '~/utils/plan'

export interface DiscoverRun {
  // discoverCrewRun keeps the JSON key `plan_run_id` (discover.go) — it
  // names the /plan-runs/{id} permalink, same convention planRunSummary's
  // own field naming follows (plan.ts doc comment).
  plan_run_id: string
  // Name (web#354 A4) is the calendar run's OWN name — REQUIRED, always
  // populated. ReachName is the attached library run's own name (nil for an
  // orphaned run) — secondary/subtitle only, and only when it differs.
  name: string
  reach_name?: string | null
  host_handle: string
  run_date: string
  run_time?: string | null
  class_min?: number | null
  class_max?: number | null
  flow_band?: string | null
  flow_color?: string | null
  gauge_cfs?: number | null
  // "Meet up at" display text — see planRun.ts PlanRunDetail for the full
  // contract note.
  meetup_spot?: string | null
  crew: PlanCrewMeterInfo
  // NOTE: discoverCrewRun does NOT carry a per-viewer my_rsvp field (unlike
  // the pre-A1 DiscoverRun shape) — there is no server truth to re-derive
  // Join state from on a later re-search; DiscoverRunCard tracks its own
  // client-only optimistic state instead (see that component's doc note).
}

export interface DiscoverRunsResponse {
  items: DiscoverRun[]
  has_more: boolean
  next_offset: number
}
