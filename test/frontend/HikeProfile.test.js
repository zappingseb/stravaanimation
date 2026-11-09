import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HikeProfile } from "../../public/js/components/HikeProfile.js";
import { instance, render, textOf } from "./helpers/render.js";

const mountain = { name: "Rabenkopf", elevationGain: 935, profile: [800, 1200, 1500, 1200, 800] };

describe("HikeProfile", () => {
  it("fills the height for a big climb", () => {
    const points = instance(HikeProfile, { hike: mountain }).points;
    assert.equal(points.length, 5);
    assert.equal(points[0].x, 6);
    assert.equal(points[4].x, 294);
    // summit at the top: height 120 - usable 106 (120 - PAD_TOP 14) - PAD_BOTTOM 3
    assert.equal(points[2].y, 11);
    assert.equal(points[0].y, 117);
  });

  it("keeps a flat walk flat", () => {
    const walk = instance(HikeProfile, { hike: { ...mountain, profile: [500, 520, 500] } });
    const heights = walk.points.map((p) => 120 - p.y);
    assert.ok(Math.max(...heights) < 10, `heights ${heights}`);
  });

  it("moves the dot and the red line with the progress", () => {
    const start = instance(HikeProfile, { hike: mountain, progress: 0 });
    const end = instance(HikeProfile, { hike: mountain, progress: 1 });
    assert.deepEqual(start.dot, { x: start.points[0].x, y: start.points[0].y });
    assert.deepEqual(end.dot, { x: end.points[4].x, y: end.points[4].y });
    assert.equal(start.clipWidth, 6);
    assert.equal(end.clipWidth, 294);
  });

  it("closes the area along the bottom edge", () => {
    const area = instance(HikeProfile, { hike: mountain }).areaPath;
    assert.match(area, /^M6,120 L6\.0,117\.0 /);
    assert.match(area, /L294,120 Z$/);
  });

  it("renders the elevation gain and the name", async () => {
    const html = await render(HikeProfile, { hike: mountain, visible: true });
    assert.equal(textOf(html), "▲ 935 m Rabenkopf");
    assert.match(html, /hike-profile is-visible/);
  });

  it("renders an empty box without a hike", async () => {
    assert.equal(textOf(await render(HikeProfile, {})), "");
  });
});
