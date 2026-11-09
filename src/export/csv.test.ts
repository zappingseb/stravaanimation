import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { parseCsv, parseCsvDate, readCsvActivities } from "./csv";

describe("parseCsv", () => {
  it("splits rows and fields", () => {
    assert.deepEqual(parseCsv("a,b\n1,2\n"), [
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("keeps commas, doubled quotes and newlines inside quoted fields", () => {
    assert.deepEqual(parseCsv('id,text\n1,"Push Up\nSet 1: ""30"", done"\n'), [
      ["id", "text"],
      ["1", 'Push Up\nSet 1: "30", done'],
    ]);
  });

  it("handles CRLF line endings and a missing final newline", () => {
    assert.deepEqual(parseCsv("a,b\r\n1,2"), [
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("parseCsvDate", () => {
  it("reads the German format as UTC", () => {
    assert.equal(parseCsvDate("31.12.2025, 09:35:41")?.toISOString(), "2025-12-31T09:35:41.000Z");
  });

  it("reads the English format as UTC", () => {
    assert.equal(parseCsvDate("Dec 31, 2025, 9:35:41 AM")?.toISOString(), "2025-12-31T09:35:41.000Z");
  });

  it("returns null for garbage", () => {
    assert.equal(parseCsvDate("not a date"), null);
  });
});

describe("readCsvActivities", () => {
  it("uses the second Distance column (meters) and the optional elevation gain", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "strava-export-"));
    fs.writeFileSync(
      path.join(dir, "activities.csv"),
      "﻿Aktivitäts-ID,Aktivitätsdatum,Name der Aktivität,Aktivitätsart,Distanz,Dateiname,Distanz,Höhenzunahme\n" +
        '1,"01.01.2025, 12:05:35",Neujahr,Lauf,"10,03",activities/1.gpx,10028.0,45.5\n' +
        '2,"02.01.2025, 08:00:00",Laufband,Lauf,"5,00",,5000.0,\n'
    );

    const [run, treadmill] = readCsvActivities(dir);

    assert.equal(run?.distanceMeters, 10028);
    assert.equal(run?.elevationGainMeters, 45.5);
    assert.equal(run?.fileName, "activities/1.gpx");
    assert.equal(run?.date.toISOString(), "2025-01-01T12:05:35.000Z");
    assert.equal(treadmill?.fileName, "");
    assert.equal(treadmill?.elevationGainMeters, null);
  });

  it("names the missing columns", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "strava-export-"));
    fs.writeFileSync(path.join(dir, "activities.csv"), "Activity ID,Activity Date\n1,x\n");
    assert.throws(() => readCsvActivities(dir), /missing columns name, type, distance, fileName/);
  });
});
