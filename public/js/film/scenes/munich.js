import { easeInOut, easeOut, seg } from "../ease.js";
import { Scene } from "../Scene.js";
import {
  C,
  arc,
  circle,
  clock,
  fitRoute,
  flaps,
  flapsWidth,
  flipFlap,
  label,
  line,
  photo,
  pill,
  plainName,
  ring,
  shade,
  text,
} from "../items.js";

// Act 1: Munich. Title, the city tracks (drawn by the map itself), the most-run spot,
// the start-hour clock, the fastest and the longest run.
//

const TITLE_DOT = { x: 172, y: 474, r: 7, color: C.white };
/** Share of the scene one flip of a card takes */
const TITLE_FLIP_T = 0.055;

export class TitleScene extends Scene {
  id = "title";

  durationMs(d) {
    return d.intro.seconds * 1000;
  }

  frame(t, d) {
    const final = [...String(d.year)];
    const width = flapsWidth(final.length, 58, 8);
    // Airport board: every card flips through the digits before its own, one card after the other.
    const card = (target, i) =>
      flipFlap(target, (t - 0.3 - 0.06 * i) / TITLE_FLIP_T, {
        x: 180 - width / 2 + i * 66,
        y: 144,
        w: 58,
        h: 80,
        size: 52,
        alpha: seg(t, 0.2, 0.28),
      });
    const [first, second] = d.intro.lines;
    return {
      backdrop: 1,
      items: [
        circle(80, 610, 170 * easeOut(seg(t, 0, 0.4)), C.orange),
        circle(305, 615, 115 * easeOut(seg(t, 0.15, 0.5)), C.yellow),
        ring(TITLE_DOT.x, TITLE_DOT.y, 22, C.white, 2),
        circle(TITLE_DOT.x, TITLE_DOT.y, TITLE_DOT.r, C.white),
        text(d.intro.kicker.toUpperCase(), 180, 124, {
          font: "mono",
          size: 15,
          weight: 700,
          align: "center",
          spacing: 6,
          alpha: seg(t, 0.2, 0.3),
        }),
        ...final.map(card),
        text(first ?? "", 180, 286, {
          size: 26,
          weight: 700,
          color: C.orange,
          align: "center",
          alpha: seg(t, 0.84, 0.91),
        }),
        text(second ?? "", 180, 321, {
          size: 26,
          weight: 700,
          color: C.yellow,
          align: "center",
          alpha: seg(t, 0.91, 0.98),
        }),
      ],
    };
  }

  enter() {
    return TITLE_DOT;
  }

  exit() {
    return TITLE_DOT;
  }
}

/** The end mirrors the title: the same circles and cards, now with "DONE!" and the year's km. */
export class FinaleScene extends Scene {
  id = "finale";

  durationMs() {
    return 4000;
  }

  frame(t, d) {
    const year = String(d.year);
    const yearWidth = flapsWidth(year.length, 58, 8);
    const km = d.stats.totalKm.toFixed(1);
    const kmWidth = flapsWidth(km.length, 44, 6);
    const head = seg(t, 0.05, 0.15);
    return {
      backdrop: 1,
      items: [
        circle(80, 610, 170 * easeOut(seg(t, 0, 0.35)), C.orange),
        circle(305, 615, 115 * easeOut(seg(t, 0.1, 0.45)), C.yellow),
        ring(TITLE_DOT.x, TITLE_DOT.y, 22, C.white, 2),
        circle(TITLE_DOT.x, TITLE_DOT.y, TITLE_DOT.r, C.white),
        text(d.intro.kicker.toUpperCase(), 180, 104, {
          font: "mono",
          size: 15,
          weight: 700,
          align: "center",
          spacing: 6,
          alpha: head,
        }),
        ...flaps(year, 180 - yearWidth / 2, 124, { w: 58, h: 80, gap: 8, size: 52, alpha: head }),
        text(d.finaleTitle, 180, 258, {
          size: 34,
          weight: 700,
          color: C.orange,
          align: "center",
          alpha: seg(t, 0.25, 0.35),
        }),
        ...[...km].map((char, i) =>
          flipFlap(char, (t - 0.35 - 0.04 * i) / 0.05, {
            x: 180 - kmWidth / 2 + i * 50,
            y: 284,
            w: 44,
            h: 62,
            size: 40,
            color: C.orange,
            alpha: seg(t, 0.25, 0.35),
          }),
        ),
        text("km since Jan 1st", 180, 370, {
          font: "mono",
          size: 11,
          color: C.muted,
          align: "center",
          alpha: seg(t, 0.25, 0.35),
        }),
      ],
    };
  }

  enter() {
    return TITLE_DOT;
  }

  exit() {
    return TITLE_DOT;
  }
}

/**
 * The map draws the runs; the film hands the dot over to it and takes it back,
 * and says what the lines mean.
 */
export class CityScene extends Scene {
  id = "city";

  durationMs() {
    return 0;
  }

  frame() {
    return {
      backdrop: 0,
      items: [
        // below the date board
        pill(12, 70, 204, 42, C.bg, 0.65),
        text("EVERY LINE IS ONE RUN", 28, 88, { font: "mono", size: 11, weight: 700 }),
        text("BRIGHTER = RUN MORE OFTEN", 28, 103, { font: "mono", size: 11, color: C.yellow }),
      ],
    };
  }

  enter(d) {
    return { ...d.cityPoint(d.firstRunStart), r: 6, color: C.white };
  }

  exit(d) {
    return { ...d.cityPoint(d.lastRunEnd), r: 6, color: C.white };
  }
}

const SPOT = { x: 180, y: 230 };

export class HotspotScene extends Scene {
  id = "hotspot";

  available(d) {
    return Boolean(d.stats.hotspot);
  }

  frame(t, d) {
    const { count, of } = d.stats.hotspot;
    const zoom = easeInOut(seg(t, 0, 0.5));
    const from = d.cityPoint([d.stats.hotspot.lat, d.stats.hotspot.lng]);
    const shown = Math.round(d.count(count, seg(t, 0.55, 0.9)));
    const panel = seg(t, 0.5, 0.58);
    const sentence = (d.film.texts?.hotspot ?? "{count} of {of} runs went through this 100 m stretch.")
      .replace("{count}", count)
      .replace("{of}", of);
    const pulse = 1 + 0.06 * Math.sin(t * Math.PI * 10);
    return {
      backdrop: 0,
      // the map is enlarged around the spot and the spot moves to SPOT
      mapZoom: {
        scale: 1 + 1.6 * zoom,
        x: from.x,
        y: from.y,
        toX: from.x + (SPOT.x - from.x) * zoom,
        toY: from.y + (SPOT.y - from.y) * zoom,
      },
      items: [
        shade(
          [
            [0, 0.7],
            [0.22, 0.15],
            [0.55, 0.15],
            [0.74, 0.96],
            [1, 0.96],
          ],
          seg(t, 0.3, 0.5),
        ),
        ring(SPOT.x, SPOT.y, 70 * pulse, C.white, 2, seg(t, 0.5, 0.6), [0.1, 7]),
        ring(SPOT.x, SPOT.y, 36, C.yellow, 3, seg(t, 0.4, 0.5)),
        circle(SPOT.x, SPOT.y, 7, C.white, seg(t, 0.4, 0.5)),
        label("Most run spot", panel, 474),
        ...flaps(String(shown).padStart(String(count).length, "0"), 20, 486, { alpha: panel }),
        text("× PASSED", 30 + flapsWidth(String(count).length, 50, 5), 550, {
          font: "mono",
          size: 13,
          weight: 700,
          color: C.orange,
          alpha: panel,
        }),
        text(sentence, 20, 586, { size: 15, maxWidth: 320, lineHeight: 21, alpha: seg(t, 0.88, 1) }),
      ],
    };
  }

  enter(d) {
    return { ...d.cityPoint([d.stats.hotspot.lat, d.stats.hotspot.lng]), r: 8, color: C.yellow, ring: 3 };
  }

  exit() {
    return { ...SPOT, r: 36, color: C.yellow, ring: 3 };
  }
}

const DIAL = { x: 180, y: 330, r: 125 };
const HOUR_WORDS = [
  "midnight",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "noon",
];

export class EarlyBirdScene extends Scene {
  id = "earlyBird";

  frame(t, d) {
    const counts = d.stats.startHours;
    const most = Math.max(...counts, 1);
    const peak = counts.indexOf(most);
    const all = counts.reduce((sum, n) => sum + n, 0);
    const now = 24 * seg(t, 0, 0.8);
    const done = t >= 0.9;
    const at = (hour) => {
      const angle = (hour / 24) * Math.PI * 2 - Math.PI / 2;
      return { x: DIAL.x + DIAL.r * Math.cos(angle), y: DIAL.y + DIAL.r * Math.sin(angle) };
    };
    const bubbles = counts.map((n, hour) => {
      const on = hour < now && n > 0;
      const { x, y } = at(hour);
      const grow = easeOut(seg(now, hour, hour + 1.5));
      return circle(
        x,
        y,
        on ? Math.max(3, 22 * Math.sqrt(n / most)) * grow : 2,
        on ? (hour === peak && done ? C.pink : C.orange) : C.dim,
      );
    });
    const hand = at(now);
    const end = seg(t, 0.9, 1);
    const hourWord = HOUR_WORDS[peak > 12 ? peak - 12 : peak];
    return {
      backdrop: 1,
      items: [
        label("Early bird", seg(t, 0, 0.08)),
        text(`Out the door at ${hourWord}`, 20, 100, { size: 30, weight: 700, alpha: end }),
        ring(DIAL.x, DIAL.y, DIAL.r, C.tile, 2),
        ...bubbles,
        circle(hand.x, hand.y, 7, C.white, now >= 24 ? 0 : 1),
        ring(hand.x, hand.y, 13, C.white, 2, now >= 24 ? 0 : 1),
        ...[
          ["00", 180, 189],
          ["06", 328, 334],
          ["12", 180, 484],
          ["18", 32, 334],
        ].map(([str, x, y]) => text(str, x, y, { font: "mono", size: 10, color: C.muted, align: "center" })),
        text(`${String(done ? peak : Math.min(23, Math.floor(now))).padStart(2, "0")}:00`, 180, 336, {
          size: 50,
          weight: 700,
          align: "center",
          color: done ? C.pink : C.white,
        }),
        text(done ? `${most} OF ${all} STARTS` : "STARTS PER HOUR", 180, 356, {
          font: "mono",
          size: 11,
          align: "center",
        }),
        text(
          `${Math.round((most / Math.max(1, all)) * 100)} % of all runs and hikes started between ${peak} and ${peak + 1} o'clock.`,
          20,
          590,
          { size: 15, maxWidth: 320, lineHeight: 21, alpha: end },
        ),
      ],
    };
  }

  enter() {
    return { ...DIAL, color: C.tile, ring: 2 };
  }

  exit() {
    return { ...DIAL, color: C.tile, ring: 2 };
  }
}

const PACE_RING = { x: 180, y: 235, r: 112 };

export class FastestScene extends Scene {
  id = "fastest";

  available(d) {
    return Boolean(d.stats.fastest);
  }

  frame(t, d) {
    const run = d.stats.fastest;
    const pace = run.seconds / run.km;
    const p = easeInOut(seg(t, 0, 0.7));
    const name = plainName(run.name);
    const isRecord = /\bPR\b|\bPB\b/.test(name);
    return {
      backdrop: 1,
      items: [
        label("Fastest run", seg(t, 0, 0.08)),
        isRecord && pill(254, 51, 86, 22, C.green, seg(t, 0.7, 0.76)),
        isRecord &&
          text(`${Math.round(run.km)} KM PR`, 297, 66, {
            font: "mono",
            size: 10,
            weight: 700,
            color: C.bg,
            align: "center",
            alpha: seg(t, 0.7, 0.76),
          }),
        ring(PACE_RING.x, PACE_RING.y, PACE_RING.r, C.tile, 24),
        arc(PACE_RING.x, PACE_RING.y, PACE_RING.r, 0, 0.87 * p, C.orange, 24),
        text(clock(d.countDown(pace, seg(t, 0, 0.7))), 180, 256, {
          size: 76,
          weight: 700,
          align: "center",
          spacing: -2,
        }),
        text("MIN / KM", 180, 278, { font: "mono", size: 11, color: C.muted, align: "center" }),
        photo("fastest", 280, 456, 60, { alpha: seg(t, 0.76, 0.86) }),
        text(name, 20, 440, { size: 20, weight: 700, maxWidth: 190, lineHeight: 25, alpha: seg(t, 0.82, 0.92) }),
      ],
    };
  }

  enter() {
    return { ...PACE_RING, color: C.tile, ring: 24 };
  }

  exit() {
    return { ...PACE_RING, color: C.orange, ring: 24 };
  }
}

export const ROUTE_DISC = { x: 275, y: 275, r: 65 };

export class LongestScene extends Scene {
  id = "longest";

  /** The run's route inside its disc. */
  route(d) {
    return fitRoute(d.stats.longest.route, ROUTE_DISC.x, ROUTE_DISC.y, 76, 100);
  }

  available(d) {
    return Boolean(d.stats.longest);
  }

  frame(t, d) {
    const run = d.stats.longest;
    const points = this.route(d);
    const p = easeInOut(seg(t, 0.05, 0.7));
    const start = points[0] ?? [ROUTE_DISC.x, ROUTE_DISC.y];
    const end = points[points.length - 1] ?? start;
    return {
      backdrop: 1,
      items: [
        label("Longest run", seg(t, 0, 0.08)),
        photo("longest", 135, 203, 115, { alpha: seg(t, 0.7, 0.82) }),
        circle(ROUTE_DISC.x, ROUTE_DISC.y, ROUTE_DISC.r + 3, C.bg),
        circle(ROUTE_DISC.x, ROUTE_DISC.y, ROUTE_DISC.r, C.surface),
        line(points, C.orange, 3, { progress: p }),
        circle(start[0], start[1], 4, C.white),
        circle(end[0], end[1], 4, C.yellow, p >= 1 ? 1 : 0),
        text(d.count(run.km, seg(t, 0.05, 0.7)).toFixed(1), 20, 452, {
          size: 110,
          weight: 700,
          color: C.orange,
          spacing: -4,
          after: [{ str: "KM", font: "mono", size: 16, weight: 700, color: C.white, gap: 12 }],
        }),
        text(d.shortDate(run.date), 20, 580, { font: "mono", size: 11, color: C.muted, alpha: seg(t, 0.86, 1) }),
        text(plainName(run.name), 20, 606, { size: 20, weight: 700, alpha: seg(t, 0.86, 1) }),
      ],
    };
  }

  enter(d) {
    const [x, y] = this.route(d)[0] ?? [ROUTE_DISC.x, ROUTE_DISC.y];
    return { x, y, r: 4, color: C.white };
  }

  exit() {
    return { x: ROUTE_DISC.x, y: ROUTE_DISC.y, r: 10, color: C.orange };
  }
}
