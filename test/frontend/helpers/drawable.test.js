import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertDrawable, textsOf } from "./drawable.js";

describe("assertDrawable", () => {
  it("accepts numbers, also inside groups and points", () => {
    assertDrawable({ backdrop: 1, items: [null, { x: 1, points: [[1, 2]], items: [{ r: 3 }] }] }, "ok");
  });

  it("finds a NaN inside a group and a backdrop out of range", () => {
    assert.throws(
      () => assertDrawable({ backdrop: 1, items: [{ items: [{ x: NaN }] }] }, "nan"),
      /nan: every coordinate/,
    );
    assert.throws(() => assertDrawable({ backdrop: 2, items: [] }, "dark"), /dark: backdrop/);
  });
});

describe("textsOf", () => {
  it("lists the strings of the texts", () => {
    assert.deepEqual(textsOf({ items: [false, { type: "text", str: "a" }, { type: "circle" }] }), ["a"]);
  });
});
