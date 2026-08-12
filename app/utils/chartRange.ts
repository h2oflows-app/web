// Sheet-variant y-scale range (#431).
//
// uPlot's default y range is the data extent, which put the peak flush against
// the top of the gauge modal — underneath the header scrim — and left every
// threshold outside the data's own min/max off the chart entirely, so a sheet
// could show a dotted "Running" line and no "High" line at all.
//
// GaugeGraph's sheetInsets only reserve SPACE for the chrome; they don't change
// what the scale covers. This does.
//
// Pure and parameterised so it can be exercised directly — the component just
// feeds it uPlot's data extent and the reference-line values.

/** Fraction of the final span added above the highest thing shown. */
export const SHEET_Y_PAD_TOP = 0.14
/** …and below the lowest. Never taken past zero — cfs has a hard floor. */
export const SHEET_Y_PAD_BOTTOM = 0.06

// A threshold far outside the data range would flatten the trace onto the
// baseline: a run whose High is 10,000 cfs sitting at 150 would render as a
// straight line hugging the bottom. Lines are pulled into the range only while
// the data keeps at least this share of the plot height; the rest stay off the
// chart, exactly as they are today. GaugeGraph's drawReferenceLines already
// skips any line outside the range and captionLayout drops its caption with it,
// so an excluded line leaves nothing dangling on the plot.
export const MIN_DATA_SHARE = 0.35

function distanceTo(v: number, lo: number, hi: number): number {
  return v < lo ? lo - v : v > hi ? v - hi : 0
}

/**
 * @param dataMin  uPlot's series minimum (null for an empty series)
 * @param dataMax  uPlot's series maximum
 * @param lineValues  threshold / percentile values that should be on screen
 */
export function sheetYRange(
  dataMin: number | null | undefined,
  dataMax: number | null | undefined,
  lineValues: number[] = [],
): [number, number] {
  if (dataMin == null || dataMax == null || !Number.isFinite(dataMin) || !Number.isFinite(dataMax)) {
    return [0, 1]
  }

  let lo = dataMin
  let hi = dataMax
  const dataSpan = hi - lo
  const maxSpan = dataSpan > 0 ? dataSpan / MIN_DATA_SHARE : Infinity

  // Nearest lines first, so a reachable threshold isn't skipped just because a
  // distant one happened to be considered ahead of it.
  const lines = lineValues
    .filter(v => Number.isFinite(v))
    .sort((a, b) => distanceTo(a, lo, hi) - distanceTo(b, lo, hi))

  for (const v of lines) {
    const nextLo = Math.min(lo, v)
    const nextHi = Math.max(hi, v)
    if (nextHi - nextLo > maxSpan) continue
    lo = nextLo
    hi = nextHi
  }

  // A flat series (or a single reading) has no span to take a percentage of.
  if (hi === lo) {
    const pad = Math.abs(hi) * 0.1 || 1
    return [Math.max(0, lo - pad), hi + pad]
  }

  const span = hi - lo
  return [Math.max(0, lo - span * SHEET_Y_PAD_BOTTOM), hi + span * SHEET_Y_PAD_TOP]
}
