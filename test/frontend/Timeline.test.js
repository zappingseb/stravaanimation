import { mapConfig } from "./helpers/fakeLeaflet.js";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Timeline } from "../../public/js/animation/Timeline.js";
import { MapView } from "../../public/js/map/MapView.js";

const options = { runStartIntervalSeconds: 0.5, secondsPerKm: 0.35, minRunSeconds: 2, hikeSeconds: 1.25 };
const route = [
  [48.0, 11.0],
  [48.001, 11.0],
];
const run = (id, date) => ({ id, date, distance: 1000, coordinates: route });
const hike = (id, date) => ({ id, date, profile: [1, 2] });

globalThis.window ??= { innerHeight: 640 };

function recorder() {
  const events = [];
  return {
    events,
    onRunStart: (a) => events.push(`run ${a.id}`),
    onHikeStart: (h) => events.push(`hike ${h.id}`),
    onHikeProgress: () => {},
    onHikeEnd: () => events.push("hike end"),
  };
}

/** Collects requestAnimationFrame callbacks instead of running them. */
function manualFrames() {
  const frames = [];
  globalThis.requestAnimationFrame = (callback) => frames.push(callback);
  globalThis.cancelAnimationFrame = () => {};
  return frames;
}

describe("Timeline", () => {
  it("starts runs and hikes in their slots and reports the end", async () => {
    const frames = manualFrames();
    const listener = recorder();
    const timeline = new Timeline(new MapView("map", mapConfig, {}), options, listener);
    const played = timeline.play([run("a", "2025-01-01"), run("b", "2025-01-03")], [hike("h", "2025-01-02")]);

    timeline.renderFrame(0);
    assert.deepEqual(listener.events, ["run a"]);
    timeline.renderFrame(500);
    assert.deepEqual(listener.events, ["run a", "hike h"]);
    timeline.renderFrame(1000);
    assert.deepEqual(listener.events, ["run a", "hike h", "run b"]);

    assert.equal(timeline.renderFrame(2000), false, "runs still drawing");
    assert.equal(timeline.renderFrame(3000), true, "run b ends at 1000 + 2000 ms");

    frames.shift()(3000 + performance.now()); // the loop sees the end and resolves
    assert.equal(await played, true);
  });

  it("resolves with false and hides the hike when stopped", async () => {
    manualFrames();
    const listener = recorder();
    const timeline = new Timeline(new MapView("map", mapConfig, {}), options, listener);
    const played = timeline.play([], [hike("h", "2025-01-02")]);
    timeline.renderFrame(0);

    timeline.stop();
    assert.equal(await played, false);
    assert.deepEqual(listener.events, ["hike h", "hike end"]);
  });
});
