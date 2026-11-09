import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HikeQueue } from "../../public/js/animation/HikeQueue.js";

const options = { maxMs: 1250, minMs: 600 };

describe("HikeQueue", () => {
  it("shows nothing before the first hike is due", () => {
    const queue = new HikeQueue([{ hike: "a", startAt: 1000 }], options);
    assert.deepEqual(queue.update(500), { ended: null, started: null, progress: null });
    assert.equal(queue.done, false);
  });

  it("shows a lone hike for maxMs, the red line finishing at 80%", () => {
    const queue = new HikeQueue([{ hike: "a", startAt: 0 }], options);
    assert.equal(queue.update(0).started, "a");
    assert.equal(queue.update(500).progress, 0.5);
    assert.equal(queue.update(1000).progress, 1);
    assert.equal(queue.update(1250).ended, "a");
    assert.ok(queue.done);
  });

  it("shortens a hike when the next one is due, but not below minMs", () => {
    const queue = new HikeQueue(
      [
        { hike: "a", startAt: 0 },
        { hike: "b", startAt: 100 },
      ],
      options
    );
    queue.update(0);
    assert.equal(queue.update(599).ended, null);
    const events = queue.update(600);
    assert.equal(events.ended, "a");
    assert.equal(events.started, "b");
  });

  it("is done right away without hikes", () => {
    assert.ok(new HikeQueue([], options).done);
  });
});
