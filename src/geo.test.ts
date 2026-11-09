import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { haversineMeters } from "./geo";

describe("haversineMeters", () => {
  it("is 0 for the same point", () => {
    assert.equal(haversineMeters([48.1, 11.5], [48.1, 11.5]), 0);
  });

  it("measures 0.001° latitude as ~111 m", () => {
    assert.ok(Math.abs(haversineMeters([48, 11], [48.001, 11]) - 111.19) < 0.01);
  });

  it("measures Munich to Garmisch as ~80 km", () => {
    const km = haversineMeters([48.1374, 11.5755], [47.4921, 11.0958]) / 1000;
    assert.ok(km > 79 && km < 81, `${km} km`);
  });
});
