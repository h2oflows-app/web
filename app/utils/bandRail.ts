// Band rail geometry (#431 follow-up).
//
// The sheet's y axis is sized off the reading so the hydrograph keeps an honest
// shape, which means the flow bands mostly sit off-scale — on prod, every run
// currently below a threshold has its next band out of the window, a median of
// 5.4x current flow away. The rail carries that context instead, as a separate
// object: a compressed stack of the run's bands down the edge of the plot with a
// marker showing where the current flow sits in it.
//
// EQUAL HEIGHT PER BAND, not proportional. Proportional spacing would reproduce
// the exact problem the rail exists to solve — "Too Low" spanning 0-150 and
// "High" starting at 3,500 would give the low band a sliver and waste the rest.
// Equal slices answer the question actually being asked ("which band am I in,
// and how close to the next one"), and make the rail the same height for every
// run regardless of how its thresholds are spread.
//
// Position WITHIN a slice is interpolated, so the marker still creeps upward as
// flow rises rather than jumping band to band.

export interface RailBand {
  label: string
  color: string
  from:  number | null   // null on the base band — open downward to 0
  to:    number | null   // null on the top band — open upward
}

/** Where `cfs` sits inside one band, 0 (its floor) → 1 (its ceiling). */
function fractionWithin(cfs: number, band: RailBand): number {
  const lower = band.from ?? 0
  if (band.to == null) {
    // The top band is unbounded, so there is no ceiling to interpolate toward.
    // Approach 1 asymptotically: at the threshold itself → 0, at twice the
    // threshold → 0.5, and it never quite saturates however big the flood.
    if (cfs <= lower || cfs <= 0) return 0
    return 1 - lower / cfs
  }
  const span = band.to - lower
  if (span <= 0) return 0
  return (cfs - lower) / span
}

/**
 * Overall position on the rail, 0 (bottom of the lowest band) → 1 (top of the
 * highest). Null when there is nothing to place — no bands, or no reading.
 *
 * `bands` must be ascending, as `bandRegions` already emits them: base first
 * with `from: null`, top last with `to: null`.
 */
export function railPosition(cfs: number | null | undefined, bands: RailBand[]): number | null {
  if (cfs == null || !Number.isFinite(cfs) || bands.length === 0) return null

  // Highest band whose floor the reading has reached; the base band otherwise.
  let index = 0
  for (let i = bands.length - 1; i >= 0; i--) {
    const floor = bands[i]!.from
    if (floor == null || cfs >= floor) { index = i; break }
  }

  const within = Math.min(1, Math.max(0, fractionWithin(cfs, bands[index]!)))
  return (index + within) / bands.length
}

/** Each band's slice of the rail, bottom-up — `offset`/`size` as 0-1 fractions. */
export function railSlices(bands: RailBand[]): { band: RailBand; offset: number; size: number }[] {
  const size = bands.length > 0 ? 1 / bands.length : 0
  return bands.map((band, i) => ({ band, offset: i * size, size }))
}
