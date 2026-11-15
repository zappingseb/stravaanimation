import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clock,
  fitProfile,
  fitRoute,
  flaps,
  flapsWidth,
  flipFlap,
  isShape,
  isWords,
  label,
  morph,
  plainName,
  text,
  thousands,
} from "../../public/js/film/items.js";

describe("items", () => {
  it("fits a route into a box, north up", () => {
    const points = fitRoute(
      [
        [48, 11],
        [48.1, 11],
      ],
      100,
      100,
      50,
      80,
    );
    assert.deepEqual(
      points.map((point) => point.map(Math.round)),
      [
        [100, 140],
        [100, 60],
      ],
    );
    assert.deepEqual(fitRoute([[48, 11]], 100, 100, 50, 80), []);
    assert.deepEqual(fitRoute(undefined, 100, 100, 50, 80), []);
  });

  it("fits an elevation profile into a box, also a flat one", () => {
    assert.deepEqual(fitProfile([100, 200, 150], 0, 10, 100, 110), [
      [0, 110],
      [50, 10],
      [100, 60],
    ]);
    assert.deepEqual(fitProfile([5, 5], 0, 10, 100, 110), [
      [0, 110],
      [100, 110],
    ]);
    assert.deepEqual(fitProfile([5], 0, 10, 100, 110), []);
  });

  it("morphs a dot into a dot and a ring into a ring", () => {
    const [dot] = morph({ x: 0, y: 0, r: 2, color: "a" }, { x: 10, y: 0, r: 4, color: "b" }, 0.5);
    assert.deepEqual({ type: dot.type, x: dot.x, r: dot.r, fill: dot.fill }, { type: "circle", x: 5, r: 3, fill: "b" });
    const [ringItem] = morph(
      { x: 0, y: 0, r: 2, color: "a", ring: 2 },
      { x: 0, y: 0, r: 4, color: "b", ring: 4 },
      0.25,
    );
    assert.deepEqual(
      { type: ringItem.type, width: ringItem.width, color: ringItem.color },
      { type: "ring", width: 2.5, color: "a" },
    );
  });

  it("morphs a ring into a dot: a ring while it is big, filled at the end", () => {
    const a = { x: 0, y: 0, r: 100, color: "a", ring: 3 };
    const b = { x: 10, y: 0, r: 4, color: "b" };
    const [startDot, startRing] = morph(a, b, 0);
    assert.deepEqual([startDot.alpha, startRing.alpha], [0, 1]);
    const [dot, ringItem] = morph(a, b, 1);
    assert.deepEqual({ x: dot.x, r: dot.r, alpha: dot.alpha }, { x: 10, r: 4, alpha: 1 });
    assert.equal(ringItem.alpha, 0);
  });

  it("lays out split-flap cards", () => {
    const cards = flaps("12", 20, 80, { w: 50, gap: 5, gapAfter: { 0: 10 } });
    assert.deepEqual(
      cards.map((card) => [card.char, card.x]),
      [
        ["1", 20],
        ["2", 85],
      ],
    );
    assert.equal(flapsWidth(3, 50, 5), 160);
  });

  it("flips an airport card through the digits before its target", () => {
    const at = (step) => flipFlap("5", step, {});
    assert.deepEqual([at(0).char, at(0).next], [" ", "0"]);
    assert.deepEqual([at(3.25).char, at(3.25).next, at(3.25).flip], ["2", "3", 0.25]);
    assert.deepEqual([at(99).char, at(99).flip], ["5", 0]);
    assert.deepEqual([flipFlap(".", 0.5, {}).char, flipFlap(".", 0.5, {}).next], [" ", "."]);
  });

  it("tells words from shapes", () => {
    assert.ok(isWords(text("a", 0, 0)) && isWords(flaps("1", 0, 0)[0]));
    assert.ok(isShape({ type: "circle" }) && !isShape(text("a", 0, 0)) && !isShape(null) && !isShape(false));
    assert.equal(label("most run spot").str, "MOST RUN SPOT");
  });

  it("formats names, numbers and paces", () => {
    assert.equal(plainName("Urlaub heute 😉"), "Urlaub heute");
    assert.equal(plainName(undefined), "");
    assert.equal(thousands(1684.9), "1,685");
    assert.equal(clock(256), "4:16");
  });
});
