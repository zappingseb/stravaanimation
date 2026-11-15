import { DataConfig, FilmActivity, FilmConfig, FilmStats, HikeActivity, RunActivity } from "../types";
import { haversineMeters, LatLng } from "../geo";
import { CsvActivity } from "./csv";
import { elevationProfile } from "./elevationProfile";
import { Track } from "./gpx";

// Numbers for the stat scenes of the year film, from the activities of the period.

export interface FilmInput {
  /** All activities of the period, any type */
  activities: CsvActivity[];
  /** Runs drawn on the map (for the most-run spot) */
  runs: RunActivity[];
  hikes: HikeActivity[];
  kudos: number | null;
  year: number;
  data: DataConfig;
  film: FilmConfig;
  readTrack(fileName: string): Track | null;
}

/** ~100 m in latitude / longitude at 48° north */
const CELL_LAT = 0.0009;
const CELL_LNG = 0.0013;
/** Shorter runs do not count as "fastest run" (sprints, GPS glitches) */
const MIN_FASTEST_METERS = 5000;
const ROUTE_POINTS = 150;
const PROFILE_SAMPLES = 100;

export function filmStats(input: FilmInput): FilmStats {
  const { activities, data, film, year } = input;
  const local = localClock(film.timeZone);
  const sorted = [...activities].sort((a, b) => a.date.getTime() - b.date.getTime());
  const ofTypes = (types: string[]) => sorted.filter((a) => types.includes(a.type));
  const runs = ofTypes(data.activityTypes);
  const hikes = ofTypes(data.hikeActivityTypes);
  const counted = ofTypes(data.countedActivityTypes);

  const startHours = new Array<number>(24).fill(0);
  const monthsKm = new Array<number>(12).fill(0);
  for (const activity of counted) {
    const { hour, month } = local(activity.date);
    startHours[hour]!++;
    monthsKm[month]! += meters(activity) / 1000;
  }

  const elevationMonths = new Array<number>(12).fill(0);
  for (const activity of sorted) {
    if (film.elevationExcludedTypes.includes(activity.type)) continue;
    elevationMonths[local(activity.date).month]! += activity.elevationGainMeters ?? 0;
  }

  const activeDays = [...new Set(sorted.map((a) => local(a.date).dayOfYear))].sort((a, b) => a - b);
  const fastest = best(
    runs.filter((a) => meters(a) >= MIN_FASTEST_METERS && (a.movingSeconds ?? 0) > 0),
    (a) => -a.movingSeconds! / meters(a),
  );
  const longest = best(runs, meters);
  const hilliest = best(runs, (a) => a.elevationGainMeters ?? 0);
  const highest = best(hikes, (a) => Math.round(a.maxElevationMeters ?? 0));
  const lastRun = runs[runs.length - 1] ?? null;
  const hilliestTrack = hilliest?.fileName ? input.readTrack(hilliest.fileName) : null;

  return {
    year,
    daysInYear: isLeapYear(year) ? 366 : 365,
    hotspot: hotspot(input.runs, film.hotspotMinMetersFromStart),
    startHours,
    fastest: fastest && card(fastest),
    longest: longest && { ...card(longest), route: route(longest.fileName ? input.readTrack(longest.fileName) : null) },
    activeDays,
    streak: longestStreak(activeDays),
    kudos: input.kudos,
    monthsKm: monthsKm.map(Math.round),
    totalKm: round1(counted.reduce((sum, a) => sum + meters(a), 0) / 1000),
    sports: sports(sorted, film.sportNames),
    highest:
      highest && (highest.maxElevationMeters ?? 0) > 0
        ? {
            name: highest.name,
            meters: Math.round(highest.maxElevationMeters!),
            profile: hikeProfile(highest, input),
          }
        : null,
    hilliest: hilliest && {
      ...card(hilliest),
      profile: hilliestTrack ? elevationProfile(hilliestTrack.elevations, PROFILE_SAMPLES) : [],
      route: route(hilliestTrack),
    },
    elevation: {
      total: Math.round(elevationMonths.reduce((sum, m) => sum + m, 0)),
      months: elevationMonths.map(Math.round),
    },
    series: series(sorted, film),
    lastRun: lastRun && {
      ...card(lastRun),
      kmBefore: round1(counted.filter((a) => a.date < lastRun.date).reduce((sum, a) => sum + meters(a), 0) / 1000),
    },
  };
}

function meters(activity: CsvActivity): number {
  return activity.distanceMeters ?? 0;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function card(activity: CsvActivity): FilmActivity {
  return {
    name: activity.name,
    date: activity.date.toISOString(),
    km: round1(meters(activity) / 1000),
    seconds: Math.round(activity.movingSeconds ?? 0),
    gain: Math.round(activity.elevationGainMeters ?? 0),
  };
}

/** The activity with the highest score; the earliest one wins a tie. */
function best(activities: CsvActivity[], score: (a: CsvActivity) => number): CsvActivity | null {
  let winner: CsvActivity | null = null;
  for (const activity of activities) {
    if (!winner || score(activity) > score(winner)) winner = activity;
  }
  return winner;
}

/** Hour, month (0-based) and day of the year (1-based) of a date in the film's time zone. */
function localClock(timeZone: string) {
  const format = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    hourCycle: "h23",
  });
  return (date: Date) => {
    const parts: Record<string, number> = {};
    for (const part of format.formatToParts(date)) parts[part.type] = Number(part.value);
    const month = parts.month! - 1;
    const dayOfYear =
      Math.round((Date.UTC(parts.year!, month, parts.day!) - Date.UTC(parts.year!, 0, 1)) / 86_400_000) + 1;
    return { hour: parts.hour!, month, dayOfYear };
  };
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** @param days sorted days of the year */
export function longestStreak(days: number[]): { days: number; firstDay: number } {
  let bestRun = { days: 0, firstDay: 0 };
  let start = 0;
  for (let i = 0; i < days.length; i++) {
    if (i > 0 && days[i] !== days[i - 1]! + 1) start = i;
    if (i - start + 1 > bestRun.days) bestRun = { days: i - start + 1, firstDay: days[start]! };
  }
  return bestRun;
}

/**
 * The ~100 m cell most runs pass through; every run counts once per cell.
 * Points closer than `minMetersFromStart` to the run's start or end are left out,
 * so the spot is on the route and not at the front door.
 */
export function hotspot(runs: Pick<RunActivity, "coordinates">[], minMetersFromStart = 0): FilmStats["hotspot"] {
  const counts = new Map<string, number>();
  for (const run of runs) {
    const start = run.coordinates[0];
    const end = run.coordinates[run.coordinates.length - 1];
    const onRoute = run.coordinates.filter(
      (point) =>
        minMetersFromStart <= 0 ||
        (haversineMeters(point, start!) >= minMetersFromStart && haversineMeters(point, end!) >= minMetersFromStart),
    );
    const cells = new Set(onRoute.map(([lat, lng]) => `${Math.round(lat / CELL_LAT)}:${Math.round(lng / CELL_LNG)}`));
    for (const cell of cells) counts.set(cell, (counts.get(cell) ?? 0) + 1);
  }
  let winner: [string, number] | null = null;
  for (const entry of counts) {
    if (!winner || entry[1] > winner[1]) winner = entry;
  }
  if (!winner) return null;
  const [latCell, lngCell] = winner[0].split(":").map(Number) as [number, number];
  return { lat: round5(latCell * CELL_LAT), lng: round5(lngCell * CELL_LNG), count: winner[1], of: runs.length };
}

function round5(value: number): number {
  return Math.round(value * 1e5) / 1e5;
}

/** At most ROUTE_POINTS points of the track, first and last included. */
function route(track: Track | null): LatLng[] {
  const points = track?.points ?? [];
  if (points.length <= ROUTE_POINTS) return points;
  const step = (points.length - 1) / (ROUTE_POINTS - 1);
  return Array.from({ length: ROUTE_POINTS }, (_, i) => points[Math.round(i * step)]!);
}

function hikeProfile(hike: CsvActivity, input: FilmInput): number[] {
  const loaded = input.hikes.find((h) => h.id === hike.id);
  if (loaded) return loaded.profile;
  const track = hike.fileName ? input.readTrack(hike.fileName) : null;
  return track ? elevationProfile(track.elevations, PROFILE_SAMPLES) : [];
}

function sports(activities: CsvActivity[], names: Record<string, string>): FilmStats["sports"] {
  const km = new Map<string, number>();
  for (const activity of activities) km.set(activity.type, (km.get(activity.type) ?? 0) + meters(activity) / 1000);
  return [...km]
    .filter(([, value]) => value >= 0.05)
    .sort((a, b) => b[1] - a[1])
    .map(([type, value]) => ({ name: names[type] ?? type, km: round1(value) }));
}

function series(activities: CsvActivity[], film: FilmConfig): FilmStats["series"] {
  const { keywords, highlightKeyword } = film.series;
  const entries: FilmStats["series"] = [];
  for (const activity of activities) {
    const number = /#(\d+)/.exec(activity.name)?.[1];
    if (!number || !keywords.some((keyword) => activity.name.includes(keyword))) continue;
    entries.push({
      number,
      date: activity.date.toISOString(),
      km: round1(meters(activity) / 1000),
      gain: Math.round(activity.elevationGainMeters ?? 0),
      highlight: highlightKeyword !== "" && activity.name.includes(highlightKeyword),
    });
  }
  return entries;
}
