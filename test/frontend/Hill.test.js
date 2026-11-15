import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Hill } from "../../public/js/film/Hill.js";

describe("Hill", () => {
  const hill = new Hill([1000, 1500, 2000, 1800], 400);

  it("starts at the foot on the left and has its summit at the top", () => {
    assert.deepEqual(hill.start, { x: 0, y: 632 });
    assert.deepEqual(hill.summit, { x: 240, y: 400 });
  });

  it("walks the dot from the foot to the summit", () => {
    const dot = (progress) => hill.items(progress, 1).at(-1);
    assert.deepEqual([dot(0).x, dot(0).y], [0, 632]);
    assert.deepEqual([dot(0.5).x, dot(0.5).y], [120, 516]);
    assert.deepEqual([dot(1).x, dot(1).y], [240, 400]);
    assert.deepEqual([dot(7).x, dot(7).y], [240, 400]); // never past the summit
  });

  it("draws the silhouette, the line up to the summit and the dot", () => {
    const [silhouette, line] = hill.items(0.5, 0.5);
    assert.equal(silhouette.type, "area");
    assert.equal(silhouette.alpha, 0.4);
    assert.equal(line.points.length, 3);
    assert.equal(line.progress, 0.5);
  });

  it("draws nothing for an activity without elevation data", () => {
    const flat = new Hill([], 400);
    assert.deepEqual(flat.items(0.5, 1), []);
    assert.ok(Number.isFinite(flat.start.x) && Number.isFinite(flat.summit.y));
  });
});
