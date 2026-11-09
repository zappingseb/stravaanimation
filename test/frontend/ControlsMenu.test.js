import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ControlsMenu } from "../../public/js/components/ControlsMenu.js";
import { instance, render, textOf } from "./helpers/render.js";

describe("ControlsMenu", () => {
  it("closes the menu and emits the choice", () => {
    const menu = instance(ControlsMenu);
    menu.open = true;
    menu.choose("show-all");
    assert.equal(menu.open, false);
    assert.deepEqual(menu.emitted, [["show-all"]]);
  });

  it("disables start and show-all while playing", async () => {
    const html = await render(ControlsMenu, { playing: true });
    assert.match(textOf(html), /Playing\.\.\./);
    assert.equal(html.match(/disabled/g).length, 2);
  });
});
