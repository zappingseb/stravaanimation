import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { YearTitle } from "../../public/js/components/YearTitle.js";
import { render, textOf } from "./helpers/render.js";

describe("YearTitle", () => {
  it("shows the kicker above four year cards", async () => {
    const html = await render(YearTitle, { kicker: "My year", year: "2025" });
    assert.match(textOf(html), /^My year/);
    assert.equal(html.match(/class="split-flap"/g).length, 4);
  });
});
