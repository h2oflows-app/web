// Shared TS shapes for GET /plans/{handle}/{slug} (+ /plans/{id} alias) —
// Trip Calendar #246 W4. Mirrors planRun.ts's pattern: a plain .ts module (not
// exported from a .vue SFC) so plans/[handle]/[slug].vue, PlanItinerary,
// PlanMembersRow, PlanCrewMeter/Panel, InviteSheet all import the same
// canonical shape instead of drifting local copies. Never bare `Plan` —
// these ARE the canonical `Plan`/`PlanMember` types per the naming rules.

// planRunSummary (Go) and PlanRunDetail (TS) are the identical field set —
// itinerary rows reuse PlanRunDetail rather than a second drifting type.
import type { PlanRunDetail } from '~/utils/planRun'

export interface PlanDetail {
  id: string
  slug: string
  name: string
  type: string
  visibility: string
  start_date: string
  end_date: string
  location?: string | null
  looking_for_crew: boolean
  max_crew?: number | null
  host_owner_id: string
  host_handle: string
  created_at: string
  updated_at: string
}

export interface PlanItineraryDay {
  date: string
  runs: PlanRunDetail[]
}

export interface PlanMember {
  handle: string
  status: string // invited | requested | accepted | declined
}

export interface PlanCrewMeterInfo {
  filled: number
  max?: number | null
}

export interface PlanDetailResponse {
  plan: PlanDetail
  itinerary: PlanItineraryDay[]
  members: PlanMember[]
  crew: PlanCrewMeterInfo
}

// ── GET /plans/{id}/crew (host-only roster) ──────────────────────────────

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
