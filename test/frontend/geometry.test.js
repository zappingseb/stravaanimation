import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cumulativeLengths, pointAlong, segmentAt } from "../../public/js/animation/geometry.js";

// straight north, 0.001° latitude = ~111 m per segment
const route = [
  [48.0, 11.0],
  [48.001, 11.0],
  [48.002, 11.0],
];
const lengths = cumulativeLengths(route);

describe("cumulativeLengths", () => {
  it("measures the route from its start", () => {
    assert.equal(lengths[0], 0);
    assert.ok(Math.abs(lengths[1] - 111.32) < 0.01);
    assert.ok(Math.abs(lengths[2] - 222.64) < 0.01);
  });
});

describe("segmentAt", () => {
  it("finds the segment that contains a distance", () => {
    assert.equal(segmentAt(lengths, 0), 0);
    assert.equal(segmentAt(lengths, 150), 1);
  });

  it("returns the last point beyond the end", () => {
    assert.equal(segmentAt(lengths, 1000), 2);
  });
});

describe("pointAlong", () => {
  it("interpolates inside the segment", () => {
    const half = pointAlong(route, lengths, lengths[1] / 2);
    assert.equal(half.index, 0);
    assert.ok(Math.abs(half.position[0] - 48.0005) < 1e-9);
  });

  it("stops at the end of the route", () => {
    assert.deepEqual(pointAlong(route, lengths, 1e6).position, [48.002, 11.0]);
  });

  it("does not divide by zero on repeated points", () => {
    const standing = [
      [48, 11],
      [48, 11],
    ];
    assert.deepEqual(pointAlong(standing, cumulativeLengths(standing), 0).position, [48, 11]);
  });
});
