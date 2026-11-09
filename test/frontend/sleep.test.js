import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { sleep } from "../../public/js/sleep.js";

describe("sleep", () => {
  it("resolves after the given time", async () => {
    mock.timers.enable({ apis: ["setTimeout"] });
    let resolved = false;
    const done = sleep(1000).then(() => (resolved = true));

    mock.timers.tick(999);
    await Promise.resolve();
    assert.equal(resolved, false);

    mock.timers.tick(1);
    await done;
    assert.equal(resolved, true);
    mock.timers.reset();
  });
});
