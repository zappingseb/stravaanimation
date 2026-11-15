import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { FilmPlayer } from "../../public/js/film/FilmPlayer.js";
import { callsOf, fakeCanvas } from "./helpers/fakeCanvas.js";

/** A film of one part, 100 ms long, whose frames say at which time they were asked for. */
const film = {
  durationMs: () => 100,
  frameAt: (part, ms) => ({ backdrop: 1, items: [{ type: "circle", x: ms, y: 0, r: 1, fill: part }] }),
};

describe("FilmPlayer", () => {
  let canvas;
  let map;
  let player;
  let frames;
  let now;
  const realPerformance = Object.getOwnPropertyDescriptor(globalThis, "performance");
  /** Runs the next animation frame `ms` later. */
  const step = (ms) => {
    now += ms;
    frames.shift()?.(now);
  };

  beforeEach(() => {
    frames = [];
    now = 1000;
    globalThis.window = {
      devicePixelRatio: 1,
      listeners: {},
      addEventListener: (name, fn) => (globalThis.window.listeners[name] = fn),
    };
    globalThis.requestAnimationFrame = (fn) => frames.push(fn);
    globalThis.cancelAnimationFrame = () => frames.pop();
    Object.defineProperty(globalThis, "performance", { value: { now: () => now }, configurable: true });
    canvas = fakeCanvas();
    map = { style: { transform: "" } };
    player = new FilmPlayer(canvas, map);
  });

  afterEach(() => {
    for (const name of ["window", "requestAnimationFrame", "cancelAnimationFrame", "document", "Image"])
      delete globalThis[name];
    Object.defineProperty(globalThis, "performance", realPerformance);
  });

  it("plays a part frame by frame and resolves with true at its end", async () => {
    const played = player.play(film, "stats");
    step(16);
    assert.deepEqual(callsOf(canvas, "arc").at(-1).slice(0, 2), [16, 0]);
    step(100);
    assert.equal(await played, true);
    assert.equal(frames.length, 0);
  });

  it("resolves with false when it is stopped", async () => {
    const played = player.play(film, "stats");
    step(16);
    player.stop();
    assert.equal(await played, false);
    assert.equal(frames.length, 0);
  });

  it("stops the part that is playing when another one starts", async () => {
    const first = player.play(film, "opening");
    const second = player.play(film, "stats");
    assert.equal(await first, false);
    step(200);
    assert.equal(await second, true);
  });

  it("enlarges the map around a point for a frame with mapZoom, and resets it", () => {
    player.show({ backdrop: 0, items: [], mapZoom: { scale: 2, x: 100, y: 200, toX: 180, toY: 230 } });
    assert.equal(map.style.transformOrigin, "100px 200px");
    assert.equal(map.style.transform, "translate(80px, 30px) scale(2)");
    player.clear();
    assert.equal(map.style.transform, "");
    player.show({ backdrop: 0, items: [], mapZoom: { scale: 1, x: 0, y: 0, toX: 0, toY: 0 } });
    assert.equal(map.style.transform, "");
  });

  it("follows the window when it is resized", () => {
    canvas.clientWidth = 720;
    globalThis.window.listeners.resize();
    assert.deepEqual(player.toDesign({ x: 180, y: 0 }), { x: 0, y: 0 });
  });

  it("loads fonts and photos, and goes on without a photo that is missing", async () => {
    const warnings = [];
    const realWarn = console.warn;
    console.warn = (message) => warnings.push(message);
    globalThis.document = { fonts: { load: () => Promise.reject(new Error("offline")) } };
    globalThis.Image = class {
      set src(url) {
        this.url = url;
        queueMicrotask(() => (url.includes("missing") ? this.onerror() : this.onload()));
      }
    };
    try {
      await player.load({ longest: { file: "long run.jpg", focus: 0.4 }, fastest: { file: "missing.jpg" } });
    } finally {
      console.warn = realWarn;
    }
    assert.equal(player.images.get("longest").image.url, "/film-photos/long%20run.jpg");
    assert.equal(player.images.get("longest").focus, 0.4);
    assert.equal(player.images.has("fastest"), false);
    assert.deepEqual(warnings, ["Film photo not found: missing.jpg"]);
  });
});
