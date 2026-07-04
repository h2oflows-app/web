// Run-feature editor: the 7 palette types + shared metadata.
//
// These map onto the existing rapids / reach_access tables the KML importer
// already writes (issue #312). The editor never touches put_in / take_out —
// those are owned by wizard steps 1-2 and rendered as locked pins.
//
// Palette 'access' persists as DB access_type 'intermediate' (the enum has no
// 'access' value); the mapping lives in runWizard's load/serialize helpers.
//
// Single source of truth for type → label/color/river-snap/table, imported by
// the store, the feature-mode sheet, the feature form, and RunWizardMap.

export type RunFeatureType =
  | 'rapid' | 'surf' | 'hazard'                    // → rapids table
  | 'camp' | 'parking' | 'boat_ramp' | 'access'    // → reach_access table
  | 'shuttle_drop'                                 // legacy reach_access; loadable/editable, not in palette

export interface RunFeatureTypeMeta {
  key: RunFeatureType
  label: string
  color: string            // pin color (matches featureIcons PIN_COLORS, access = green)
  isRiver: boolean         // river feature → snaps to the flowline
  table: 'rapids' | 'access'
  descPlaceholder: string
  namePlaceholder: string
}

// Palette order (7, no Shuttle). Colors are the semantic pin colors; access is
// GREEN (#16a34a) per the handoff — keep featureIcons PIN_COLORS.intermediate in sync.
export const RUN_FEATURE_TYPES: RunFeatureTypeMeta[] = [
  { key: 'rapid',     label: 'Rapid',     color: '#3b82f6', isRiver: true,  table: 'rapids', namePlaceholder: 'e.g. House Rock',       descPlaceholder: 'Line, moves, what to expect…' },
  { key: 'surf',      label: 'Surf wave', color: '#3b82f6', isRiver: true,  table: 'rapids', namePlaceholder: 'e.g. Glory Hole',       descPlaceholder: 'Best flows, eddy access…' },
  { key: 'hazard',    label: 'Hazard',    color: '#dc2626', isRiver: true,  table: 'rapids', namePlaceholder: 'e.g. Low-head dam',     descPlaceholder: 'What it is, how to avoid it, portage side…' },
  { key: 'camp',      label: 'Campsite',  color: '#f59e0b', isRiver: false, table: 'access', namePlaceholder: 'e.g. River Right Camp', descPlaceholder: 'Capacity, permits, water…' },
  { key: 'parking',   label: 'Parking',   color: '#dc2626', isRiver: false, table: 'access', namePlaceholder: 'e.g. Take-out lot',     descPlaceholder: 'Fees, shuttle notes…' },
  { key: 'boat_ramp', label: 'Boat ramp', color: '#0ea5e9', isRiver: false, table: 'access', namePlaceholder: 'e.g. Kermitts ramp',    descPlaceholder: 'Surface, trailer access…' },
  { key: 'access',    label: 'Access',    color: '#16a34a', isRiver: false, table: 'access', namePlaceholder: 'e.g. Trail access',     descPlaceholder: 'Trail, ownership, etiquette…' },
]

// Legacy shuttle_drop — editable if loaded from an existing run, but never offered in the palette.
const LEGACY_SHUTTLE_META: RunFeatureTypeMeta = {
  key: 'shuttle_drop', label: 'Shuttle', color: '#a855f7', isRiver: false, table: 'access',
  namePlaceholder: 'e.g. Shuttle drop', descPlaceholder: 'Notes…',
}

const BY_KEY: Record<string, RunFeatureTypeMeta> = Object.fromEntries(
  [...RUN_FEATURE_TYPES, LEGACY_SHUTTLE_META].map(t => [t.key, t]),
)

export function featureTypeMeta(key: RunFeatureType): RunFeatureTypeMeta {
  return BY_KEY[key] ?? BY_KEY.access!
}

export function featureDefaultLabel(key: RunFeatureType): string {
  return featureTypeMeta(key).label
}

export function isRiverFeatureType(key: RunFeatureType): boolean {
  return featureTypeMeta(key).isRiver
}

// Class-chip labels (rapids) and their numeric class_rating values.
export const RUN_FEATURE_CLASS_CHIPS: { label: string; value: number }[] = [
  { label: 'II',   value: 2   },
  { label: 'III',  value: 3   },
  { label: 'III+', value: 3.5 },
  { label: 'IV',   value: 4   },
  { label: 'IV+',  value: 4.5 },
  { label: 'V',    value: 5   },
]

// Hazard-type chips (free-text stored in rapids.hazard_type).
export const RUN_FEATURE_HAZARD_CHIPS: string[] = [
  'Low-head dam', 'Diversion', 'Strainer', 'Sieve', 'Undercut', 'Ledge / hole', 'Other',
]
