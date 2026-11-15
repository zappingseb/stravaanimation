import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DaysScene, HEAP, KudosScene, MonthsScene, SportsScene } from "../../public/js/film/scenes/dots.js";
import { assertDrawable, textsOf } from "./helpers/drawable.js";
import { filmFixture } from "./helpers/filmFixture.js";

describe("dot scenes", () => {
  const d = filmFixture();
  const scenes = [new DaysScene(), new KudosScene(), new MonthsScene(), new SportsScene()];

  it("can be drawn at any time", () => {
    for (const scene of scenes) {
      for (const t of [0, 0.1, 0.5, 0.9, 1]) assertDrawable(scene.frame(t, d), `${scene.id} at ${t}`);
      assertDrawable({ backdrop: 1, items: [scene.enter(d), scene.exit(d)] }, `${scene.id} anchors`);
    }
  });

  it("days: one dot per day, a column per month, and a leap day in a leap year", () => {
    const days = new DaysScene();
    assert.equal(days.positions(d).length, 365);
    assert.equal(days.positions(filmFixture({ daysInYear: 366 })).length, 366);
    assert.deepEqual(days.positions(d)[31], { x: 53.5, y: 155.5, month: 1 });
    assert.equal(days.frame(1, d).items.filter((item) => item.type === "circle").length, 365);
  });

  it("days: active days are orange, the streak turns yellow at the end", () => {
    const days = new DaysScene();
    assert.equal(days.color(d, 2, true), "#3A3A3A");
    assert.equal(days.color(d, 1, true), "#FF5522");
    assert.equal(days.color(d, 300, false), "#FF5522");
    assert.equal(days.color(d, 300, true), "#FFC400");
  });

  it("days: the counter starts close to its value, not at zero", () => {
    assert.ok(textsOf(new DaysScene().frame(0.05, d)).includes("7"), "8 active days start at 7");
    assert.ok(textsOf(new DaysScene().frame(1, d)).includes("8"));
  });

  it("kudos: every kudos is a dot that leaves the heap for its cell", () => {
    const kudos = new KudosScene();
    assert.equal(kudos.cells(708).length, 708);
    assert.equal(kudos.cells(708), kudos.cells(708), "computed once");
    assert.equal(kudos.cells(12).length, 12);
    assert.ok(kudos.heapSlots().length > 50);
    assert.ok(kudos.heapSlots().every((slot) => Math.hypot(slot.x - HEAP.x, slot.y - HEAP.y) <= HEAP.r));
    assert.equal(kudos.frame(1, d).items.filter((item) => item.type === "circle").length, 708);
    assert.equal(kudos.available(filmFixture({ kudos: null })), false);
    assert.equal(kudos.available(filmFixture({ kudos: 0 })), false);
  });

  it("months: a bubble per month, the best one green, the total from close by", () => {
    const months = new MonthsScene();
    const bubbles = months.bubbles(d);
    assert.equal(bubbles.length, 12);
    assert.equal(Math.max(...bubbles.map((bubble) => bubble.r)), bubbles[8].r);
    const end = months.frame(1, d);
    assert.equal(
      end.items.filter((item) => item.type === "circle" && item.fill === "#5CFF3B" && item.r > 10).length,
      1,
    );
    assert.ok(textsOf(end).includes("SEPTEMBER · BEST MONTH · 209 KM"));
    assert.ok(
      textsOf(months.frame(0.05, d)).some((str) => /^1,4\d\d$/.test(str)),
      "1,685 km start above 1,400",
    );
    assert.ok(textsOf(end).includes("1,685"));
  });

  it("sports: the main sport is the big bubble, the others sit around it by size", () => {
    const sports = new SportsScene();
    const others = sports.others(d);
    assert.deepEqual(
      others.map((sport) => sport.name),
      ["Hiking", "Cycling"],
    );
    assert.ok(others[0].r > others[1].r && others[0].r < 125);
    assert.ok(textsOf(sports.frame(1, d)).includes("1,561"));
    assert.ok(textsOf(sports.frame(1, d)).includes("KM · 91%"));
    assert.equal(sports.available(filmFixture({ sports: [{ name: "Running", km: 10 }] })), false);
  });
});
