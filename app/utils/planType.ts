// Plan-type palette — Trip Calendar (#246). Invented palette, distinct from
// the flow-band palette (which is cfs-band-only): personal→primary (theme
// brand color), festival→violet, race→amber, cruise→cyan. Tailwind semantic
// classes with dark: variants — NO hex, so this stays correct across all 12
// themes without per-theme tables.

export type PlanType = 'personal' | 'festival' | 'race' | 'cruise'

export interface PlanTypeMeta {
  label: string
  badgeClass: string
  ribbonClass: string
  dotClass: string
  // Faint cell-background tint for the month grid (bg priority: today >
  // has-plan(this) > pending-invite > has-runs(neutral) > plain) — lighter
  // than badgeClass so the day number stays legible without a text-color pair.
  tintClass: string
}

export const PLAN_TYPE: Record<PlanType, PlanTypeMeta> = {
  personal: {
    label: 'Personal',
    badgeClass: 'bg-primary-100 dark:bg-primary-950/50 text-primary-700 dark:text-primary-400',
    ribbonClass: 'bg-primary-500 dark:bg-primary-400',
    dotClass: 'bg-primary-500 dark:bg-primary-400',
    tintClass: 'bg-primary-50 dark:bg-primary-950/30',
  },
  festival: {
    label: 'Festival',
    badgeClass: 'bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-400',
    ribbonClass: 'bg-violet-500 dark:bg-violet-400',
    dotClass: 'bg-violet-500 dark:bg-violet-400',
    tintClass: 'bg-violet-50 dark:bg-violet-950/30',
  },
  race: {
    label: 'Race',
    badgeClass: 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400',
    ribbonClass: 'bg-amber-500 dark:bg-amber-400',
    dotClass: 'bg-amber-500 dark:bg-amber-400',
    tintClass: 'bg-amber-50 dark:bg-amber-950/30',
  },
  cruise: {
    label: 'Cruise',
    badgeClass: 'bg-cyan-100 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-400',
    ribbonClass: 'bg-cyan-500 dark:bg-cyan-400',
    dotClass: 'bg-cyan-500 dark:bg-cyan-400',
    tintClass: 'bg-cyan-50 dark:bg-cyan-950/30',
  },
}

export const PLAN_TYPES: PlanType[] = ['personal', 'festival', 'race', 'cruise']

export function planTypeMeta(type: string): PlanTypeMeta {
  return PLAN_TYPE[type as PlanType] ?? PLAN_TYPE.personal
}
