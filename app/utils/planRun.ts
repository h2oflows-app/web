// Shared TS shapes for GET /plan-runs/{id} (plan_runs #246 W3, reworked
// web#354 A1/W1). Kept as a plain .ts module (not exported from a .vue SFC)
// so every consumer — PlanRunDetailCard, PlanRunLogSheet's edit-mode fetch,
// plan-runs/[id].vue — imports the same canonical type instead of drifting
// local copies.

// PlanRunCrew (was #246 W5's per-run crew shape) — web#354 A1: the api's
// planRunSummary now nests LookingForCrew INSIDE this embed (never a
// top-level field on the run) and `crew` is ALWAYS present on the response
// (not conditional on looking_for_crew) — see plan_runs.go/plans.go
// (runCrewMeter). Verified against the A1 branch's actual JSON, not just the
// plan doc.
export interface PlanRunCrew {
  filled: number
  max?: number | null
  looking_for_crew: boolean
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
  // "Meet up at" (product request 2026-07-25) — display text is a snapshot
  // (typed free-text OR the picked feature's name at pick-time; survives the
  // feature being deleted/re-imported later). meetup_feature_type/id are the
  // nullable soft ref, present only when the spot was picked from one of the
  // run's own features (rapid vs access, #312) rather than typed. Verified
  // against the api's meetup patch (plan_runs.go planRunSummary) — these
  // flat field names are the RESPONSE shape only; the request body for
  // create/patch nests `meetup_feature: {type, id}` instead (usePlans.ts).
  meetup_spot?: string | null
  meetup_feature_type?: 'rapid' | 'access' | null
  meetup_feature_id?: string | null
  // The underlying river run's OWN slug/owner handle (distinct from this
  // plan_run's `slug` above) — needed to fetch that run's rapids/access
  // points for the meet-up-spot suggestion combobox in edit mode. Verified
  // against renderPlanRun (plan_runs.go, #246 W5 review "should" fix) — a
  // null/undefined owner handle means the run is the caller's own (fetch via
  // /me/runs/{slug} instead of the public /users/{handle}/runs/{slug}).
  user_reach_slug?: string | null
  user_reach_owner_handle?: string | null
  // Always present (web#354 A1) — filled/max/looking_for_crew for this run's
  // crew meter, never conditional/absent.
  crew: PlanRunCrew
  // web#354 A2: true when the viewer is this run's own owner (plans.go
  // renderPlan always sets this true — its itinerary is host-only by
  // construction; plan_runs.go renderPlanRun compares callerID against the
  // run's owner_id). Always populated (not optional) — drives the
  // owner-only affordances (edit notes, delete) on PlanRunDetailCard, which
  // previously had no ownership signal to key off at all.
  is_owner: boolean
  // The signed-in viewer's OWN plan_members row against THIS run, if any
  // (invited/requested/accepted/declined) — drives the itinerary row's
  // Join / Accept-Decline / "You're in" state. Absent (undefined) means no
  // relationship yet (host sees their own runs with this always absent).
  my_rsvp?: PlanRunRsvpStatus | null
  // The plan_members row id backing my_rsvp — target for accept/decline.
  my_member_id?: string | null
}

// PlanRunDetailPlan REMOVED (web#354 A1): GET /plan-runs/{id}'s response no
// longer wraps a `plan` alongside `run` at all — runs are standalone
// (decoupled from any specific event), so the response is just `{run}`. See
// plan_runs.go renderPlanRun's comment: "drop the `plan` wrapper — the run
// is standalone now, its fields stay flat under `run`." Consumers
// (pages/plan-runs/[id].vue, PlanRunDetailCard.vue) read `run` only now —
// owner-derived affordances that used to key off `plan.host_handle` are
// restored via the flat `is_owner` field above instead (web#354 A2/W2).
