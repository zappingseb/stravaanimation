import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { DistancePopup } from "../../public/js/components/DistancePopup.js";
import { instance } from "./helpers/render.js";

describe("DistancePopup", () => {
  beforeEach(() => mock.timers.enable({ apis: ["setTimeout"] }));
  afterEach(() => mock.timers.reset());

  it("enters, stays holdMs and exits", () => {
    const popup = instance(DistancePopup);
    popup.show({ text: "+10.4", holdMs: 600 });
    assert.equal(popup.text, "+10.4");
    assert.equal(popup.phase, "entering");

    mock.timers.tick(50);
    assert.equal(popup.phase, "visible");
    mock.timers.tick(550);
    assert.equal(popup.phase, "exiting");
    mock.timers.tick(100);
    assert.equal(popup.phase, null);
  });

  it("lets a new message replace the current one", () => {
    const popup = instance(DistancePopup);
    popup.show({ text: "+10.4", holdMs: 600 });
    mock.timers.tick(500);
    popup.show({ text: "+5.5", holdMs: 600 });

    mock.timers.tick(150); // the first popup would exit now
    assert.equal(popup.text, "+5.5");
    assert.equal(popup.phase, "visible");
  });
});
