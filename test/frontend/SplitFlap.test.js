import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SplitFlap } from "../../public/js/components/SplitFlap.js";
import { instance } from "./helpers/render.js";

/** Flips until the card shows its letter, like the transitions would in the browser. */
function flipToEnd(card) {
  const shown = [card.displayedLetter];
  card.flipToNextLetter();
  while (card.charOffset !== null) {
    shown.push(card.displayedLetter);
    card.flipToNextLetter();
  }
  return shown;
}

describe("SplitFlap", () => {
  it("flips through the digits up to the target", () => {
    const card = instance(SplitFlap, { index: 0, text: "3", mode: "NUMBER" });
    assert.deepEqual(flipToEnd(card), [" ", "0", "1", "2", "3"]);
    assert.equal(card.displayedLetter, "3");
  });

  it("flips backwards when the target comes earlier in the character set", () => {
    const card = instance(SplitFlap, { index: 0, text: "2", mode: "NUMBER" });
    card.initialCharOffset = 5; // shows "4"
    assert.deepEqual(flipToEnd(card), ["4", "3", "2"]);
  });

  it("uses upper case letters", () => {
    const card = instance(SplitFlap, { index: 0, text: "b", mode: "LETTER" });
    flipToEnd(card);
    assert.equal(card.displayedLetter, "B");
  });

  it("shows characters outside the set without flipping forever", () => {
    const card = instance(SplitFlap, { index: 0, text: "-", mode: "NUMBER" });
    const shown = flipToEnd(card);
    assert.equal(shown.at(-1), "-");
    assert.ok(shown.length <= 14);
  });

  it("only accepts known modes", () => {
    assert.equal(SplitFlap.props.mode.validator("NUMBER"), true);
    assert.equal(SplitFlap.props.mode.validator("EMOJI"), false);
  });
});
