import { mapConfig } from "./helpers/fakeLeaflet.js";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RunAnimation } from "../../public/js/animation/RunAnimation.js";
import { MapView } from "../../public/js/map/MapView.js";

const route = [
  [48.0, 11.0],
  [48.001, 11.0],
  [48.002, 11.0],
];

globalThis.window ??= { innerHeight: 640 };

function setup() {
  const mapView = new MapView("map", mapConfig, { color: "#f00", weight: 3, opacity: 0.3, blend: "additive" });
  const run = new RunAnimation({ coordinates: route }, 0, 1000, mapView);
  return { mapView, run, map: mapView.map };
}

describe("RunAnimation", () => {
  it("starts with a line and a runner dot at the first point", () => {
    const { run, map } = setup();
    run.start();
    assert.equal(run.state, "running");
    assert.deepEqual(map.layersOf("dot")[0].position, [48.0, 11.0]);
    assert.deepEqual(run.line.latlngs, [[48.0, 11.0]]);
  });

  it("grows the line behind the dot", () => {
    const { run } = setup();
    run.start();
    run.advance(0.25);
    assert.equal(run.line.latlngs.length, 2);
    run.advance(0.75);
    assert.equal(run.line.latlngs.length, 3, "first point, passed point, tip");
    assert.ok(Math.abs(run.line.latlngs[2][0] - 48.0015) < 1e-9);
    assert.deepEqual(run.dot.position, run.line.latlngs[2]);
  });

  it("moves to the finished canvas when done", () => {
    const { run, mapView, map } = setup();
    run.start();
    run.advance(1);
    run.finish();
    assert.equal(run.state, "done");
    assert.equal(map.layersOf("dot").length, 0);
    assert.equal(mapView.finishedRoutes.length, 1);
    assert.deepEqual(mapView.finishedRoutes[0].latlngs, route);
  });

  it("removes a run in progress when canceled", () => {
    const { run, mapView, map } = setup();
    run.start();
    run.cancel();
    assert.equal(map.layersOf("line").length, 0);
    assert.equal(map.layersOf("dot").length, 0);
    assert.equal(mapView.finishedRoutes.length, 0);
  });
});
