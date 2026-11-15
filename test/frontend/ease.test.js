import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clamp01,
  countTo,
  easeIn,
  easeInOut,
  easeOut,
  easeOutBack,
  lerp,
  rnd,
  seg,
} from "../../public/js/film/ease.js";

describe("ease", () => {
  it("clamps and maps a span of time to 0..1", () => {
    assert.equal(clamp01(-1), 0);
    assert.equal(clamp01(2), 1);
    assert.equal(seg(0.5, 0.25, 0.75), 0.5);
    assert.equal(seg(0.1, 0.4, 0.8), 0);
    assert.equal(seg(0.9, 0.4, 0.8), 1);
    assert.equal(lerp(10, 20, 0.5), 15);
  });

  it("starts every easing at 0 and ends it at 1", () => {
    for (const ease of [easeIn, easeOut, easeInOut, easeOutBack]) {
      assert.ok(Math.abs(ease(0)) < 1e-9, ease.name);
      assert.ok(Math.abs(ease(1) - 1) < 1e-9, ease.name);
    }
    assert.ok(easeOut(0.5) > 0.5 && easeIn(0.5) < 0.5);
    assert.ok(easeOutBack(0.7) > 1, "overshoots before it settles");
  });

  it("counts up to a value from close by, or down to it", () => {
    assert.equal(countTo(2000, 0, 0.15), 1700);
    assert.equal(countTo(2000, 1, 0.15), 2000);
    assert.equal(countTo(2000, 0, -0.15), 2300);
    assert.equal(countTo(2000, -5, 0.15), 1700);
    assert.equal(countTo(2000, 5, 0.15), 2000);
  });

  it("gives the same pseudo-random number for the same index", () => {
    assert.equal(rnd(7), rnd(7));
    assert.notEqual(rnd(7), rnd(8));
    for (let i = 0; i < 100; i++) assert.ok(rnd(i) >= 0 && rnd(i) < 1);
  });
});
