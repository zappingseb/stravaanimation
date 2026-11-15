import { easeOut, easeOutBack, lerp, seg } from "../ease.js";
import { Scene } from "../Scene.js";
import { C, circle, flaps, label, text, thousands } from "../items.js";

// Act 2: the year in dots. Days active, kudos, km per month, sports by km.

const MONTH_LETTERS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAY_R = 3.5;

export class DaysScene extends Scene {
  id = "days";

  /** Where day `dayOfYear` (1-based) sits in the grid: one column per month, days top to bottom. */
  positions(d) {
    const lengths = [31, d.stats.daysInYear === 366 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const positions = [];
    lengths.forEach((length, month) => {
      for (let day = 0; day < length; day++) positions.push({ x: 27.5 + 26 * month, y: 155.5 + 10 * day, month });
    });
    return positions;
  }

  /** Color of a day's dot once the year is complete (streak = yellow). */
  color(d, dayOfYear, withStreak) {
    const { firstDay, days } = d.stats.streak;
    if (!d.activeSet.has(dayOfYear)) return C.dim;
    return withStreak && dayOfYear >= firstDay && dayOfYear < firstDay + days ? C.yellow : C.orange;
  }

  frame(t, d) {
    const positions = this.positions(d);
    const cutoff = Math.max(1, positions.length * seg(t, 0, 0.8));
    const streakOn = t >= 0.88;
    const count = Math.round(d.count(d.stats.activeDays.length, seg(t, 0, 0.8)));
    const dots = [];
    positions.forEach(({ x, y }, i) => {
      if (i >= cutoff) return;
      // day 1 arrives from the previous scene at full size; the others pop up
      const pop = i === 0 ? 1 : easeOutBack(seg(cutoff, i, i + 6));
      dots.push(circle(x, y, DAY_R * pop, this.color(d, i + 1, streakOn)));
    });
    const head = seg(t, 0, 0.08);
    const streak = seg(t, 0.88, 1);
    return {
      backdrop: 1,
      items: [
        label("Days active", head),
        text(count, 20, 126, {
          size: 60,
          weight: 500,
          color: C.orange,
          spacing: -1,
          alpha: head,
          after: [{ str: `OF ${positions.length}`, font: "mono", size: 13, color: C.muted }],
        }),
        ...dots,
        ...MONTH_LETTERS.map((letter, month) =>
          text(letter, 27.5 + 26 * month, 478, { font: "mono", size: 8, color: C.muted, align: "center", alpha: head }),
        ),
        text("LONGEST STREAK", 20, 556, { font: "mono", size: 10, color: C.muted, spacing: 1, alpha: streak }),
        text(d.stats.streak.days, 20, 604, {
          size: 52,
          weight: 700,
          color: C.yellow,
          alpha: streak,
          after: [{ str: "DAYS IN A ROW", font: "mono", size: 11, color: C.white }],
        }),
      ],
    };
  }

  enter() {
    return { x: 27.5, y: 155.5, r: DAY_R, color: C.orange };
  }

  exit() {
    return { x: 180, y: 310, r: DAY_R, color: C.orange };
  }
}

export const HEAP = { x: 180, y: 377, r: 44 };
const KUDOS_COLUMNS = 30;
const KUDOS_PITCH = 10.8;

const KUDOS_FLIGHT = 0.07; // share of the scene one dot is in the air

export class KudosScene extends Scene {
  id = "kudos";
  /** { count, cells } of the last cells() call */
  cellCache = null;

  available(d) {
    return (d.stats.kudos ?? 0) > 0;
  }

  /** Lattice points of a round heap of dots, innermost first. */
  heapSlots(radius = HEAP.r) {
    const slots = [];
    for (let gy = -7; gy <= 7; gy++) {
      for (let gx = -7; gx <= 7; gx++) {
        const x = gx * 8 + (gy % 2 ? 4 : 0);
        const y = gy * 7;
        if (Math.hypot(x, y) <= radius) slots.push({ x: HEAP.x + x, y: HEAP.y + y, distance: Math.hypot(x, y) });
      }
    }
    return slots.sort((a, b) => a.distance - b.distance);
  }

  /** Grid cell of every kudos dot, in the order they leave the heap (farthest cell first). */
  cells(count) {
    if (this.cellCache?.count === count) return this.cellCache.cells;
    const rows = Math.ceil(count / KUDOS_COLUMNS);
    const top = HEAP.y - ((rows - 1) * KUDOS_PITCH) / 2;
    const cells = [];
    for (let i = 0; i < count; i++) {
      const x = 20 + 3.4 + KUDOS_PITCH * (i % KUDOS_COLUMNS);
      const y = top + KUDOS_PITCH * Math.floor(i / KUDOS_COLUMNS);
      cells.push({ x, y, distance: Math.hypot(x - HEAP.x, y - HEAP.y) });
    }
    cells.sort((a, b) => b.distance - a.distance);
    this.cellCache = { count, cells };
    return cells;
  }

  frame(t, d) {
    const total = d.stats.kudos;
    const cells = this.cells(total);
    const launched = total * seg(t, 0, 0.85 - KUDOS_FLIGHT);
    const shown = Math.round(d.count(total, seg(t, 0, 0.85)));
    const dots = [];
    cells.forEach((cell, k) => {
      if (k >= launched) return;
      const flight = easeOut(
        seg(t, (k / total) * (0.85 - KUDOS_FLIGHT), (k / total) * (0.85 - KUDOS_FLIGHT) + KUDOS_FLIGHT),
      );
      dots.push(circle(lerp(HEAP.x, cell.x, flight), lerp(HEAP.y, cell.y, flight), 3.4, C.orange));
    });
    const left = 1 - launched / total;
    const heap = this.heapSlots(HEAP.r * Math.sqrt(left)).map(({ x, y }) => circle(x, y, DAY_R, C.orange));
    const head = seg(t, 0, 0.08);
    const perDay = total / d.stats.daysInYear;
    const sentence = (d.film.texts?.kudos ?? "Cheering for friends: {perDay} a day.").replace(
      "{perDay}",
      perDay.toFixed(1),
    );
    return {
      backdrop: 1,
      items: [
        label("Kudos given", head),
        ...flaps(String(shown).padStart(String(total).length, "0"), 20, 82, { w: 62, h: 88, size: 58, alpha: head }),
        text(sentence, 20, 196, { size: 15, maxWidth: 320, lineHeight: 21, alpha: seg(t, 0.88, 1) }),
        ...(left > 0 ? heap : []),
        ...dots,
      ],
    };
  }

  enter() {
    return { ...HEAP, color: C.orange };
  }

  exit() {
    return { ...HEAP, r: 130, color: C.orange };
  }
}

/** Size of a month bubble before its number has counted up (what the kudos dots clump into). */
export const CLUMP = 0.4;

export class MonthsScene extends Scene {
  id = "months";

  /** Center and final radius of the 12 month bubbles (3 per row). */
  bubbles(d) {
    const most = Math.max(...d.stats.monthsKm, 1);
    return d.stats.monthsKm.map((km, i) => ({
      x: 20 + 53.33 + 106.67 * (i % 3),
      y: 209 + 102 * Math.floor(i / 3),
      r: 47 * Math.sqrt(km / most),
      km,
    }));
  }

  frame(t, d) {
    const bubbles = this.bubbles(d);
    const best = d.stats.monthsKm.indexOf(Math.max(...d.stats.monthsKm));
    const green = t >= 0.9;
    const items = [];
    bubbles.forEach(({ x, y, r, km }, i) => {
      const grow = easeOutBack(seg(t, (i / 12) * 0.8, (i / 12) * 0.8 + 0.12));
      const on = grow > 0.5;
      const radius = r * lerp(CLUMP, 1, grow);
      items.push(circle(x, y, radius, i === best && green ? C.green : C.orange));
      if (on && radius > 14) {
        items.push(
          text(MONTH_NAMES[i].slice(0, 3).toUpperCase(), x, y - 5, {
            font: "mono",
            size: 9,
            weight: 700,
            color: C.bg,
            align: "center",
            spacing: 0.7,
          }),
        );
        items.push(
          text(km, x, y + (r > 36 ? 17 : 13), { size: r > 36 ? 24 : 18, weight: 700, color: C.bg, align: "center" }),
        );
      }
    });
    const head = seg(t, 0, 0.08);
    return {
      backdrop: 1,
      items: [
        label("Distance by month", head),
        text(thousands(d.count(d.stats.totalKm, seg(t, 0, 0.8))), 20, 126, {
          size: 60,
          weight: 500,
          spacing: -1,
          alpha: head,
          after: [{ str: "KM · RUNS + HIKES", font: "mono", size: 13, color: C.muted }],
        }),
        ...items,
        circle(25, 606, 5, C.green, seg(t, 0.9, 1)),
        text(`${MONTH_NAMES[best].toUpperCase()} · BEST MONTH · ${d.stats.monthsKm[best]} KM`, 38, 610, {
          font: "mono",
          size: 11,
          alpha: seg(t, 0.9, 1),
        }),
      ],
    };
  }

  enter(d) {
    const { x, y, r } = this.bubbles(d)[0];
    return { x, y, r: r * CLUMP, color: C.orange };
  }

  exit() {
    return { x: 180, y: 360, r: 150, color: C.orange };
  }
}

export const MAIN_BUBBLE = { x: 143, y: 243, r: 125, startR: 30 };
const OTHER_COLORS = [C.yellow, C.purple, C.pink, C.green, C.white];
const OTHER_SLOTS = [
  [297, 135],
  [309, 221],
  [296, 304],
  [240, 368],
  [191, 387],
];

export class SportsScene extends Scene {
  id = "sports";

  available(d) {
    return d.stats.sports.length > 1;
  }

  /** The smaller sports around the main bubble; bubble area = km. */
  others(d) {
    const [main, ...others] = d.stats.sports;
    return others.slice(0, OTHER_SLOTS.length).map((sport, i) => ({
      ...sport,
      x: OTHER_SLOTS[i][0],
      y: OTHER_SLOTS[i][1],
      r: Math.max(5, MAIN_BUBBLE.r * Math.sqrt(sport.km / main.km)),
      color: OTHER_COLORS[i],
    }));
  }

  frame(t, d) {
    const main = d.stats.sports[0];
    const all = d.stats.sports.reduce((sum, sport) => sum + sport.km, 0);
    const grow = easeOut(seg(t, 0, 0.4));
    const r = lerp(MAIN_BUBBLE.startR, MAIN_BUBBLE.r, grow);
    const share = (km) => `${((km / all) * 100).toFixed(km / all < 0.1 ? 1 : 0)}%`;
    const items = [
      label("Sports by km", seg(t, 0, 0.08)),
      circle(MAIN_BUBBLE.x, MAIN_BUBBLE.y, r, C.orange),
      text(main.name.toUpperCase(), MAIN_BUBBLE.x, MAIN_BUBBLE.y - 24 * grow - 6, {
        font: "mono",
        size: 11,
        weight: 700,
        color: C.bg,
        align: "center",
        spacing: 1,
        alpha: grow,
      }),
      text(thousands(d.count(main.km, seg(t, 0, 0.4))), MAIN_BUBBLE.x, MAIN_BUBBLE.y + 8 + 14 * grow, {
        size: 20 + 44 * grow,
        weight: 700,
        color: C.bg,
        align: "center",
        spacing: -1,
      }),
      text(`KM · ${share(main.km)}`, MAIN_BUBBLE.x, MAIN_BUBBLE.y + 46, {
        font: "mono",
        size: 11,
        weight: 700,
        color: C.bg,
        align: "center",
        alpha: seg(t, 0.4, 0.45),
      }),
    ];
    this.others(d).forEach((sport, i) => {
      const pop = seg(t, 0.45 + i * 0.09, 0.5 + i * 0.09);
      const y = 440 + 24 * i;
      items.push(
        circle(sport.x, sport.y, sport.r * easeOutBack(pop), sport.color, pop > 0 ? 1 : 0),
        circle(26, y - 4, 6, sport.color, pop),
        text(sport.name, 42, y, { font: "mono", size: 12, alpha: pop }),
        text(share(sport.km), 262, y, { font: "mono", size: 12, color: C.muted, align: "right", alpha: pop }),
        text(`${Math.round(sport.km)} km`, 340, y, { font: "mono", size: 12, align: "right", alpha: pop }),
      );
    });
    return { backdrop: 1, items };
  }

  enter() {
    return { x: MAIN_BUBBLE.x, y: MAIN_BUBBLE.y, r: MAIN_BUBBLE.startR, color: C.orange };
  }

  exit() {
    return { x: MAIN_BUBBLE.x, y: MAIN_BUBBLE.y, r: MAIN_BUBBLE.r, color: C.orange };
  }
}
