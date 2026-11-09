import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FlapBoard } from "../../public/js/components/FlapBoard.js";
import { render } from "./helpers/render.js";

describe("FlapBoard", () => {
  it("renders one card per character", async () => {
    const html = await render(FlapBoard, { text: "1684.9", mode: "NUMBER" });
    assert.equal(html.match(/class="split-flap"/g).length, 6);
  });

  it("staggers the cards with offset and step", async () => {
    const html = await render(FlapBoard, { text: "2025", mode: "NUMBER", rippleOffset: 10, rippleStep: 3 });
    assert.deepEqual(
      [...html.matchAll(/--i:(\d+)/g)].map((m) => Number(m[1])),
      [10, 13, 16, 19]
    );
  });
});
