// Sheet-variant y-scale range (#431).
//
// uPlot's default y range is the bare data extent, so the peak sat flush against
// the top of the gauge modal — underneath the header scrim — with no air above
// it. GaugeGraph's sheetInsets only reserve SPACE for the chrome; they don't
// change what the scale covers. This does.
//
// THE READING SIZES THE AXIS, and it is normalised: the highest value in the
// window always lands at the same height on the plot, so every gauge reads the
// same way regardless of level or volatility. A steady creek at 320 cfs and a
// big volatile river at 3,200 produce the same picture — trace filling most of
// the plot, a consistent band of headroom above it.
//
// Thresholds deliberately do NOT stretch the range. A High threshold an order of
// magnitude above current flow would squash the trace onto the baseline, which
// is what made the "every threshold on screen" version unusable on most runs.
// Lines inside the window still draw; ones outside are skipped by
// drawReferenceLines, and captionLayout drops their captions with them, so
// nothing is left dangling.
//
// Pure and parameterised so it can be exercised directly.

/** Where the highest reading sits in the plot. The remainder is headroom. */
export const PEAK_HEIGHT = 0.78
/** Air below the lowest reading, as a fraction of the effective span. */
export const FLOOR_PAD = 0.10
/**
 * Floor on the span, relative to the level. A river holding steady has a span
 * near zero, and padding a fraction of nothing is nothing — without this a flat
 * gauge gets a hairline window and renders its sensor noise as dramatic
 * mountains. This is what stops a percentage-of-span rule from lying.
 */
export const MIN_SPAN_FRACTION = 0.12

/**
 * @param dataMin  uPlot's series minimum (null for an empty series)
 * @param dataMax  uPlot's series maximum
 */
export function sheetYRange(
  dataMin: number | null | undefined,
  dataMax: number | null | undefined,
): [number, number] {
  const usable = dataMin != null && dataMax != null
    && Number.isFinite(dataMin) && Number.isFinite(dataMax)
  // Empty series, or a gauge reading zero across the whole window: there is no
  // level to scale off, so hand uPlot something valid to draw against rather
  // than a zero-height or NaN range.
  if (!usable || dataMax! <= 0) return [0, 1]

  const span    = Math.max(0, dataMax! - dataMin!)
  const effSpan = Math.max(span, dataMax! * MIN_SPAN_FRACTION)

  const lo = Math.max(0, dataMin! - effSpan * FLOOR_PAD)
  // Solve for the ceiling that puts dataMax at PEAK_HEIGHT of the plot.
  const hi = lo + (dataMax! - lo) / PEAK_HEIGHT

  // dataMax === lo can only happen if both are zero, which the guard above
  // already caught — but never hand back a zero-height scale.
  return hi > lo ? [lo, hi] : [lo, lo + 1]
}
