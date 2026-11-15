import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AlpsScene,
  ColdestScene,
  EverestScene,
  HighestScene,
  HilliestScene,
  LastRunScene,
  SeriesScene,
} from "../../public/js/film/scenes/mountains.js";
import { assertDrawable, textsOf } from "./helpers/drawable.js";
import { filmFixture } from "./helpers/filmFixture.js";

describe("mountain scenes", () => {
  const d = filmFixture();
  const scenes = [
    new AlpsScene(),
    new HighestScene(),
    new HilliestScene(),
    new EverestScene(),
    new SeriesScene(),
    new ColdestScene(),
    new LastRunScene(),
  ];
  const flapsOf = (frame) =>
    frame.items
      .filter((item) => item?.type === "flap")
      .map((item) => item.char)
      .join("");

  it("can be drawn at any time", () => {
    for (const scene of scenes) {
      for (const t of [0, 0.1, 0.5, 0.9, 1]) assertDrawable(scene.frame(t, d), `${scene.id} at ${t}`);
      assertDrawable({ backdrop: 1, items: [scene.enter(d), scene.exit(d)] }, `${scene.id} anchors`);
    }
  });

  it("alps: places the pins north up around home and stays longer to be read", () => {
    const alps = new AlpsScene();
    const { home, pins } = alps.pins(d);
    const thuringia = pins.find((pin) => pin.name === "Thuringia");
    const tegernsee = pins.find((pin) => pin.name === "Tegernsee");
    assert.ok(thuringia.y < home.y && tegernsee.y > home.y);
    assert.ok(pins.every((pin) => pin.x >= 34 && pin.x <= 326 && pin.y >= 176 && pin.y <= 560));
    assert.equal(alps.durationMs(d), 6000);
    assert.ok(textsOf(alps.frame(1, d)).includes("3 places"));
    assert.equal(alps.available({ film: { places: [] } }), false);
  });

  it("alps: pins close together get their names in one column, one below the other", () => {
    const alps = new AlpsScene();
    const pins = [
      { x: 250, y: 300 },
      { x: 260, y: 310 },
      { x: 100, y: 500 },
    ];
    const labels = alps.labels(pins, { x: 180, y: 250 });
    assert.equal(labels[0].x, labels[1].x);
    assert.ok(labels[1].y - labels[0].y >= 12);
    assert.equal(labels[2].x, 89);
  });

  it("alps: hands the pin of the highest hike over to the next scene", () => {
    const alps = new AlpsScene();
    const hut = alps.pins(d).pins.find((pin) => pin.name === "Anhalter Hütte");
    assert.deepEqual(alps.exit(d), { x: hut.x, y: hut.y, r: 6, color: "#FFC400" });
  });

  it("highest: the dot climbs from the foot to the summit while the altitude counts up", () => {
    const highest = new HighestScene();
    assert.equal(flapsOf(highest.frame(0, d)), "1900");
    assert.equal(flapsOf(highest.frame(1, d)), "2198");
    assert.ok(highest.exit(d).y < highest.enter(d).y);
    assert.equal(highest.available(filmFixture({ highest: { profile: [] } })), false);
  });

  it("hilliest: is the most height climbed and shows no zero on the way", () => {
    const hilliest = new HilliestScene();
    assert.ok(textsOf(hilliest.frame(0, d)).includes("MOST HEIGHT CLIMBED"));
    assert.ok(!textsOf(hilliest.frame(0.05, d)).includes("0"));
    assert.ok(textsOf(hilliest.frame(1, d)).includes("1,172"));
  });

  it("everest: fills one tank per Everest climbed", () => {
    const everest = new EverestScene();
    const tanks = everest.frame(1, d).items.filter((item) => item.type === "tank");
    assert.deepEqual(
      tanks.map((tank) => tank.level),
      [1, 1],
    );
    assert.ok(textsOf(everest.frame(1, d)).includes("2× Everest"));
    const half = filmFixture({ elevation: { total: 4424, months: Array(12).fill(368.7) } });
    assert.ok(textsOf(everest.frame(1, half)).includes("50 % Everest"));
    assert.equal(everest.available(filmFixture({ elevation: { total: 0, months: [] } })), false);
  });

  it("series: stamps every hike of the series and names its range", () => {
    const series = new SeriesScene();
    const end = series.frame(1, d);
    assert.equal(end.items.filter((item) => item?.type === "group").length, 3);
    assert.ok(textsOf(end).includes("#57 → #62"));
    assert.equal(series.frame(0, d).items.filter((item) => item?.type === "group").length, 0);
    assert.equal(series.available(filmFixture({ series: [] })), false);
  });

  it("coldest: goes from the cold end of the scale on the left to the hot end on the right", () => {
    const coldest = new ColdestScene();
    const end = coldest.frame(1, d);
    assert.ok(textsOf(end).includes("−14°C") && textsOf(end).includes("+27°C"));
    const markers = end.items.filter((item) => item?.type === "circle" && item.r === 9);
    assert.equal(markers.length, 2);
    assert.ok(markers[0].x < markers[1].x);
    assert.ok(textsOf(end).includes("COLDEST AND HOTTEST"));
  });

  it("coldest: shows only the cold day when no hot one is configured", () => {
    const only = filmFixture();
    only.film = { ...only.film, hottest: null };
    const end = new ColdestScene().frame(1, only);
    assert.ok(textsOf(end).includes("COLDEST ACTIVITY"));
    assert.equal(end.items.filter((item) => item?.type === "circle" && item.r === 9).length, 1);
    assert.equal(new ColdestScene().available({ film: { coldest: null } }), false);
  });

  it("lastRun: flips the date to the run's day and adds its km to the year", () => {
    const lastRun = new LastRunScene();
    assert.ok(flapsOf(lastRun.frame(0, d)).startsWith("DEC30"));
    assert.ok(flapsOf(lastRun.frame(0, d)).endsWith("1674.5"));
    assert.ok(flapsOf(lastRun.frame(1, d)).startsWith("DEC31"));
    assert.ok(flapsOf(lastRun.frame(1, d)).endsWith("1684.9"));
    assert.equal(lastRun.available(filmFixture({ lastRun: null })), false);
  });
});
