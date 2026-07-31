// displayLabel — canonical "who is this" label for a handle + optional
// display_name pair (display-names feature). Mirrors the api's own
// email/notification label helper: a display name, when set, always shows
// alongside the @handle (never replaces it) so the handle stays the stable,
// unambiguous identifier; a bare handle falls back to "@handle"; no handle
// at all (shouldn't normally happen server-side, but callers may still hold
// a stale/partial object) falls back to ''. Callers with an email fallback
// (invite_email on a handle-less row) should do
// `displayLabel(m.display_name, m.handle) || m.invite_email` themselves —
// this helper never reaches for email, it only knows handle/display_name.
export function displayLabel(
  displayName: string | null | undefined,
  handle: string | null | undefined,
): string {
  const name = displayName?.trim()
  if (name) return handle ? `${name} (@${handle})` : name
  return handle ? `@${handle}` : ''
}
