import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DistanceBoard } from "../../public/js/components/DistanceBoard.js";
import { instance, render, textOf } from "./helpers/render.js";

const props = { km: 12.34, width: 6, kicker: "My year", year: "2025", finaleTitle: "DONE!" };

describe("DistanceBoard", () => {
  it("pads the km to a fixed width with one decimal", () => {
    assert.equal(instance(DistanceBoard, props).text, "0012.3");
    assert.equal(instance(DistanceBoard, { ...props, km: 1684.94 }).text, "1684.9");
  });

  it("shows only the counter and its label while playing", async () => {
    const html = await render(DistanceBoard, props);
    assert.equal(textOf(html), "km since Jan 1st");
    assert.doesNotMatch(html, /is-finale|DONE!/);
    assert.equal(html.match(/class="split-flap"/g).length, 6);
  });

  it("adds the year title and the finale title in the finale", async () => {
    const html = await render(DistanceBoard, { ...props, finale: true });
    assert.match(html, /distance-board is-finale/);
    assert.equal(textOf(html), "My year DONE! km since Jan 1st");
    assert.equal(html.match(/class="split-flap"/g).length, 4 + 6);
  });
});
