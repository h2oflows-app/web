// Shared TS shapes for GET /plan-runs/{id} (plan_runs #246 W3). Kept as a
// plain .ts module (not exported from a .vue SFC) so every consumer —
// PlanRunDetailCard, PlanRunLogSheet's edit-mode fetch, plan-runs/[id].vue —
// imports the same canonical type instead of drifting local copies.

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
  paddled: boolean
  paddled_at?: string | null
  notes?: string | null
  companions?: string | null
  created_at: string
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
