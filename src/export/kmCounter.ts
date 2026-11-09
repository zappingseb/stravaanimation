import { CsvActivity } from "./csv";

export interface KmCounter {
  /** km of all counted activities up to and including `date`, 1 decimal */
  kmUpTo(date: Date): number;
  totalKm: number;
  count: number;
}

/**
 * The "km since Jan 1st" board adds up every counted activity, also those that are not
 * drawn (runs outside the area, treadmill runs) and hikes.
 */
export function createKmCounter(activities: CsvActivity[]): KmCounter {
  const sorted = [...activities].sort((a, b) => a.date.getTime() - b.date.getTime());
  const times: number[] = [];
  const cumulativeMeters: number[] = [];
  let sum = 0;
  for (const activity of sorted) {
    sum += activity.distanceMeters ?? 0;
    times.push(activity.date.getTime());
    cumulativeMeters.push(sum);
  }

  return {
    kmUpTo(date: Date): number {
      const count = countUpTo(times, date.getTime());
      return count === 0 ? 0 : toKm(cumulativeMeters[count - 1]!);
    },
    totalKm: toKm(sum),
    count: sorted.length,
  };
}

/** Number of entries in the sorted `times` that are <= time (binary search). */
function countUpTo(times: number[], time: number): number {
  let lo = 0;
  let hi = times.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (times[mid]! <= time) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function toKm(meters: number): number {
  return Math.round(meters / 100) / 10;
}
