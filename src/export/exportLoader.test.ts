import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { before, describe, it } from "node:test";
import { AnimationConfig, DataConfig, LoadedExport } from "../types";
import { loadExport } from "./exportLoader";

/** GPX with the start time on the first point; points are [lat, lon, elevation]. */
function gpx(points: [number, number, number][], start: string): string {
  const trkpts = points.map(([lat, lon, ele], i) => {
    const time = i === 0 ? `<time>${start}</time>` : "";
    return `<trkpt lat="${lat}" lon="${lon}"><ele>${ele}</ele>${time}</trkpt>`;
  });
  return `<gpx><trk><trkseg>${trkpts.join("\n")}</trkseg></trk></gpx>`;
}

const IN_AREA: [number, number, number][] = [
  [48, 11, 500],
  [48.001, 11, 501],
];
const OUTSIDE_AREA: [number, number, number][] = [
  [47, 12, 600],
  [47.001, 12, 601],
];

const HEADER = "Activity ID,Activity Date,Activity Name,Activity Type,Distance,Filename,Distance,Elevation Gain";
const ROWS = [
  '1,"Jan 5, 2025, 8:00:00 AM",In the park,Run,"10.00",activities/1.gpx,10000.0,',
  '2,"Jan 6, 2025, 8:00:00 AM",Holiday run,Run,"5.00",activities/2.gpx,5000.0,',
  '3,"Jan 7, 2025, 8:00:00 AM",Treadmill,Run,"3.00",,3000.0,',
  '4,"Jan 8, 2025, 8:00:00 AM",Mountain,Hike,"8.00",activities/4.gpx.gz,8000.0,650',
  '5,"Jan 9, 2025, 8:00:00 AM",Watch file,Run,"4.00",activities/5.fit,4000.0,',
  '6,"Dec 31, 2024, 8:00:00 AM",Last year,Run,"7.00",activities/6.gpx,7000.0,',
  '7,"Jan 10, 2025, 8:00:00 AM",Gym,Weight Training,"0",,0,',
];

const data: DataConfig = {
  exportDir: "",
  activityTypes: ["Run"],
  hikeActivityTypes: ["Hike"],
  countedActivityTypes: ["Run", "Hike"],
  hikeProfileSamples: 10,
  minPointSpacingMeters: 0,
};
const animation = {
  startDate: "2025-01-01",
  endDate: "2025-12-31",
  centerLat: 48,
  centerLng: 11,
  radiusMeters: 1000,
} as AnimationConfig;

describe("loadExport", () => {
  let loaded: LoadedExport;

  before(() => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "strava-export-"));
    fs.mkdirSync(path.join(dir, "activities"));
    fs.writeFileSync(path.join(dir, "activities.csv"), [HEADER, ...ROWS].join("\n"));
    fs.writeFileSync(path.join(dir, "activities/1.gpx"), gpx(IN_AREA, "2025-01-05T08:00:10Z"));
    fs.writeFileSync(path.join(dir, "activities/2.gpx"), gpx(OUTSIDE_AREA, "2025-01-06T08:00:00Z"));
    fs.writeFileSync(
      path.join(dir, "activities/4.gpx.gz"),
      zlib.gzipSync(gpx([[47.5, 11, 800], [47.51, 11, 1200], [47.52, 11, 900]], "2025-01-08T08:00:00Z"))
    );
    fs.writeFileSync(path.join(dir, "activities/5.fit"), "binary");
    fs.writeFileSync(path.join(dir, "activities/6.gpx"), gpx(IN_AREA, "2024-12-31T08:00:00Z"));
    loaded = loadExport({ ...data, exportDir: dir }, animation);
  });

  it("counts why runs were left out", () => {
    const { exportDir, ...summary } = loaded.summary;
    assert.ok(exportDir);
    assert.deepEqual(summary, {
      activitiesInCsv: 7,
      runsInPeriod: 4,
      noGpsFile: 1,
      unsupportedFile: 1,
      outsideArea: 1,
      runsLoaded: 1,
      hikesLoaded: 1,
      countedActivities: 5,
      totalKm: 30,
    });
  });

  it("draws only the run inside the area, with the GPX start time and CSV distance", () => {
    assert.equal(loaded.runs.length, 1);
    const [run] = loaded.runs;
    assert.equal(run?.name, "In the park");
    assert.equal(run?.date, "2025-01-05T08:00:10.000Z");
    assert.equal(run?.distance, 10000);
    assert.equal(run?.cumulativeDistance, 10);
    assert.equal(run?.coordinates.length, 2);
  });

  it("reads gzipped hikes anywhere, with the CSV elevation gain", () => {
    const [hike] = loaded.hikes;
    assert.equal(hike?.name, "Mountain");
    assert.equal(hike?.elevationGain, 650);
    assert.equal(hike?.profile.length, 10);
    // runs 1, 2, 3 (outside area and treadmill count too) + the hike itself
    assert.equal(hike?.cumulativeDistance, 26);
  });
});
