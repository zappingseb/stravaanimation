import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { IntroCard } from "../../public/js/components/IntroCard.js";
import { render, textOf } from "./helpers/render.js";

const props = {
  kicker: "My year",
  year: "2025",
  lines: ["Running Munich", "Hiking the Alps"],
  stats: "135 runs · 21 hikes",
};

describe("IntroCard", () => {
  it("renders nothing inside the veil while hidden", async () => {
    const html = await render(IntroCard, props);
    assert.equal(textOf(html), "");
    assert.doesNotMatch(html, /is-visible/);
  });

  it("shows title, lines in their colors and stats when visible", async () => {
    const html = await render(IntroCard, { ...props, visible: true });
    assert.equal(textOf(html), "My year Running Munich Hiking the Alps 135 runs · 21 hikes");
    assert.match(html, /intro__line--0[^>]*animation-delay:0\.6s/);
    assert.match(html, /intro__line--1[^>]*animation-delay:0\.95s/);
  });
});
