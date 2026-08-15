// One relative-age formatter (#437).
//
// There were six, disagreeing on four day formats, two hour formats and three
// prefixes — the same instant rendered as "8d 20h ago", "8d ago", "Updated 8d
// ago" or "Aug 4" depending on the component. Two of them (GaugeDetailModal,
// RunsMap) had no day rollover at all until 1092432, so a reading eight days
// old showed as "212h 22m ago" and got reported as a data bug. That is the
// failure mode of six copies: a rule gets fixed in four of them.
//
// The options below are the differences that are real. Everything else is not
// a preference, it is drift.

export interface RelativeAgeOptions {
  /** Leading word, e.g. 'Updated' → "Updated 3h ago". */
  prefix?: string
  /**
   * 'coarse' → "3h ago" / "2d ago"; 'fine' → "3h 12m ago" / "2d 4h ago".
   * A modal reading one gauge wants fine; a dense row of many wants coarse.
   */
  precision?: 'coarse' | 'fine'
  /**
   * Past this many days, render an absolute date instead. "95d ago" is a number
   * nobody can picture, and by then the date is what you actually want.
   * Default 30 — long enough that a live gauge never hits it.
   */
  absoluteAfterDays?: number
  /** Render exactly one day ago as "Yesterday". Reads well in a social feed,
   *  oddly in a gauge chip ("Stale · Yesterday"), so it is opt-in. */
  yesterday?: boolean
  /** Text for under a minute. */
  nowLabel?: string
}

const MINUTE = 60_000

/**
 * Relative age of `input`, or '' when there is nothing to render.
 *
 * Accepts an ISO string, a Date, or a count of MINUTES already elapsed (number)
 * — the last because GaugePollStatus computes the age itself to make decisions
 * before formatting it.
 */
export function formatRelativeAge(
  input: string | Date | number | null | undefined,
  options: RelativeAgeOptions = {},
): string {
  const {
    prefix,
    precision = 'coarse',
    absoluteAfterDays = 30,
    yesterday = false,
    nowLabel = 'just now',
  } = options

  const parsed = toMinutesAndDate(input)
  if (!parsed) return ''
  const { minutes, date } = parsed

  const body = phrase(minutes, date, { precision, absoluteAfterDays, yesterday, nowLabel })
  return prefix ? `${prefix} ${body}` : body
}

function toMinutesAndDate(
  input: string | Date | number | null | undefined,
): { minutes: number; date: Date | null } | null {
  if (input == null) return null

  if (typeof input === 'number') {
    // Already-elapsed minutes. No date to fall back to, so an absolute
    // rendering is unavailable for this form — see phrase().
    if (!Number.isFinite(input)) return null
    return { minutes: Math.max(0, Math.floor(input)), date: null }
  }

  const date = input instanceof Date ? input : new Date(input)
  const ms = date.getTime()
  if (!Number.isFinite(ms)) return null
  // A clock skew or a source stamping slightly ahead reads as "just now"
  // rather than a negative age.
  return { minutes: Math.max(0, Math.floor((Date.now() - ms) / MINUTE)), date }
}

function phrase(
  minutes: number,
  date: Date | null,
  o: Required<Pick<RelativeAgeOptions, 'precision' | 'absoluteAfterDays' | 'yesterday' | 'nowLabel'>>,
): string {
  if (minutes < 1) return o.nowLabel
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return o.precision === 'fine' ? `${hours}h ${minutes % 60}m ago` : `${hours}h ago`
  }

  const days = Math.floor(hours / 24)
  // Only the Date form can render an absolute date; the minutes form has no
  // origin to format, so it keeps counting days rather than returning nothing.
  if (date && days >= o.absoluteAfterDays) {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }
  if (o.yesterday && days === 1) return 'Yesterday'
  return o.precision === 'fine' ? `${days}d ${hours % 24}h ago` : `${days}d ago`
}
