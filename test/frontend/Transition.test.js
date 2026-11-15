import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Film } from "../../public/js/film/Film.js";
import { Transition } from "../../public/js/film/Transition.js";
import { assertDrawable } from "./helpers/drawable.js";
import { filmFixture } from "./helpers/filmFixture.js";

describe("Transition", () => {
  const d = filmFixture();
  const scenes = Film.scenes();
  const scene = (id) => scenes.find((s) => s.id === id);
  const between = (from, to, options) => new Transition(scene(from), scene(to), d, options);

  it("takes between 200 and 1500 ms", () => {
    for (const ms of Object.values(Transition.MS)) assert.ok(ms >= 200 && ms <= 1500, `${ms} ms`);
    assert.equal(Transition.durationMs(scene("days")), 1500);
    assert.equal(Transition.durationMs({ id: "unknown" }), Transition.DEFAULT_MS);
  });

  it("can draw every hand-over at any time", () => {
    scenes.slice(0, -1).forEach((from, i) => {
      for (const p of [0, 0.3, 0.6, 1])
        assertDrawable(new Transition(from, scenes[i + 1], d).frame(p), `${from.id} at ${p}`);
    });
  });

  it("has a method for every pair with a hand-over of its own", () => {
    for (const [pair, method] of Object.entries(Transition.CUSTOM)) {
      const [from, to] = pair.split(">");
      assert.ok(scene(from) && scene(to), pair);
      assert.equal(typeof Transition.prototype[method], "function", method);
    }
  });

  it("flies the exit shape of the old scene to the entry shape of the new one", () => {
    const transition = between("hotspot", "earlyBird");
    const shape = (p) => transition.frame(p).items.at(-1);
    assert.deepEqual([shape(0).x, shape(0).y, shape(0).r], [180, 230, 36]);
    assert.deepEqual([shape(1).x, shape(1).y, shape(1).r], [180, 330, 125]);
  });

  it("ends where the next scene starts: every day dot has become part of the heap", () => {
    const dots = between("days", "kudos")
      .frame(1)
      .items.filter((item) => item.type === "circle");
    assert.equal(dots.length, 365);
    assert.ok(dots.every((dot) => Math.hypot(dot.x - 180, dot.y - 377) <= 45));
  });

  it("brings only the shapes of the new scene when a title bubble follows", () => {
    // the second group is the new scene; the first one is what is left of the old one
    const wordsIn = (frame) =>
      frame.items.filter((item) => item.type === "group")[1].items.filter((item) => item.type === "text");
    assert.ok(wordsIn(between("longest", "days").frame(1)).length > 0);
    assert.equal(wordsIn(between("longest", "days", { shapesOnly: true }).frame(1)).length, 0);
  });

  it("has a slot on the mound for every day of the year", () => {
    const slots = Transition.moundSlots(366);
    assert.equal(slots.length, 366);
    assert.ok(slots.every((slot) => slot.x > 0 && slot.x < 360 && slot.y <= 632));
  });
});
