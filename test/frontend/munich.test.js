import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CityScene,
  EarlyBirdScene,
  FastestScene,
  FinaleScene,
  HotspotScene,
  LongestScene,
  TitleScene,
} from "../../public/js/film/scenes/munich.js";
import { assertDrawable, textsOf } from "./helpers/drawable.js";
import { filmFixture } from "./helpers/filmFixture.js";

describe("Munich scenes", () => {
  const d = filmFixture();
  const scenes = [
    new TitleScene(),
    new CityScene(),
    new HotspotScene(),
    new EarlyBirdScene(),
    new FastestScene(),
    new LongestScene(),
    new FinaleScene(),
  ];

  it("can be drawn at any time", () => {
    for (const scene of scenes) {
      for (const t of [0, 0.1, 0.5, 0.9, 1]) assertDrawable(scene.frame(t, d), `${scene.id} at ${t}`);
      assertDrawable({ backdrop: 1, items: [scene.enter(d), scene.exit(d)] }, `${scene.id} anchors`);
    }
  });

  it("title: flips the year in like an airport board and ends on it", () => {
    const chars = (t) =>
      new TitleScene()
        .frame(t, d)
        .items.filter((item) => item.type === "flap")
        .map((item) => item.char)
        .join("");
    assert.equal(chars(0.25), "    ");
    assert.equal(chars(1), "2025");
    assert.equal(new TitleScene().durationMs(d), 3500);
  });

  it("finale: mirrors the title and ends on the year's km", () => {
    const frame = new FinaleScene().frame(1, d);
    assert.equal(
      frame.items
        .filter((item) => item.type === "flap")
        .map((item) => item.char)
        .join(""),
      "20251684.9",
    );
    assert.ok(textsOf(frame).includes("DONE!"));
    assert.deepEqual(new FinaleScene().enter(d), new TitleScene().exit(d));
  });

  it("city: has no time of its own and takes the dot from the first run's start to the last run's end", () => {
    const city = new CityScene();
    assert.equal(city.durationMs(d), 0);
    assert.deepEqual(city.enter(d), { x: 180, y: 320, r: 6, color: "#ffffff" });
    assert.deepEqual(city.exit(d), { x: 180, y: 320, r: 6, color: "#ffffff" });
  });

  it("hotspot: zooms the map onto the spot and counts the passes from close by", () => {
    const scene = new HotspotScene();
    assert.equal(scene.frame(0, d).mapZoom.scale, 1);
    assert.equal(scene.frame(1, d).mapZoom.scale, 2.6);
    assert.deepEqual([scene.frame(1, d).mapZoom.toX, scene.frame(1, d).mapZoom.toY], [180, 230]);
    const flapsAt = (t) =>
      scene
        .frame(t, d)
        .items.filter((item) => item.type === "flap")
        .map((item) => item.char)
        .join("");
    assert.ok(Number(flapsAt(0.56)) >= 110 && Number(flapsAt(0.56)) < 115, "129 passes start at about 110");
    assert.equal(flapsAt(1), "129");
    assert.ok(textsOf(scene.frame(1, d)).includes("129 of 135 runs went through this 100 m stretch."));
    assert.equal(scene.available(filmFixture({ hotspot: null })), false);
  });

  it("earlyBird: names the hour most activities started in", () => {
    const texts = textsOf(new EarlyBirdScene().frame(1, d));
    assert.ok(texts.includes("Out the door at eight"));
    assert.ok(texts.includes("08:00"));
    assert.ok(texts.includes("65 OF 171 STARTS"));
  });

  it("fastest: counts the pace down to its value and marks a personal record", () => {
    const scene = new FastestScene();
    assert.ok(textsOf(scene.frame(0, d)).includes("4:55"));
    assert.ok(textsOf(scene.frame(1, d)).includes("4:16"));
    assert.ok(textsOf(scene.frame(1, d)).includes("10 KM PR"));
    assert.equal(scene.available(filmFixture({ fastest: null })), false);
  });

  it("longest: draws the route in its disc and shows no zero on the way", () => {
    const scene = new LongestScene();
    assert.equal(scene.route(d).length, 3);
    assert.ok(scene.route(d).every(([x, y]) => Math.hypot(x - 275, y - 275) <= 65));
    assert.ok(!textsOf(scene.frame(0.05, d)).includes("0.0"));
    assert.ok(textsOf(scene.frame(1, d)).includes("33.0"));
    assert.ok(textsOf(scene.frame(1, d)).includes("JUL 11"));
  });
});
