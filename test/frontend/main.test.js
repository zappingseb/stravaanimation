import "./helpers/fakeLeaflet.js";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("main", () => {
  it("mounts the App on #app", async () => {
    const calls = [];
    globalThis.Vue = {
      createApp: (component) => ({ mount: (selector) => calls.push([component.name, selector]) }),
    };
    await import("../../public/js/main.js");
    assert.deepEqual(calls, [["App", "#app"]]);
  });
});
