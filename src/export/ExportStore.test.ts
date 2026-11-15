import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { AnimationConfig, DataConfig, FilmConfig } from "../types";
import { ExportStore } from "./ExportStore";

const HEADER = "Activity ID,Activity Date,Activity Name,Activity Type,Distance,Filename,Distance";
const run = (id: number) => `${id},"Jan ${id}, 2025, 8:00:00 AM",Run ${id},Run,"10.00",,10000.0`;

describe("ExportStore", () => {
  let dir: string;
  let store: ExportStore;
  const log = console.log;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "export-store-"));
    fs.writeFileSync(path.join(dir, "activities.csv"), [HEADER, run(1)].join("\n"));
    store = new ExportStore({
      data: {
        exportDir: dir,
        activityTypes: ["Run"],
        hikeActivityTypes: [],
        countedActivityTypes: ["Run"],
        hikeProfileSamples: 10,
        minPointSpacingMeters: 0,
      } as DataConfig,
      animation: {
        startDate: "2025-01-01",
        endDate: "2025-12-31",
        centerLat: 48,
        centerLng: 11,
        radiusMeters: 1000,
      } as AnimationConfig,
      film: {
        timeZone: "Europe/Berlin",
        sportNames: {},
        elevationExcludedTypes: [],
        series: { keywords: [] },
        hotspotMinMetersFromStart: 0,
      } as unknown as FilmConfig,
    });
    console.log = () => undefined;
  });

  afterEach(() => {
    console.log = log;
  });

  it("reads the export once and keeps it", () => {
    const first = store.get();
    assert.equal(first.summary.totalKm, 10);
    fs.writeFileSync(path.join(dir, "activities.csv"), [HEADER, run(1), run(2)].join("\n"));
    assert.equal(store.get(), first);
  });

  it("reads it again after reload()", () => {
    store.get();
    fs.writeFileSync(path.join(dir, "activities.csv"), [HEADER, run(1), run(2)].join("\n"));
    store.reload();
    assert.equal(store.get().summary.totalKm, 20);
  });

  it("fails every time while the export cannot be read, and recovers when it is there", () => {
    fs.rmSync(path.join(dir, "activities.csv"));
    assert.throws(() => store.get(), /activities\.csv/);
    assert.throws(() => store.get(), /activities\.csv/);
    fs.writeFileSync(path.join(dir, "activities.csv"), [HEADER, run(1)].join("\n"));
    assert.equal(store.get().summary.totalKm, 10);
  });
});
