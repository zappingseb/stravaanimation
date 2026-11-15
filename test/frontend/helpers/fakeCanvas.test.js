import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { callsOf, fakeCanvas } from "./fakeCanvas.js";

describe("fakeCanvas", () => {
  it("writes down what is drawn and keeps properties", () => {
    const canvas = fakeCanvas();
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "red";
    ctx.fillRect(1, 2, 3, 4);
    ctx.createLinearGradient(0, 0, 0, 640).addColorStop(0, "black");
    assert.equal(ctx.fillStyle, "red");
    assert.deepEqual(callsOf(canvas, "fillRect"), [[1, 2, 3, 4]]);
    assert.deepEqual(callsOf(canvas, "addColorStop"), [[0, "black"]]);
    assert.equal(ctx.measureText("abc").width, 30);
  });
});
