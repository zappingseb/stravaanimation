import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hotspot, longestStreak } from "./filmStats";

describe("hotspot", () => {
  // two runs from the same door, 0.01 degrees of latitude are about 1.1 km
  const runs = [
    {
      coordinates: [
        [48, 11],
        [48.01, 11],
        [48.02, 11],
        [48.03, 11],
      ] as [number, number][],
    },
    {
      coordinates: [
        [48, 11],
        [48.01, 11],
        [48.02, 11],
        [48.02, 11.02],
      ] as [number, number][],
    },
  ];

  it("is the cell most runs pass through", () => {
    assert.deepEqual(hotspot(runs), { lat: 47.9997, lng: 11.0006, count: 2, of: 2 });
  });

  it("can leave out the surroundings of start and end", () => {
    const spot = hotspot(runs, 1000);
    assert.equal(spot?.count, 2);
    assert.ok(Math.abs(spot!.lat - 48.01) < 0.001 || Math.abs(spot!.lat - 48.02) < 0.001, `lat ${spot?.lat}`);
  });

  it("is null without runs", () => {
    assert.equal(hotspot([]), null);
  });
});

describe("longestStreak", () => {
  it("finds the longest run of consecutive days", () => {
    assert.deepEqual(longestStreak([1, 2, 4, 5, 6, 9]), { days: 3, firstDay: 4 });
    assert.deepEqual(longestStreak([]), { days: 0, firstDay: 0 });
  });
});
