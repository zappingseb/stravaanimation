import { mapConfig } from "./fakeLeaflet.js";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("fake Leaflet", () => {
  it("records layers added to and removed from the map", () => {
    const map = L.map("map", { zoom: 13 });
    const line = L.polyline([[48, 11]], { color: "red" }).addTo(map);
    L.circleMarker([48, 11], {}).addTo(map);
    assert.equal(map.layersOf("line")[0], line);
    map.removeLayer(line);
    assert.deepEqual(map.layersOf("line"), []);
    assert.equal(map.layersOf("dot").length, 1);
  });

  it("lets a polyline grow like Leaflet's", () => {
    const line = L.polyline([[48, 11]]);
    line.setLatLngs([...line.getLatLngs(), L.latLng([48.1, 11])]);
    assert.deepEqual(line.latlngs, [
      [48, 11],
      [48.1, 11],
    ]);
  });

  it("extends canvases like L.Canvas.extend", () => {
    const Custom = L.Canvas.extend({ hello: () => "hi" });
    const canvas = new Custom({ padding: 0.5 });
    assert.equal(canvas.hello(), "hi");
    assert.equal(canvas.options.padding, 0.5);
  });

  it("provides a map config like /api/config", () => {
    assert.equal(typeof mapConfig.centerLat, "number");
    assert.ok(mapConfig.tileUrl.includes("{z}"));
  });
});
