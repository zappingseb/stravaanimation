import { lerp, seg } from "./ease.js";

// What a scene returns: a list of plain objects ("items") in a 360 x 640 design space.
// Painter.js draws them; tests can look at them without a canvas.

export const W = 360;
export const H = 640;

export const C = {
  bg: "#111111",
  surface: "#1C1C1C",
  tile: "#2A2A2A",
  dim: "#3A3A3A",
  muted: "#A8A8A8",
  white: "#ffffff",
  orange: "#FF5522",
  yellow: "#FFC400",
  green: "#5CFF3B",
  purple: "#C04DFF",
  pink: "#FF3EA5",
  red: "#C4161C", // line of the hike profile
};

export const circle = (x, y, r, fill, alpha = 1) => ({ type: "circle", x, y, r, fill, alpha });
export const ring = (x, y, r, color, width = 3, alpha = 1, dash = null) => ({
  type: "ring",
  x,
  y,
  r,
  color,
  width,
  alpha,
  dash,
});
/** from/to: 0..1 of a full turn, starting at 12 o'clock */
export const arc = (x, y, r, from, to, color, width, alpha = 1) => ({
  type: "arc",
  x,
  y,
  r,
  from,
  to,
  color,
  width,
  alpha,
});
export const pill = (x, y, w, h, fill, alpha = 1) => ({ type: "pill", x, y, w, h, fill, alpha });
export const line = (points, color, width = 3, options = {}) => ({
  type: "line",
  points,
  color,
  width,
  alpha: 1,
  progress: 1,
  ...options,
});
export const area = (points, fill, alpha = 1) => ({ type: "area", points, fill, alpha });
export const group = (items, options = {}) => ({
  type: "group",
  items,
  x: 0,
  y: 0,
  rot: 0,
  scale: 1,
  alpha: 1,
  ...options,
});
/** Round photo; `key` is a scene id from config.film.photos. */
export const photo = (key, x, y, r, options = {}) => ({
  type: "photo",
  key,
  x,
  y,
  r,
  alpha: 1,
  border: C.yellow,
  ...options,
});
/** Photo covering the whole frame, optionally seen through a round hole. */
export const cover = (key, options = {}) => ({ type: "cover", key, alpha: 1, clip: null, ...options });
/** Dark vertical gradient over the whole frame; stops are [position 0..1, darkness 0..1]. */
export const shade = (stops, alpha = 1) => ({ type: "shade", stops, alpha });
/** A ring filled from the bottom up to `level` (0..1). */
export const tank = (x, y, r, level, color) => ({ type: "tank", x, y, r, level, color });

/**
 * y is the baseline. font: "sans" (Space Grotesk) or "mono" (Space Mono).
 * `after` appends more text on the same line, e.g. a unit: [{ str, size, font, color, gap }]
 */
export function text(str, x, y, options = {}) {
  return {
    type: "text",
    str: String(str),
    x,
    y,
    size: 15,
    weight: 400,
    font: "sans",
    color: C.white,
    align: "left",
    alpha: 1,
    ...options,
  };
}

/** Small yellow label above a number. */
export const label = (str, alpha = 1, y = 66) =>
  text(str.toUpperCase(), 20, y, { font: "mono", size: 11, color: C.yellow, spacing: 1.5, alpha });

/** One split-flap card per character, left to right from x. */
export function flaps(
  str,
  x,
  y,
  { w = 50, h = 70, gap = 5, size = 46, color = C.white, alpha = 1, gapAfter = {} } = {},
) {
  const items = [];
  let left = x;
  [...String(str)].forEach((char, i) => {
    items.push({
      type: "flap",
      x: left,
      y,
      w,
      h,
      char,
      size,
      color: typeof color === "function" ? color(i) : color,
      alpha,
    });
    left += w + gap + (gapAfter[i] ?? 0);
  });
  return items;
}

export const flapsWidth = (count, w, gap) => count * w + (count - 1) * gap;

/**
 * One card of an airport board on its way to `target`: it starts blank and flips through
 * the digits before the target. `step` counts flips (2.3 = third flip, 30 % done).
 */
export function flipFlap(target, step, options, flips = 6) {
  const isDigit = /\d/.test(target);
  const digitBefore = (steps) => String((((Number(target) - steps) % 10) + 10) % 10);
  const sequence = isDigit
    ? [" ", ...Array.from({ length: flips }, (_, k) => digitBefore(flips - 1 - k))]
    : [" ", target];
  const last = sequence.length - 1;
  const at = Math.min(last, Math.max(0, Math.floor(step)));
  return {
    type: "flap",
    w: 50,
    h: 70,
    size: 46,
    color: C.white,
    alpha: 1,
    ...options,
    char: sequence[at],
    next: sequence[at + 1],
    flip: at < last ? Math.max(0, step - at) : 0,
  };
}

/** Text and flip cards, as opposed to shapes and photos. */
export const isWords = (item) => item?.type === "text" || item?.type === "flap";
export const isShape = (item) => Boolean(item) && !isWords(item);

/** A circle on its way from anchor a to anchor b: { x, y, r, color, ring?: line width } */
export function morph(a, b, p, bend = 0) {
  const x = lerp(a.x, b.x, p);
  const y = lerp(a.y, b.y, p) - Math.sin(p * Math.PI) * bend;
  const r = Math.max(0, lerp(a.r, b.r, p));
  const color = p < 0.5 ? a.color : b.color;
  const width = lerp(a.ring ?? 0, b.ring ?? 0, p);
  if (a.ring && b.ring) return [ring(x, y, r, color, width)];
  if (!a.ring && !b.ring) return [circle(x, y, r, color)];
  // A ring that becomes a dot (or the other way round) stays a ring while it is big;
  // it is only filled close to the dot's end of the way.
  const filled = a.ring ? seg(p, 0.7, 1) : 1 - seg(p, 0, 0.3);
  const [dotColor, ringColor] = a.ring ? [b.color, a.color] : [a.color, b.color];
  return [circle(x, y, r, dotColor, filled), ring(x, y, r, ringColor, Math.max(1, a.ring ?? b.ring), 1 - filled)];
}

/** [lat, lng] route fitted into a box around (cx, cy); returns [[x, y], ...] */
export function fitRoute(route, cx, cy, w, h) {
  if (!route || route.length < 2) return [];
  const lats = route.map((p) => p[0]);
  const lngs = route.map((p) => p[1]);
  const [south, north] = [Math.min(...lats), Math.max(...lats)];
  const [west, east] = [Math.min(...lngs), Math.max(...lngs)];
  // a degree of longitude is shorter than one of latitude
  const squeeze = Math.cos((((south + north) / 2) * Math.PI) / 180);
  const scale = Math.min(w / ((east - west) * squeeze || 1e-9), h / (north - south || 1e-9));
  return route.map(([lat, lng]) => [
    cx + (lng - (west + east) / 2) * squeeze * scale,
    cy - (lat - (south + north) / 2) * scale,
  ]);
}

/** Elevation profile as points in a box: x from left to left + w, the highest point at top. */
export function fitProfile(profile, left, top, w, bottom) {
  if (!profile || profile.length < 2) return [];
  const low = Math.min(...profile);
  const high = Math.max(...profile);
  return profile.map((e, i) => [
    left + (w * i) / (profile.length - 1),
    bottom - ((e - low) / (high - low || 1)) * (bottom - top),
  ]);
}

/** "Urlaub heute 😉" -> "Urlaub heute": the film fonts have no emoji. */
export const plainName = (name) =>
  String(name ?? "")
    .replace(/[\p{Extended_Pictographic}️‍]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

export const thousands = (n) => Math.round(n).toLocaleString("en-US");

/** seconds -> "4:16" */
export const clock = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.round(seconds) % 60).padStart(2, "0")}`;
