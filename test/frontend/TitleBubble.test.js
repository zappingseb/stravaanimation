import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DaysScene, KudosScene } from "../../public/js/film/scenes/dots.js";
import { TitleBubble } from "../../public/js/film/TitleBubble.js";
import { assertDrawable } from "./helpers/drawable.js";
import { filmFixture } from "./helpers/filmFixture.js";

describe("TitleBubble", () => {
  const d = filmFixture();
  const bubble = new TitleBubble(new DaysScene(), d);

  it("shows the title in a big bubble while the screen's words wait", () => {
    const items = bubble.frame(0.5).items;
    assert.equal(items.find((item) => item.type === "text" && item.str === "Active days")?.alpha, 1);
    assert.ok(items.some((item) => item.type === "circle" && item.r === TitleBubble.R));
    assert.ok(!items.some((item) => item.type === "text" && item.str === "DAYS ACTIVE"));
  });

  it("grows out of the arriving shape and shrinks back into it", () => {
    for (const p of [0, 1]) {
      const dots = bubble.frame(p).items.filter((item) => item.type === "circle");
      const close = (a, b) => Math.abs(a - b) < 1e-6;
      assert.ok(
        dots.every((dot) => close(dot.x, 27.5) && close(dot.y, 155.5) && close(dot.r, 3.5)),
        `day-1 dot at ${p}`,
      );
    }
  });

  it("swells where the shape is, moved only as far as needed to fit the frame", () => {
    assert.deepEqual(bubble.place({ x: 27.5, y: 155.5 }), { x: 138, y: 162, r: 122, color: "#FF5522" });
    assert.deepEqual(bubble.place({ x: 180, y: 320 }), { x: 180, y: 320, r: 122, color: "#FF5522" });
    assert.equal(bubble.place({ x: 350, y: 630 }).x, 222);
    assert.equal(bubble.place({ x: 350, y: 630 }).y, 458);
  });

  it("draws a title without letters as a big icon", () => {
    const thumb = new TitleBubble(new KudosScene(), d);
    assert.equal(thumb.isIcon, true);
    assert.equal(bubble.isIcon, false);
    assert.equal(thumb.frame(0.5).items.find((item) => item.str === "👍").size, 92);
  });

  it("can be drawn at any time", () => {
    for (const p of [0, 0.2, 0.5, 0.9, 1]) assertDrawable(bubble.frame(p), `bubble at ${p}`);
  });
});
