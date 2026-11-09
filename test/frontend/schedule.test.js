import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSchedule, runDurationMs } from "../../public/js/animation/schedule.js";

const run = (date) => ({
  date,
  coordinates: [
    [0, 0],
    [1, 1],
  ],
});
const hike = (date) => ({ date, profile: [1, 2] });

describe("buildSchedule", () => {
  it("puts runs and hikes in date order, one slot each", () => {
    const { runs, hikes } = buildSchedule([run("2025-01-03"), run("2025-01-01")], [hike("2025-01-02")], 500);
    assert.deepEqual(
      runs.map((r) => [r.activity.date, r.startAt]),
      [
        ["2025-01-01", 0],
        ["2025-01-03", 1000],
      ]
    );
    assert.deepEqual(
      hikes.map((h) => [h.hike.date, h.startAt]),
      [["2025-01-02", 500]]
    );
  });

  it("skips runs without a route and hikes without a profile", () => {
    const { runs, hikes } = buildSchedule([{ date: "x", coordinates: [[0, 0]] }], [{ date: "y", profile: [] }], 500);
    assert.equal(runs.length + hikes.length, 0);
  });
});

describe("runDurationMs", () => {
  const options = { secondsPerKm: 0.35, minRunSeconds: 2 };

  it("scales with the distance", () => {
    assert.equal(runDurationMs(10000, options), 3500);
  });

  it("has a minimum for short runs", () => {
    assert.equal(runDurationMs(1000, options), 2000);
  });
});
