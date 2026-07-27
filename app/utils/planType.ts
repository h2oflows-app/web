// Event color — Trip Calendar (web#354 W1). The event-type concept
// (personal/festival/race/cruise) is REMOVED entirely (issue #354, decided
// 2026-07-26): no enum, no per-type palette, no pills/badges — the event's
// title carries whatever semantics `type` used to. A single consistent color
// distinguishes Events from Runs (flow-band dots) on the calendar. Tailwind
// semantic classes with dark: variants — NO hex, so this stays correct
// across all 12 themes without per-theme tables.
export const EVENT_COLOR = {
  ribbonClass: 'bg-primary-500 dark:bg-primary-400',
  dotClass: 'bg-primary-500 dark:bg-primary-400',
  tintClass: 'bg-primary-50 dark:bg-primary-950/30',
} as const
