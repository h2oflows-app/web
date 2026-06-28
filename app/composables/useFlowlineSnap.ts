import nearestPointOnLine from '@turf/nearest-point-on-line'
import lineSlice from '@turf/line-slice'
import length from '@turf/length'
import { lineString } from '@turf/helpers'

type GeoJSONPosition = number[]
type LineStringFeature = GeoJSON.Feature<GeoJSON.LineString>

/** Flatten a GeoJSON FeatureCollection of LineStrings into a single ordered coordinate array */
export function flattenFlowlineCoords(fc: { type: string; features: any[] } | null): GeoJSONPosition[] {
  if (!fc) return []
  const coords: GeoJSONPosition[] = []
  for (const f of fc.features) {
    const geom = f.geometry
    if (!geom) continue
    if (geom.type === 'LineString') coords.push(...geom.coordinates)
    else if (geom.type === 'MultiLineString') {
      for (const ring of geom.coordinates) coords.push(...ring)
    }
  }
  return coords
}

/** Build a turf LineString Feature from a coord array (null if < 2 coords) */
export function buildLine(coords: GeoJSONPosition[]): LineStringFeature | null {
  if (coords.length < 2) return null
  return lineString(coords as [number, number][]) as LineStringFeature
}

/**
 * Snap a [lng, lat] point to the nearest point on a LineString.
 * Returns the snapped [lng, lat] position (or the input if line is null).
 */
export function snapToLine(
  line: LineStringFeature | null,
  lngLat: [number, number],
): [number, number] {
  if (!line) return lngLat
  const pt = nearestPointOnLine(line, lngLat)
  const c = pt.geometry.coordinates
  return [c[0] ?? lngLat[0], c[1] ?? lngLat[1]]
}

/**
 * Slice the line from startPt to endPt and return the length in miles.
 * Returns 0 if line is null or points are the same.
 */
export function sliceMiles(
  line: LineStringFeature | null,
  startPt: [number, number],
  endPt: [number, number],
): number {
  if (!line) return 0
  try {
    const sliced = lineSlice(startPt, endPt, line)
    return length(sliced, { units: 'miles' })
  } catch {
    return 0
  }
}
