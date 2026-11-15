import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FilmData } from "../../public/js/film/FilmData.js";
import { filmFixture } from "./helpers/filmFixture.js";

describe("FilmData", () => {
  const d = filmFixture();

  it("knows where the first run starts and the last one ends", () => {
    assert.deepEqual(d.firstRunStart, [48.16, 11.59]);
    assert.deepEqual(d.lastRunEnd, [48.16, 11.59]);
    assert.ok(d.activeSet.has(300) && !d.activeSet.has(2));
  });

  it("falls back to the map center in a year without runs", () => {
    const config = { map: { centerLat: 1, centerLng: 2 }, intro: {}, finale: {}, film: {} };
    const empty = new FilmData({
      config,
      stats: { year: 2025, activeDays: [] },
      activities: [],
      cityPoint: () => ({ x: 0, y: 0 }),
    });
    assert.deepEqual(empty.firstRunStart, [1, 2]);
    assert.deepEqual(empty.lastRunEnd, [1, 2]);
  });

  it("starts counters close to the final value instead of at zero, and ends exactly on it", () => {
    assert.equal(Math.round(d.count(2000, 0)), 1700);
    assert.equal(d.count(2000, 1), 2000);
    assert.equal(Math.round(d.countDown(256, 0)), 294); // a pace counts down to its value
    assert.equal(d.countDown(256, 1), 256);
    assert.equal(Math.round(d.count(-14, 0)), -12); // a temperature below zero falls to its value
  });

  it("lets counters settle slowly: most of the way is done early", () => {
    assert.ok(d.count(2000, 0.5) > 1950);
  });

  it("takes the counter start from the config", () => {
    const config = { map: {}, intro: {}, finale: {}, film: { counterStartShare: 0.5 } };
    const half = new FilmData({ config, stats: { activeDays: [] }, activities: [], cityPoint: () => null });
    assert.equal(half.count(100, 0), 50);
  });

  it("writes a date the short way, in the film's time zone", () => {
    assert.equal(d.shortDate("2025-12-31T09:35:41.000Z"), "DEC 31");
    assert.equal(d.shortDate("2025-12-31T23:30:00.000Z"), "JAN 01"); // already the next day in Berlin
  });
});
