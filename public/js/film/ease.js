// Small helpers for "everything is a function of time".

export const clamp01 = (x) => Math.min(1, Math.max(0, x));

/** 0 before a, 1 after b, linear in between. */
export const seg = (t, a, b) => clamp01((t - a) / (b - a));

export const lerp = (a, b, p) => a + (b - a) * p;

export const easeOut = (p) => 1 - (1 - p) ** 3;
export const easeIn = (p) => p ** 3;
export const easeInOut = (p) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2);
/** Overshoots a little before settling, for things that pop in. */
export const easeOutBack = (p) => 1 + 2.7 * (p - 1) ** 3 + 1.7 * (p - 1) ** 2;

/**
 * A number on its way to `target`. Counters do not start at zero: a long run through
 * unrelated numbers pulls the eye away from everything else. They start `share` of the
 * target away and settle with an ease-out (fast first, slow at the end, so the final
 * digits can be read as they land). share > 0 counts up to the target, share < 0 down to it.
 */
export function countTo(target, p, share) {
  return target - target * share * (1 - easeOut(clamp01(p)));
}

/** Repeatable pseudo-random number 0..1 for index i (the film must look the same on every run). */
export function rnd(i) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
