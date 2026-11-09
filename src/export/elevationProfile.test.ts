import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { elevationGain, elevationProfile } from "./elevationProfile";

describe("elevationProfile", () => {
  it("resamples evenly by distance", () => {
    const profile = elevationProfile(
      [
        [0, 100],
        [1000, 200],
      ],
      5
    );
    // linear 100..200, averaged with up to 2 neighbours on each side
    assert.deepEqual(profile, [125, 137.5, 150, 162.5, 175]);
  });

  it("is empty without enough data", () => {
    assert.deepEqual(elevationProfile([[0, 100]], 100), []);
  });
});

describe("elevationGain", () => {
  it("adds up the climbs only", () => {
    assert.equal(elevationGain([100, 150, 120, 200]), 130);
  });
});
