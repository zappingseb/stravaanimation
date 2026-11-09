import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DateBoard } from "../../public/js/components/DateBoard.js";
import { instance, render } from "./helpers/render.js";

describe("DateBoard", () => {
  // noon UTC is the same calendar day in every time zone from -11 to +11
  const board = instance(DateBoard, { isoDate: "2025-07-04T12:00:00.000Z" });

  it("shows the month as three capital letters", () => {
    assert.equal(board.month, "JUL");
  });

  it("shows the day with two digits", () => {
    assert.equal(board.day, "04");
  });

  it("renders three month cards and two day cards", async () => {
    const html = await render(DateBoard, { isoDate: "2025-07-04T12:00:00.000Z" });
    assert.equal(html.match(/class="split-flap"/g).length, 5);
  });
});
