import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { installVirtualClock, VirtualClock } from "./virtualClock";

// installVirtualClock() normally runs in the page; here Node's globals play the page.
const page = globalThis as unknown as Record<string, unknown>;
const saved = [
  "window",
  "document",
  "setTimeout",
  "setInterval",
  "clearTimeout",
  "clearInterval",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "Date",
];
const savedPerformanceNow = performance.now;

interface FakeAnimation {
  currentTime: number | null;
  paused: boolean;
  pause(): void;
}

let animations: FakeAnimation[];
let originals: Record<string, unknown>;

function clock(): VirtualClock {
  return page.__virtualClock as VirtualClock;
}

describe("installVirtualClock", () => {
  beforeEach(() => {
    originals = Object.fromEntries(saved.map((name) => [name, page[name]]));
    animations = [];
    page.window = globalThis;
    page.document = { getAnimations: () => animations };
    installVirtualClock();
  });

  afterEach(() => {
    Object.assign(page, originals);
    performance.now = savedPerformanceNow;
  });

  it("fires timers in time order when their time is reached", async () => {
    const fired: string[] = [];
    setTimeout(() => fired.push("b"), 100);
    setTimeout(() => fired.push("a"), 50);

    await clock().step(60);
    assert.deepEqual(fired, ["a"]);
    await clock().step(60);
    assert.deepEqual(fired, ["a", "b"]);
    assert.equal(performance.now(), 120);
  });

  it("repeats intervals and stops them on clear", async () => {
    let ticks = 0;
    const id = setInterval(() => ticks++, 10);
    await clock().step(35);
    clearInterval(id);
    await clock().step(100);
    assert.equal(ticks, 3);
  });

  it("runs each animation frame once per step with the virtual time", async () => {
    const stamps: number[] = [];
    const frame = (time: number) => {
      stamps.push(time);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    await clock().step(16);
    await clock().step(16);
    assert.deepEqual(stamps, [16, 32]);
  });

  it("moves Date with the clock but keeps explicit dates", async () => {
    const start = Date.now();
    await clock().step(1000);
    assert.equal(Date.now() - start, 1000);
    assert.equal(new Date().getTime(), Date.now());
    assert.equal(new Date("2025-01-01T00:00:00Z").toISOString(), "2025-01-01T00:00:00.000Z");
  });

  it("pauses new CSS animations at 0 and advances them by each step", async () => {
    const animation: FakeAnimation = {
      currentTime: 250,
      paused: false,
      pause() {
        this.paused = true;
      },
    };
    animations.push(animation);
    await clock().step(16);
    assert.deepEqual([animation.paused, animation.currentTime], [true, 0]);
    await clock().step(16);
    assert.equal(animation.currentTime, 16);
  });
});
