// Geometry helpers for routes given as [lat, lng] pairs. No Leaflet, so they can be unit tested.

const METERS_PER_DEGREE = 111320;

/** Distance (m) from the start of the route to every point (flat-earth approximation, fine for a run). */
export function cumulativeLengths(coords) {
  const lengths = new Float64Array(coords.length);
  for (let i = 1; i < coords.length; i++) {
    const [lat1, lng1] = coords[i - 1];
    const [lat2, lng2] = coords[i];
    const dy = (lat2 - lat1) * METERS_PER_DEGREE;
    const dx = (lng2 - lng1) * METERS_PER_DEGREE * Math.cos((lat1 * Math.PI) / 180);
    lengths[i] = lengths[i - 1] + Math.hypot(dx, dy);
  }
  return lengths;
}

/** Index i of the segment i -> i+1 that contains `distance` (lengths[i] <= distance). */
export function segmentAt(lengths, distance) {
  let lo = 0;
  let hi = lengths.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lengths[mid] <= distance) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** Point at `distance` meters along the route, interpolated inside its segment. */
export function pointAlong(coords, lengths, distance) {
  const index = segmentAt(lengths, distance);
  const from = coords[index];
  const to = coords[index + 1];
  if (!to) return { index, position: from };

  const segmentLength = lengths[index + 1] - lengths[index];
  const f = segmentLength > 0 ? (distance - lengths[index]) / segmentLength : 0;
  return { index, position: [from[0] + (to[0] - from[0]) * f, from[1] + (to[1] - from[1]) * f] };
}
