import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { Painter } from "../../public/js/film/Painter.js";
import {
  arc,
  area,
  circle,
  cover,
  flaps,
  flipFlap,
  group,
  line,
  photo,
  pill,
  ring,
  shade,
  tank,
  text,
} from "../../public/js/film/items.js";
import { callsOf, fakeCanvas } from "./helpers/fakeCanvas.js";

describe("Painter", () => {
  let canvas;
  let painter;
  const image = { naturalWidth: 1000, naturalHeight: 500 };
  const paint = (...items) => {
    canvas.calls.length = 0;
    painter.paint({ backdrop: 1, items });
  };

  beforeEach(() => {
    globalThis.window = { devicePixelRatio: 2 };
    canvas = fakeCanvas(360, 640);
    painter = new Painter(canvas, new Map([["longest", { image, focus: 0.5 }]]));
  });

  afterEach(() => {
    delete globalThis.window;
  });

  it("scales the 360 x 640 design space to the canvas and its pixel density", () => {
    assert.deepEqual([canvas.width, canvas.height, painter.scale], [720, 1280, 1]);
    paint();
    assert.deepEqual(callsOf(canvas, "setTransform").at(-1), [2, 0, 0, 2, 0, 0]);
  });

  it("centers the design space on a wider canvas and lets the backdrop bleed to its edges", () => {
    canvas.clientWidth = 720;
    painter.resize();
    assert.deepEqual([painter.scale, painter.left, painter.top], [1, 180, 0]);
    assert.deepEqual(painter.toDesign(180, 0), { x: 0, y: 0 });
    paint();
    assert.deepEqual(callsOf(canvas, "fillRect"), [[-180, 0, 720, 640]]);
  });

  it("paints no backdrop over the map when the frame has none", () => {
    painter.paint({ backdrop: 0, items: [] });
    assert.deepEqual(callsOf(canvas, "fillRect"), []);
  });

  it("skips nothing-items and invisible ones", () => {
    paint(null, false, circle(10, 10, 5, "red", 0), circle(10, 10, 0, "red"), ring(10, 10, 0, "red"));
    assert.deepEqual(callsOf(canvas, "arc"), []);
  });

  it("draws circles, rings, arcs and pills", () => {
    paint(
      circle(10, 20, 5, "red"),
      ring(30, 40, 6, "blue", 3, 1, [1, 2]),
      arc(50, 60, 7, 0, 0.5, "green", 4),
      pill(1, 2, 30, 10, "white"),
    );
    assert.deepEqual(callsOf(canvas, "arc"), [
      [10, 20, 5, 0, Math.PI * 2],
      [30, 40, 6, 0, Math.PI * 2],
      [50, 60, 7, -Math.PI / 2, Math.PI / 2],
    ]);
    assert.deepEqual(callsOf(canvas, "setLineDash"), [[[1, 2]], [[]]]);
    assert.deepEqual(callsOf(canvas, "roundRect"), [[1, 2, 30, 10, 5]]);
  });

  it("draws an arc only when it has a length", () => {
    paint(arc(50, 60, 7, 0.5, 0.5, "green", 4));
    assert.deepEqual(callsOf(canvas, "arc"), []);
  });

  it("draws a line up to its progress, ending between two points", () => {
    paint(
      line(
        [
          [0, 0],
          [10, 0],
          [10, 10],
        ],
        "red",
        3,
        { progress: 0.75 },
      ),
    );
    assert.deepEqual(callsOf(canvas, "moveTo"), [[0, 0]]);
    assert.deepEqual(callsOf(canvas, "lineTo"), [
      [10, 0],
      [10, 5],
    ]);
    paint(
      line(
        [
          [0, 0],
          [10, 0],
        ],
        "red",
        3,
        { progress: 0 },
      ),
      line([[0, 0]], "red"),
    );
    assert.deepEqual(callsOf(canvas, "moveTo"), []);
  });

  it("fills an area and a tank up to its level", () => {
    paint(
      area(
        [
          [0, 0],
          [10, 0],
          [10, 10],
        ],
        "red",
      ),
      tank(100, 100, 50, 0.5, "yellow"),
      area(
        [
          [0, 0],
          [1, 1],
        ],
        "red",
      ),
    );
    assert.equal(callsOf(canvas, "closePath").length, 1);
    assert.deepEqual(callsOf(canvas, "fillRect").at(-1), [50, 100, 100, 50]);
  });

  it("applies the alpha of a group to its items and moves, turns and scales them", () => {
    const alphas = [];
    const ctx = canvas.getContext("2d");
    const original = ctx.arc;
    canvas.ctx.arc = (...args) => {
      alphas.push(canvas.ctx.globalAlpha);
      original(...args);
    };
    paint(group([circle(0, 0, 5, "red", 0.5)], { alpha: 0.5, x: 10, y: 20, rot: 1, scale: 2 }));
    assert.deepEqual(alphas, [0.25]);
    assert.deepEqual(callsOf(canvas, "translate"), [[10, 20]]);
    assert.deepEqual(callsOf(canvas, "rotate"), [[1]]);
    assert.deepEqual(callsOf(canvas, "scale"), [[2, 2]]);
  });

  it("writes text with its font and wraps it at maxWidth", () => {
    paint(text("one two three", 20, 100, { size: 10, weight: 700, font: "mono", maxWidth: 80, lineHeight: 12 }));
    assert.deepEqual(callsOf(canvas, "fillText"), [
      ["one two", 20, 100],
      ["three", 20, 112],
    ]);
    assert.equal(canvas.ctx.font, '700 10px "Space Mono", monospace');
  });

  it("appends a unit after a number on the same line", () => {
    paint(text("273", 20, 100, { after: [{ str: "OF 365", gap: 12 }] }));
    assert.deepEqual(callsOf(canvas, "fillText"), [
      ["273", 20, 100],
      ["OF 365", 62, 100],
    ]);
  });

  it("draws a split-flap card as two halves, and four while it flips", () => {
    paint(...flaps("7", 0, 0));
    assert.deepEqual(
      callsOf(canvas, "fillText").map(([char]) => char),
      ["7", "7"],
    );
    paint(flipFlap("5", 3.25, { x: 0, y: 0 }));
    assert.deepEqual(
      callsOf(canvas, "fillText").map(([char]) => char),
      ["3", "2", "2"],
    );
    paint(flipFlap("5", 3.75, { x: 0, y: 0 }));
    assert.deepEqual(
      callsOf(canvas, "fillText").map(([char]) => char),
      ["3", "2", "3"],
    );
  });

  it("crops a photo to cover its circle, around its focus", () => {
    paint(photo("longest", 100, 100, 50));
    assert.deepEqual(callsOf(canvas, "drawImage"), [[image, 250, 0, 500, 500, 50, 50, 100, 100]]);
  });

  it("leaves an empty circle for a photo that is missing", () => {
    paint(photo("fastest", 100, 100, 50, { border: null }));
    assert.deepEqual(callsOf(canvas, "drawImage"), []);
    assert.deepEqual(callsOf(canvas, "fillRect").at(-1), [50, 50, 100, 100]);
  });

  it("covers the whole frame with a photo, seen through a round hole", () => {
    paint(cover("longest", { clip: { x: 180, y: 320, r: -5 } }));
    assert.deepEqual(callsOf(canvas, "arc"), [[180, 320, 0, 0, Math.PI * 2]]);
    assert.deepEqual(callsOf(canvas, "drawImage"), [[image, 359.375, 0, 281.25, 500, 0, 0, 360, 640]]);
    paint(cover("missing"));
    assert.deepEqual(callsOf(canvas, "drawImage"), []);
  });

  it("darkens the frame with a gradient", () => {
    paint(
      shade([
        [0, 0.8],
        [1, 0],
      ]),
    );
    assert.deepEqual(callsOf(canvas, "addColorStop"), [
      [0, "rgba(17, 17, 17, 0.8)"],
      [1, "rgba(17, 17, 17, 0)"],
    ]);
  });
});
