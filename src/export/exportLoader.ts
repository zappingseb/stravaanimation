import path from "path";
import { haversineMeters, LatLng } from "../geo";
import { AnimationConfig, DataConfig, HikeActivity, LoadedExport, LoadSummary, RunActivity } from "../types";
import { CsvActivity, readCsvActivities } from "./csv";
import { elevationGain, elevationProfile } from "./elevationProfile";
import { readTrack, Track } from "./gpx";
import { createKmCounter, KmCounter } from "./kmCounter";

// Loads a Strava bulk export ("Download your data"):
//   <exportDir>/activities.csv          one row per activity (type, date, distance, file name)
//   <exportDir>/activities/<id>.gpx     GPS track (also .gpx.gz)

/** What loading a run or hike needs besides the CSV row. */
interface LoadContext {
  exportDir: string;
  data: DataConfig;
  kmCounter: KmCounter;
}

export function loadExport(data: DataConfig, animation: AnimationConfig): LoadedExport {
  const exportDir = path.resolve(data.exportDir);
  const period = { start: new Date(animation.startDate), end: endOfDay(animation.endDate) };
  const inPeriod = (a: CsvActivity) => a.date >= period.start && a.date <= period.end;
  const ofTypes = (types: string[]) => (a: CsvActivity) => types.includes(a.type) && inPeriod(a);

  const all = readCsvActivities(exportDir);
  const kmCounter = createKmCounter(all.filter(ofTypes(data.countedActivityTypes)));
  const context: LoadContext = { exportDir, data, kmCounter };
  const runs = loadRuns(all.filter(ofTypes(data.activityTypes)), animation, context);
  const hikes = loadHikes(all.filter(ofTypes(data.hikeActivityTypes)), context);

  const summary: LoadSummary = {
    exportDir,
    activitiesInCsv: all.length,
    ...runs.counts,
    hikesLoaded: hikes.length,
    countedActivities: kmCounter.count,
    totalKm: kmCounter.totalKm,
  };
  return { runs: runs.activities, hikes, summary };
}

/** Runs with a GPS track that start inside the area, sorted by date. */
function loadRuns(candidates: CsvActivity[], animation: AnimationConfig, { exportDir, data, kmCounter }: LoadContext) {
  const center: LatLng = [animation.centerLat, animation.centerLng];
  const counts = { runsInPeriod: candidates.length, noGpsFile: 0, unsupportedFile: 0, outsideArea: 0, runsLoaded: 0 };
  const activities: RunActivity[] = [];

  for (const run of sortByDate(candidates)) {
    if (!run.fileName) {
      counts.noGpsFile++;
      continue;
    }
    const track = readTrack(exportDir, run.fileName, data.minPointSpacingMeters);
    if (!track) {
      counts.unsupportedFile++;
      console.warn(`Skipping ${run.id} (${run.name}): cannot read ${run.fileName}`);
      continue;
    }
    if (track.points.length < 2) {
      counts.noGpsFile++;
      continue;
    }
    if (haversineMeters(track.points[0]!, center) > animation.radiusMeters) {
      counts.outsideArea++;
      continue;
    }
    activities.push({
      id: run.id,
      name: run.name,
      date: startTime(run, track),
      distance: Math.round(distanceMeters(run, track)),
      cumulativeDistance: kmCounter.kmUpTo(run.date),
      coordinates: track.points,
    });
  }
  counts.runsLoaded = activities.length;
  return { activities, counts };
}

/**
 * Hikes with elevation data, sorted by date. They are shown as an elevation profile,
 * not on the map, so they are not limited to the area (they are usually in the mountains).
 */
function loadHikes(candidates: CsvActivity[], { exportDir, data, kmCounter }: LoadContext): HikeActivity[] {
  const hikes: HikeActivity[] = [];
  for (const hike of sortByDate(candidates)) {
    const track = hike.fileName ? readTrack(exportDir, hike.fileName, data.minPointSpacingMeters) : null;
    const profile = track ? elevationProfile(track.elevations, data.hikeProfileSamples) : [];
    if (!track || profile.length < 2) {
      console.warn(`Skipping hike ${hike.id} (${hike.name}): no elevation data`);
      continue;
    }
    hikes.push({
      id: hike.id,
      name: hike.name,
      date: startTime(hike, track),
      distance: Math.round(distanceMeters(hike, track)),
      elevationGain: Math.round(hike.elevationGainMeters ?? elevationGain(profile)),
      cumulativeDistance: kmCounter.kmUpTo(hike.date),
      profile,
    });
  }
  return hikes;
}

/**
 * Strava's own distance from the CSV matches the app; the GPX length is the fallback
 * when the CSV value is missing or obviously not in meters.
 */
function distanceMeters(activity: CsvActivity, track: Track): number {
  const csvDistance = activity.distanceMeters ?? 0;
  return csvDistance > track.distanceMeters / 2 ? csvDistance : track.distanceMeters;
}

function startTime(activity: CsvActivity, track: Track): string {
  return (track.startTime ?? activity.date).toISOString();
}

function sortByDate(activities: CsvActivity[]): CsvActivity[] {
  return [...activities].sort((a, b) => a.date.getTime() - b.date.getTime());
}

function endOfDay(dateString: string): Date {
  const date = new Date(dateString);
  date.setUTCHours(23, 59, 59, 999);
  return date;
}
