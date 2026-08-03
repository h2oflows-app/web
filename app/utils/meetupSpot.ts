// Shared types + helpers for the "Meet up at" field (calendar #246 W5.x,
// product request 2026-07-25 — "necessity" so invitees/crew know where to
// gather for a plan_run).
//
// Storage contract (verified against the api's meetup-spot patch on
// feat/246-crew-per-run, plan_runs.go) — these are the RESPONSE field names
// (GET /plan-runs/{id}); the create/patch REQUEST body nests the picked
// feature as `meetup_feature: {type, id}` instead (see usePlans.ts):
//   meetup_spot          TEXT     — display text, either typed free-text or
//                                   the picked feature's name (a snapshot:
//                                   survives the feature being deleted/re-
//                                   imported later).
//   meetup_feature_type  rapid | access | null — discriminates which table
//                                   meetup_feature_id points into.
//   meetup_feature_id    uuid | null — ON DELETE SET NULL on the source row;
//                                   meetup_spot text is untouched if the ref
//                                   goes null out from under it.
//
// Suggestion source: there is no dedicated features-only endpoint yet — this
// reuses the #312 rapids/access_points arrays already embedded in the full
// run-detail payload (GET /me/runs/{slug}, GET /users/{handle}/runs/{slug}).
// If/when the api adds a lighter dedicated endpoint, only
// fetchMeetupSuggestions below needs to change.

import { featureTypeMeta, type RunFeatureType } from '~/utils/runFeatureTypes'

export type MeetupFeatureType = 'rapid' | 'access'

export interface MeetupFeatureRef {
  type: MeetupFeatureType
  id: string
}

export interface MeetupSuggestion {
  // 'endpoint' = the run's own put-in/take-out — synthetic text-only
  // suggestions (no feature ref; the api's meetup_feature validation only
  // accepts rapids + the meetup-eligible access types).
  type: MeetupFeatureType | 'endpoint'
  id: string
  name: string
  // access_type (camp/parking/boat_ramp/intermediate/shuttle_drop) — undefined for rapids.
  accessType?: string
  isSurfWave?: boolean
}

// Wire shapes — mirrors api's userReachRapid / userReachAccessPoint
// (internal/handlers/user_reaches.go) for the fields this uses.
// line_position (#388): fractional 0-1 position along the run's centerline,
// ASC = upstream->downstream. Each array already arrives sorted by it, but
// sorted-within-type isn't sorted-across-types -- see suggestionsFromRunDetail.
interface WireRapid {
  id: string
  name: string
  is_surf_wave?: boolean
  line_position?: number | null
}
interface WireAccessPoint {
  id: string
  access_type: string
  name?: string | null
  line_position?: number | null
}
interface WireRunDetail {
  rapids?: WireRapid[]
  access_points?: WireAccessPoint[]
}

// put_in/take_out are the run's own endpoints, not meet-up-eligible features
// (spec: rapids + access points with access_type camp/parking/boat_ramp/
// intermediate/shuttle_drop) — excluded here.
const MEETUP_ELIGIBLE_ACCESS_TYPES = new Set(['camp', 'parking', 'boat_ramp', 'intermediate', 'shuttle_drop'])

export function suggestionsFromRunDetail(data: WireRunDetail): MeetupSuggestion[] {
  // Every run has a put-in and take-out on its flow line — offer them first
  // (product request 2026-07-25). Text-only picks: no feature ref is sent.
  // They're also the line's true 0/1 extremes, so "first" here already
  // agrees with the upstream->downstream order applied to everything below.
  const endpoints: MeetupSuggestion[] = [
    { type: 'endpoint', id: 'put-in', name: 'River Put-In' },
    { type: 'endpoint', id: 'take-out', name: 'River Take-Out' },
  ]

  type Positioned = { linePosition: number; suggestion: MeetupSuggestion }

  const rapids: Positioned[] = (data.rapids ?? [])
    .filter(r => !!r.name)
    .map(r => ({
      linePosition: r.line_position ?? Infinity,
      suggestion: { type: 'rapid', id: r.id, name: r.name, isSurfWave: !!r.is_surf_wave } as MeetupSuggestion,
    }))

  const access: Positioned[] = (data.access_points ?? [])
    .filter(a => !!a.name && MEETUP_ELIGIBLE_ACCESS_TYPES.has(a.access_type))
    .map(a => ({
      linePosition: a.line_position ?? Infinity,
      suggestion: { type: 'access', id: a.id, name: a.name as string, accessType: a.access_type } as MeetupSuggestion,
    }))

  // #388: rapids and access_points each arrive from the api pre-sorted
  // upstream->downstream WITHIN their own type, but concatenating them (as
  // this used to do) doesn't interleave ACROSS types — a rapid at
  // line_position 0.3 must sort before an access point at 0.6. A single
  // stable sort over the merged set does that correctly (both inputs are
  // already internally sorted, so this amounts to a merge-by-position).
  // Missing positions (no centerline, or a feature placed with no coords)
  // sort last rather than colliding at 0.
  const features = [...rapids, ...access]
    .sort((a, b) => a.linePosition - b.linePosition)
    .map(p => p.suggestion)

  return [...endpoints, ...features]
}

// Maps a suggestion onto the existing run-feature palette (runFeatureTypes.ts)
// for a cheap color/label chip — reuses the palette rather than inventing a
// second one for this combobox.
function paletteKeyForSuggestion(s: MeetupSuggestion): RunFeatureType {
  if (s.type === 'endpoint') return 'access' // green access chip for put-in/take-out
  if (s.type === 'rapid') return s.isSurfWave ? 'surf' : 'rapid'
  if (s.accessType === 'intermediate') return 'access' // DB value 'intermediate' == palette 'access'
  return (s.accessType as RunFeatureType) ?? 'access'
}

export function suggestionChipLabel(s: MeetupSuggestion): string {
  return featureTypeMeta(paletteKeyForSuggestion(s)).label
}

export function suggestionChipColor(s: MeetupSuggestion): string {
  return featureTypeMeta(paletteKeyForSuggestion(s)).color
}

// Fetch helper — reach identified either by {slug, handle} (public run, any
// owner — community picks) or {slug} alone with an auth token (own run via
// /me/runs/{slug}). Fails soft (empty array) on any network/parse error so
// callers can fetchDone-gate without a separate error branch.
export async function fetchMeetupSuggestions(
  apiBase: string,
  ref: { slug: string; handle?: string | null },
  token?: string | null,
): Promise<MeetupSuggestion[]> {
  const url = ref.handle
    ? `${apiBase}/api/v1/users/${ref.handle}/runs/${ref.slug}`
    : `${apiBase}/api/v1/me/runs/${ref.slug}`
  const headers: Record<string, string> = {}
  if (!ref.handle && token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(url, { headers }).catch(() => null)
  if (!res?.ok) return []
  const data = await res.json().catch(() => null)
  if (!data) return []
  return suggestionsFromRunDetail(data)
}
