/** Points on each side that are averaged when smoothing (GPS/barometer noise looks jagged). */
const SMOOTHING_RADIUS = 2;

/**
 * Elevation resampled to `samples` points evenly spaced by distance, lightly smoothed.
 * @param elevations [distance from start (m), elevation (m)], sorted by distance
 */
export function elevationProfile(elevations: [number, number][], samples: number): number[] {
  if (elevations.length < 2 || samples < 2) return [];
  const totalDistance = elevations[elevations.length - 1]![0];

  const resampled: number[] = [];
  let segment = 0;
  for (let k = 0; k < samples; k++) {
    const distance = (totalDistance * k) / (samples - 1);
    while (segment < elevations.length - 2 && elevations[segment + 1]![0] < distance) segment++;
    const [d0, e0] = elevations[segment]!;
    const [d1, e1] = elevations[segment + 1]!;
    const f = d1 > d0 ? Math.min(1, Math.max(0, (distance - d0) / (d1 - d0))) : 0;
    resampled.push(e0 + (e1 - e0) * f);
  }

  return resampled.map((_, k) => {
    const window = resampled.slice(Math.max(0, k - SMOOTHING_RADIUS), k + SMOOTHING_RADIUS + 1);
    const average = window.reduce((sum, e) => sum + e, 0) / window.length;
    return Math.round(average * 10) / 10;
  });
}

/** Sum of all climbs along the profile (m). */
export function elevationGain(profile: number[]): number {
  let gain = 0;
  for (let k = 1; k < profile.length; k++) gain += Math.max(0, profile[k]! - profile[k - 1]!);
  return gain;
}
