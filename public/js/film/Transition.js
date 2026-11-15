import { easeIn, easeInOut, easeOut, lerp, rnd, seg } from "./ease.js";
import { C, circle, cover, group, isShape, line, morph, ring } from "./items.js";
import { ROUTE_DISC } from "./scenes/munich.js";
import { CLUMP, MAIN_BUBBLE } from "./scenes/dots.js";
import { COLD_R, PHOTO_RING } from "./scenes/mountains.js";

const isCircle = (item) => item?.type === "circle";
const notCircle = (item) => !isCircle(item);

/**
 * How one scene hands over to the next. Nothing cuts: a round shape of the old scene
 * travels (or grows, or splits) into the main shape of the new one.
 *
 * frame(p) with p = 0..1 returns a frame like a scene does.
 */
export class Transition {
  /** Length of the transition that leaves a scene, by scene id. */
  static MS = {
    title: 600,
    city: 400,
    hotspot: 500,
    earlyBird: 400,
    fastest: 700,
    longest: 500,
    days: 1500, // the heap needs time to pile up
    kudos: 600,
    months: 500,
    sports: 700,
    alps: 600,
    highest: 400,
    hilliest: 600,
    everest: 500,
    series: 300,
    coldest: 800,
    lastRun: 500,
  };
  static DEFAULT_MS = 500;

  /** Pairs of scenes with a hand-over of their own: "from>to" -> method */
  static CUSTOM = {
    "title>city": "circlesToDot",
    "longest>days": "routeToDot",
    "days>kudos": "rainToHeap",
    "kudos>months": "flowToMonths",
    "months>sports": "mergeToSport",
    "sports>alps": "flyToPlaces",
    "coldest>lastRun": "irisOpens",
    "lastRun>finale": "irisCloses",
  };

  static durationMs(from) {
    return Transition.MS[from.id] ?? Transition.DEFAULT_MS;
  }

  /** A pile of dots lying on the bottom edge: slot i of `count`, widest row first. */
  static moundSlots(count) {
    const slots = [];
    for (let row = 0, widest = 38; slots.length < count; row++) {
      const n = Math.max(2, widest - 2 * row);
      for (let j = 0; j < n && slots.length < count; j++)
        slots.push({ x: 180 + (j - (n - 1) / 2) * 8, y: 632 - row * 7 });
    }
    return slots;
  }

  /**
   * @param shapesOnly a title bubble follows: only the shapes of the new scene arrive,
   *   its words come after the bubble (TitleBubble)
   */
  constructor(from, to, d, { shapesOnly = false } = {}) {
    this.from = from;
    this.to = to;
    this.d = d;
    this.shapesOnly = shapesOnly;
  }

  frame(p) {
    const custom = Transition.CUSTOM[`${this.from.id}>${this.to.id}`];
    return custom ? this[custom](p) : this.handOver(p);
  }

  /** What of the new scene may already be seen. */
  arriving(items) {
    return this.shapesOnly ? items.filter(isShape) : items.filter(Boolean);
  }

  /** The old scene without its dots (they are drawn by the transition), fading out. */
  oldRest(p, until = 0.25, keep = notCircle) {
    return group(this.from.frame(1, this.d).items.filter(Boolean).filter(keep), { alpha: 1 - seg(p, 0, until) });
  }

  /** The new scene, fading in from `start`. */
  newScene(p, start = 0.7) {
    return group(this.arriving(this.to.frame(0, this.d).items), { alpha: seg(p, start, 1) });
  }

  /** The old scene fades out, the new one fades in, and the exit shape flies to the entry shape. */
  handOver(p, { keepOld = () => true, bend = 30 } = {}) {
    const { from, to, d } = this;
    const a = from.frame(1, d);
    const b = to.frame(0, d);
    const q = easeInOut(p);
    return {
      backdrop: lerp(a.backdrop, b.backdrop, q),
      mapZoom: a.mapZoom ?? b.mapZoom,
      items: [
        group(a.items.filter(Boolean).filter(keepOld), { alpha: 1 - seg(p, 0, 0.3) }),
        this.newScene(p),
        ...morph(from.exit(d), to.enter(d), q, bend),
      ],
    };
  }

  /** The two big circles shrink into the dot, which leaves for the first run's start. */
  circlesToDot(p) {
    const base = this.handOver(p, { keepOld: (item) => !(isCircle(item) && item.r > 50) });
    const q = easeInOut(seg(p, 0, 0.6));
    const dot = this.from.exit(this.d);
    base.items.unshift(
      circle(lerp(80, dot.x, q), lerp(610, dot.y, q), 170 * (1 - q), C.orange),
      circle(lerp(305, dot.x, q), lerp(615, dot.y, q), 115 * (1 - q), C.yellow),
    );
    return base;
  }

  /** The route becomes a single orange dot, which settles as January 1. */
  routeToDot(p) {
    const pull = easeIn(seg(p, 0, 0.5));
    const fly = easeInOut(seg(p, 0.5, 1));
    const route = this.from.route(this.d).map(([x, y]) => [lerp(x, ROUTE_DISC.x, pull), lerp(y, ROUTE_DISC.y, pull)]);
    const day1 = this.to.enter(this.d);
    return {
      backdrop: 1,
      items: [
        this.oldRest(p, 0.3, (item) => item.type !== "line" && notCircle(item)),
        line(route, C.orange, 3, { alpha: 1 - pull }),
        this.newScene(p),
        circle(
          lerp(ROUTE_DISC.x, day1.x, fly),
          lerp(ROUTE_DISC.y, day1.y, fly),
          lerp(10 * pull, day1.r, fly),
          C.orange,
        ),
      ],
    };
  }

  /** All day dots rain down into one heap; the heap moves to the middle, where the kudos come out of it. */
  rainToHeap(p) {
    const { from, to, d } = this;
    const positions = from.positions(d);
    const mound = Transition.moundSlots(positions.length);
    const disc = to.heapSlots();
    const rain = seg(p, 0, 0.62);
    const move = easeInOut(seg(p, 0.66, 0.86));
    const dots = positions.map((position, i) => {
      const delay = rnd(i) * 0.35;
      const fall = easeIn(seg(rain, delay, delay + 0.65));
      const slot = mound[i];
      const target = disc[i % disc.length];
      const x = lerp(lerp(position.x, slot.x, fall), target.x, move);
      const y = lerp(lerp(position.y, slot.y, fall), target.y, move);
      return circle(x, y, 3.5, move > 0.5 ? C.orange : from.color(d, i + 1, true));
    });
    return { backdrop: 1, items: [this.oldRest(p, 0.1), ...dots, this.newScene(p, 0.86)] };
  }

  /** The kudos dots flow together into 12 clumps, one per month. */
  flowToMonths(p) {
    const { from, to, d } = this;
    const bubbles = to.bubbles(d);
    const cells = [...from.cells(d.stats.kudos)].sort((a, b) => a.y - b.y || a.x - b.x);
    const totalKm = bubbles.reduce((sum, bubble) => sum + bubble.km, 0) || 1;
    let month = 0;
    let upTo = bubbles[0].km / totalKm;
    const dots = cells.map((cell, i) => {
      while (month < 11 && (i + 0.5) / cells.length > upTo) upTo += bubbles[++month].km / totalKm;
      const bubble = bubbles[month];
      const angle = rnd(i) * Math.PI * 2;
      const distance = Math.sqrt(rnd(i + 1000)) * bubble.r * CLUMP;
      const delay = rnd(i + 2000) * 0.25;
      const flow = easeInOut(seg(p, delay, delay + 0.55));
      return circle(
        lerp(cell.x, bubble.x + Math.cos(angle) * distance, flow),
        lerp(cell.y, bubble.y + Math.sin(angle) * distance, flow),
        3.4,
        C.orange,
      );
    });
    const clumps = bubbles.map(({ x, y, r }) => circle(x, y, r * CLUMP * easeOut(seg(p, 0.55, 0.95)), C.orange));
    return { backdrop: 1, items: [this.oldRest(p), ...dots, ...clumps, this.newScene(p, 0.8)] };
  }

  /** The month bubbles merge into the one big bubble of the main sport. */
  mergeToSport(p) {
    const merged = this.from.bubbles(this.d).map(({ x, y, r }, i) => {
      const q = easeInOut(seg(p, i * 0.02, 0.7 + i * 0.02));
      return circle(lerp(x, MAIN_BUBBLE.x, q), lerp(y, MAIN_BUBBLE.y, q), lerp(r, MAIN_BUBBLE.startR, q), C.orange);
    });
    return { backdrop: 1, items: [this.oldRest(p), ...merged, this.newScene(p, 0.75)] };
  }

  /** The big bubble shrinks to the Munich dot; the small ones fly out to their places. */
  flyToPlaces(p) {
    const { from, to, d } = this;
    const { home, pins } = to.pins(d);
    const q = easeInOut(p);
    const others = from.others(d).map((sport, i) => {
      const pin = pins[i] ?? home;
      return circle(
        lerp(sport.x, pin.x, q),
        lerp(sport.y, pin.y, q),
        lerp(sport.r, 6, q),
        q > 0.5 ? C.yellow : sport.color,
        1 - seg(p, 0.8, 1),
      );
    });
    return {
      backdrop: 1,
      items: [this.oldRest(p), this.newScene(p), ...others, ...morph(from.exit(d), to.enter(d), q, 0)],
    };
  }

  /** The ring opens like an iris onto the next day's photo. */
  irisOpens(p) {
    const { from, d } = this;
    const r = lerp(COLD_R, 520, easeIn(p));
    return {
      backdrop: 1,
      items: [
        group(from.frame(1, d).items, { alpha: 1 - seg(p, 0.2, 0.6) }),
        cover("lastRun", { clip: { ...PHOTO_RING, r }, alpha: seg(p, 0, 0.3) }),
        ring(PHOTO_RING.x, PHOTO_RING.y, r, from.exit(d).color, 3, 1 - seg(p, 0.5, 0.9)),
      ],
    };
  }

  /** The iris closes to the dot of the end screen. */
  irisCloses(p) {
    const { from, to, d } = this;
    const home = to.enter(d);
    const q = easeInOut(p);
    const clip = { x: lerp(180, home.x, q), y: lerp(320, home.y, q), r: lerp(520, home.r, easeOut(p)) };
    return {
      backdrop: 1,
      items: [
        this.newScene(p, 0.6),
        cover("lastRun", { clip, alpha: 1 - seg(p, 0.85, 1) }),
        group(
          from.frame(1, d).items.filter((item) => item && item.type !== "cover" && item.type !== "shade"),
          { alpha: 1 - seg(p, 0, 0.2) },
        ),
        ring(clip.x, clip.y, clip.r, C.white, 2, seg(p, 0.5, 0.8)),
        circle(clip.x, clip.y, home.r, C.white, seg(p, 0.85, 1)),
      ],
    };
  }
}
