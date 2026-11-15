import assert from "node:assert/strict";

/** Every number of every item, also inside groups. */
function numbers(items) {
  return items
    .filter(Boolean)
    .flatMap((item) => [
      ...Object.values(item).filter((value) => typeof value === "number"),
      ...(item.points ?? []).flat(),
      ...(item.items ? numbers(item.items) : []),
    ]);
}

/** A frame the Painter can draw: backdrop 0..1, no NaN or undefined coordinate. */
export function assertDrawable(frame, what) {
  assert.ok(frame.backdrop >= 0 && frame.backdrop <= 1, `${what}: backdrop`);
  assert.ok(numbers(frame.items).every(Number.isFinite), `${what}: every coordinate is a number`);
}

/** The strings of a frame's texts, not looking into groups. */
export const textsOf = (frame) => frame.items.filter((item) => item?.type === "text").map((item) => item.str);
