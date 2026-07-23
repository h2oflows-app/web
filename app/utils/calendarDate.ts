// Calendar date helpers — Trip Calendar (#246 W2).
//
// RULE (binding, per implementation plan §4 "Month grid"): construct Dates
// ONLY as `new Date(y, m-1, d)` (local) — never `new Date(isoString)` for a
// DATE value, which parses as UTC-midnight and off-by-ones at negative UTC
// offsets (e.g. America/Denver). Compare dates as opaque `YYYY-MM-DD`
// strings, not Date objects.

export type YMD = string // 'YYYY-MM-DD'

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

// Local today as YYYY-MM-DD (client's own tz — the server independently
// resolves "user-local today" from user_calendar_prefs.tz for guards like
// mark-paddled; this is for client-side display/defaults only).
export function todayYMD(): YMD {
  return ymd(new Date())
}

// Format a local Date as YYYY-MM-DD using its local y/m/d fields (never
// toISOString(), which shifts to UTC and can roll the date at negative
// offsets).
export function ymd(date: Date): YMD {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

// Parse a YYYY-MM-DD string into a local Date (local midnight), per the
// binding construction rule.
export function parseYMD(s: YMD): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export interface MonthCell {
  ymd: YMD
  dayNum: number
  inMonth: boolean
}

// Build a 7-col matrix (weeks of 7 cells) for the given year/month (1-12),
// with leading/trailing cells from the adjacent months so every week is a
// full row. month is 1-indexed (matches YYYY-MM string convention).
export function monthMatrix(year: number, month: number): MonthCell[] {
  const first = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  const leading = first.getDay() // 0=Sun..6=Sat
  const daysInPrevMonth = new Date(year, month - 1, 0).getDate()

  const cells: MonthCell[] = []

  for (let i = leading - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i
    const prevMonthDate = new Date(year, month - 2, d)
    cells.push({ ymd: ymd(prevMonthDate), dayNum: d, inMonth: false })
  }

  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ ymd: ymd(new Date(year, month - 1, d)), dayNum: d, inMonth: true })
  }

  const trailingNeeded = (7 - (cells.length % 7)) % 7
  for (let d = 1; d <= trailingNeeded; d++) {
    const nextMonthDate = new Date(year, month, d)
    cells.push({ ymd: ymd(nextMonthDate), dayNum: d, inMonth: false })
  }

  return cells
}

export function fmtDate(date: YMD, opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }): string {
  return parseYMD(date).toLocaleDateString('en-US', opts)
}

// e.g. "Jul 22" / "Jul 22–23" (same month) / "Jul 22 – Aug 3" (crosses month)
export function fmtRange(start: YMD, end: YMD): string {
  if (start === end) return fmtDate(start)
  const s = parseYMD(start)
  const e = parseYMD(end)
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
    return `${fmtDate(start)}–${e.getDate()}`
  }
  return `${fmtDate(start)} – ${fmtDate(end)}`
}

export function isPastOrToday(date: YMD): boolean {
  return date <= todayYMD()
}

export function dow(date: YMD): string {
  return parseYMD(date).toLocaleDateString('en-US', { weekday: 'short' })
}

export function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function clientTz(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

// Render a plain "HH:MM[:SS]" time value (never a Date parse — same rule as
// dates: a bare time string has no timezone to get wrong, so just split it).
export function fmtTime(t: string): string {
  const [hStr, mStr] = t.split(':')
  const h = Number(hStr)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${mStr} ${period}`
}
