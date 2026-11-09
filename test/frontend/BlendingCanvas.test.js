import "./helpers/fakeLeaflet.js";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BlendingCanvas } from "../../public/js/map/BlendingCanvas.js";

describe("BlendingCanvas", () => {
  it("draws additive routes with 'lighter' and restores normal blending afterwards", () => {
    const canvas = new BlendingCanvas();
    canvas._updatePoly({ options: { blend: "additive" } });
    assert.equal(canvas.drawn[0].composite, "lighter");
    assert.equal(canvas._ctx.globalCompositeOperation, "source-over");
  });

  it("draws normal routes with 'source-over'", () => {
    const canvas = new BlendingCanvas();
    canvas._updatePoly({ options: { blend: "normal" } });
    assert.equal(canvas.drawn[0].composite, "source-over");
  });
});
