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
// THE RUN'S THRESHOLDS SIZE THE AXIS, not the data. Every reference line is
// always inside the range — no exceptions, no conditions. An earlier cut of
// this only pulled a line in while the data kept a minimum share of the plot
// height, which meant the High line stayed off-chart on exactly the runs where
// you most want to see it: the ones sitting well below it. "Sometimes you get a
// High line" is worse than either alternative, because you can't tell by
// looking whether the run has no High threshold or just isn't near it.
//
// The trade-off is real and accepted: a run at 150 cfs whose High is 10,000
// draws its trace low and flat. That IS the shape of "you are nowhere near
// high water", and the dotted lines and their captions carry the numbers.
//
// Pure and parameterised so it can be exercised directly — the component just
// feeds it uPlot's data extent and the reference-line values.

/** Fraction of the final span added above the highest thing shown — the
 *  headroom #431 asks for, so the trace never touches the header scrim and
 *  there is air above the high-water mark. */
export const SHEET_Y_PAD_TOP = 0.14
/** …and below the lowest. Never taken past zero — cfs has a hard floor. */
export const SHEET_Y_PAD_BOTTOM = 0.06

/**
 * @param dataMin     uPlot's series minimum (null for an empty series)
 * @param dataMax     uPlot's series maximum
 * @param lineValues  every threshold / percentile on the run. All are included.
 */
export function sheetYRange(
  dataMin: number | null | undefined,
  dataMax: number | null | undefined,
  lineValues: number[] = [],
): [number, number] {
  const lines = lineValues.filter(v => typeof v === 'number' && Number.isFinite(v))

  // An empty or non-finite series still ranges off the thresholds when it has
  // them: the sheet renders "No readings in this window" over a plot whose
  // lines are at least in the right places, rather than over a blank 0–1.
  const hasData = dataMin != null && dataMax != null
    && Number.isFinite(dataMin) && Number.isFinite(dataMax)
  if (!hasData && lines.length === 0) return [0, 1]

  let lo = hasData ? dataMin! : Math.min(...lines)
  let hi = hasData ? dataMax! : Math.max(...lines)
  for (const v of lines) {
    if (v < lo) lo = v
    if (v > hi) hi = v
  }

  // A flat series with no lines (or a single reading) has no span to take a
  // percentage of.
  if (hi === lo) {
    const pad = Math.abs(hi) * 0.1 || 1
    return [Math.max(0, lo - pad), hi + pad]
  }

  const span = hi - lo
  return [Math.max(0, lo - span * SHEET_Y_PAD_BOTTOM), hi + span * SHEET_Y_PAD_TOP]
}
