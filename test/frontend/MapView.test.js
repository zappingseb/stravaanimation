import { mapConfig } from "./helpers/fakeLeaflet.js";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MapView } from "../../public/js/map/MapView.js";

const style = { color: "#ff5522", weight: 3, opacity: 0.35, blend: "additive" };

globalThis.window ??= { innerHeight: 640 };

describe("MapView", () => {
  it("centers the map on the area and draws its circle", () => {
    const view = new MapView("map", mapConfig, style);
    assert.deepEqual(view.map.options.center, [mapConfig.centerLat, mapConfig.centerLng]);
    assert.equal(view.map.layersOf("circle")[0].options.radius, 9000);
  });

  it("adds the active canvas onto the finished one with plus-lighter", () => {
    const blendModeFor = (blend) => {
      const view = new MapView("map", mapConfig, { ...style, blend });
      return view.activeCanvas._container.style.mixBlendMode;
    };
    assert.equal(blendModeFor("additive"), "plus-lighter");
    assert.equal(blendModeFor("normal"), "normal");
  });

  it("puts routes in progress and finished routes on different canvases", () => {
    const view = new MapView("map", mapConfig, style);
    const active = view.addActiveRoute([48, 11]);
    const finished = view.addFinishedRoute([
      [48, 11],
      [48.1, 11],
    ]);
    assert.equal(active.options.renderer, view.activeCanvas);
    assert.equal(finished.options.renderer, view.finishedCanvas);
    assert.equal(finished.options.color, "#ff5522");
    assert.equal(finished.options.blend, "additive");
  });

  it("clears only the finished routes", () => {
    const view = new MapView("map", mapConfig, style);
    view.addFinishedRoute([[48, 11]]);
    view.addFinishedRoute([[48, 12]]);
    view.clearRoutes();
    assert.equal(view.map.layersOf("line").length, 0);
    assert.deepEqual(view.finishedRoutes, []);
  });

  it("fits all route points, leaving room for the boards", () => {
    const view = new MapView("map", mapConfig, style);
    view.fitToRoutes([{ coordinates: [[48, 11]] }, { coordinates: [[48.2, 11.7]] }]);
    assert.equal(view.map.fitted.bounds.points.length, 2);
    assert.deepEqual(view.map.fitted.options.paddingTopLeft, [16, 640 * 0.12]);
  });

  it("does not zoom without routes", () => {
    const view = new MapView("map", mapConfig, style);
    view.fitToRoutes([]);
    assert.equal(view.map.fitted, null);
  });
});
