import { easeInOut, easeOut, easeOutBack, lerp, seg } from "../ease.js";
import { Hill } from "../Hill.js";
import { Scene } from "../Scene.js";
import {
  C,
  W,
  circle,
  cover,
  fitRoute,
  flaps,
  group,
  label,
  line,
  photo,
  pill,
  plainName,
  ring,
  shade,
  tank,
  text,
  thousands,
} from "../items.js";

// Act 3: the mountains. Places beyond the city, highest point, hilliest run, total climb,
// the numbered hike series, the coldest day and the last run of the year.

const MAP_BOX = { left: 34, right: 326, top: 176, bottom: 560 };

export class AlpsScene extends Scene {
  id = "alps";
  extraHoldMs = 1500; // ten place names take longer to read

  available(d) {
    return d.film.places.length > 0;
  }

  /** Munich and the places on a plain north-up map; returns { home, pins: [{ name, x, y, highlight }] } */
  pins(d) {
    const home = d.center;
    const all = [home, ...d.film.places.map((place) => [place.lat, place.lng])];
    const lats = all.map((p) => p[0]);
    const lngs = all.map((p) => p[1]);
    const [south, north] = [Math.min(...lats), Math.max(...lats)];
    const [west, east] = [Math.min(...lngs), Math.max(...lngs)];
    const squeeze = Math.cos((((south + north) / 2) * Math.PI) / 180);
    const scale = Math.min(
      (MAP_BOX.right - MAP_BOX.left) / ((east - west) * squeeze || 1),
      (MAP_BOX.bottom - MAP_BOX.top) / (north - south || 1),
    );
    const project = ([lat, lng]) => ({
      x: (MAP_BOX.left + MAP_BOX.right) / 2 + (lng - (west + east) / 2) * squeeze * scale,
      y: (MAP_BOX.top + MAP_BOX.bottom) / 2 - (lat - (south + north) / 2) * scale,
    });
    return {
      home: project(home),
      pins: d.film.places.map((place) => ({ ...place, ...project([place.lat, place.lng]) })),
    };
  }

  /**
   * Where every pin's name goes: west of home to the left, the others to the right.
   * Pins that sit close together share one column and are pushed apart, so names do not run into pins.
   */
  labels(pins, home) {
    const labels = pins.map((pin) => ({ x: pin.x + (pin.x < home.x ? -11 : 11), y: pin.y + 3 }));
    for (const west of [true, false]) {
      const side = pins
        .map((_, i) => i)
        .filter((i) => pins[i].x < home.x === west)
        .sort((a, b) => pins[a].y - pins[b].y);
      const crowded = side.filter((i) => side.some((j) => j !== i && Math.abs(pins[i].y - pins[j].y) < 25));
      const column = west
        ? Math.min(...crowded.map((i) => pins[i].x)) - 11
        : Math.max(...crowded.map((i) => pins[i].x)) + 11;
      crowded.forEach((i, k) => {
        labels[i].x = column;
        if (k > 0) labels[i].y = Math.max(labels[i].y, labels[crowded[k - 1]].y + 12);
      });
    }
    return labels;
  }

  frame(t, d) {
    const { home, pins } = this.pins(d);
    const shown = pins.length * seg(t, 0.15, 0.85);
    const labels = this.labels(pins, home);
    const items = [];
    pins.forEach((pin, i) => {
      const fly = easeOut(seg(shown, i, i + 1));
      if (fly <= 0) return;
      const x = lerp(home.x, pin.x, fly);
      const y = lerp(home.y, pin.y, fly);
      const toLeft = pin.x < home.x;
      items.push(
        line(
          [
            [home.x, home.y],
            [x, y],
          ],
          C.orange,
          3,
          { dash: [0.1, 9], alpha: 0.8 },
        ),
        circle(x, y, 6, pin.highlight && t >= 0.9 ? C.purple : C.yellow),
        text(pin.name, labels[i].x, labels[i].y, {
          font: "mono",
          size: 10,
          color: C.white,
          align: toLeft ? "right" : "left",
          alpha: seg(fly, 0.7, 1),
        }),
      );
    });
    const count = pins.length; // the headline does not count along with the pins
    const head = seg(t, 0, 0.08);
    return {
      backdrop: 1,
      items: [
        ...items,
        circle(home.x, home.y, 10 + 24 * easeOut(seg(t, 0, 0.15)), C.orange, 0.25),
        circle(home.x, home.y, 16, C.orange, 0.6),
        circle(home.x, home.y, 6, C.white),
        text("MUNICH", home.x + 19, home.y - 16, { font: "mono", size: 11, weight: 700, color: C.orange, alpha: head }),
        text(`${d.runCount} runs`, home.x + 19, home.y - 2, {
          font: "mono",
          size: 11,
          weight: 700,
          color: C.orange,
          alpha: head,
        }),
        label("Beyond the city", head),
        text(d.film.placesHeadline, 20, 104, { size: 34, weight: 700, alpha: seg(t, 0.85, 0.92) }),
        text(`${count} ${count === 1 ? "place" : "places"}`, 20, 140, { size: 34, weight: 700, alpha: head }),
      ],
    };
  }

  enter(d) {
    return { ...this.pins(d).home, r: 16, color: C.orange };
  }

  exit(d) {
    const { home, pins } = this.pins(d);
    // the pin that belongs to the highest hike leaves for the next scene, if there is one
    const words = plainName(d.stats.highest?.name).toLowerCase();
    const pin = pins.find((p) => words.includes(p.name.toLowerCase())) ?? pins[0] ?? home;
    return { x: pin.x, y: pin.y, r: 6, color: C.yellow };
  }
}

const HIGHEST_TOP = 424;

export class HighestScene extends Scene {
  id = "highest";

  available(d) {
    return Boolean(d.stats.highest?.profile.length);
  }

  frame(t, d) {
    const { name, meters, profile } = d.stats.highest;
    const p = easeInOut(seg(t, 0.15, 0.7));
    const slope = new Hill(profile, HIGHEST_TOP);
    const altitude = Math.round(lerp(profile[0], meters, p));
    const head = seg(t, 0, 0.08);
    return {
      backdrop: 1,
      items: [
        label("Highest point", head),
        ...flaps(String(altitude).padStart(String(meters).length, "0"), 20, 82, { gap: 4, alpha: head }),
        text("M", 20 + String(meters).length * 54 + 6, 146, { font: "mono", size: 14, alpha: head }),
        text(plainName(name), 20, 184, { size: 18, weight: 700, maxWidth: 320, alpha: seg(t, 0.85, 1) }),
        photo("highest", 275, 315, 65, { alpha: seg(t, 0.7, 0.82) }),
        ...slope.items(p, seg(t, 0, 0.15)),
      ],
    };
  }

  enter(d) {
    return { ...new Hill(d.stats.highest.profile, HIGHEST_TOP).start, r: 6, color: C.white };
  }

  exit(d) {
    return { ...new Hill(d.stats.highest.profile, HIGHEST_TOP).summit, r: 6, color: C.white };
  }
}

const HILLIEST_TOP = 452;
const HILLIEST_ROUTE = { x: 255, y: 311, r: 65 };

export class HilliestScene extends Scene {
  id = "hilliest";

  available(d) {
    return Boolean(d.stats.hilliest?.profile.length);
  }

  frame(t, d) {
    const run = d.stats.hilliest;
    const p = easeInOut(seg(t, 0.15, 0.7));
    const slope = new Hill(run.profile, HILLIEST_TOP);
    const head = seg(t, 0, 0.08);
    const routeAlpha = seg(t, 0.78, 0.88);
    return {
      backdrop: 1,
      items: [
        label("Most height climbed", head),
        text(thousands(d.count(run.gain, seg(t, 0.15, 0.7))), 20, 138, {
          size: 72,
          weight: 700,
          color: C.orange,
          spacing: -1,
          alpha: head,
          after: [{ str: "M UP", font: "mono", size: 13, color: C.muted }],
        }),
        text(plainName(run.name), 20, 172, { size: 18, weight: 700, maxWidth: 320, alpha: seg(t, 0.88, 1) }),
        photo("hilliest", 95, 311, 75, { alpha: seg(t, 0.7, 0.8) }),
        circle(HILLIEST_ROUTE.x, HILLIEST_ROUTE.y, HILLIEST_ROUTE.r, C.surface, routeAlpha),
        line(fitRoute(run.route, HILLIEST_ROUTE.x, HILLIEST_ROUTE.y, 84, 84), C.orange, 3, { alpha: routeAlpha }),
        ...slope.items(p, seg(t, 0, 0.15)),
      ],
    };
  }

  enter(d) {
    return { ...new Hill(d.stats.hilliest.profile, HILLIEST_TOP).start, r: 6, color: C.white };
  }

  exit(d) {
    return { ...new Hill(d.stats.hilliest.profile, HILLIEST_TOP).summit, r: 6, color: C.white };
  }
}

const EVEREST_METERS = 8849;
const EVEREST_RINGS = [
  { x: 97, y: 237, r: 77 },
  { x: 263, y: 237, r: 77 },
];

export class EverestScene extends Scene {
  id = "everest";

  available(d) {
    return d.stats.elevation.total > 0;
  }

  frame(t, d) {
    const { total, months } = d.stats.elevation;
    const most = Math.max(...months, 1);
    const p = seg(t, 0, 0.75);
    let climbed = 0;
    const bars = [];
    months.forEach((value, i) => {
      const part = Math.min(1, Math.max(0, p * 12 - i));
      climbed += value * part;
      const best = value === most;
      const height = 18 + (value / most) * 92 * part;
      const x = 20 + ((W - 40 - 18) * i) / 11;
      bars.push(
        pill(x, 600 - height, 18, height, part === 0 ? C.tile : best ? C.purple : C.orange),
        text("JFMAMJJASOND"[i], x + 9, 613, { font: "mono", size: 8, color: C.muted, align: "center" }),
        best &&
          part === 1 &&
          text(thousands(value), x + 9, 600 - height - 6, {
            font: "mono",
            size: 9,
            weight: 700,
            color: C.purple,
            align: "center",
          }),
      );
    });
    climbed = p >= 1 ? total : Math.round(climbed);
    const times = Math.floor(total / EVEREST_METERS);
    const head = seg(t, 0, 0.08);
    const rings = EVEREST_RINGS.flatMap(({ x, y, r }, i) => {
      const level = Math.min(1, Math.max(0, climbed / EVEREST_METERS - i));
      return [
        tank(x, y, r, level, C.yellow),
        text(
          level >= 1 ? `EVEREST ${i + 1} · DONE` : `EVEREST ${i + 1} · ${thousands(EVEREST_METERS)} M`,
          x,
          y + r + 20,
          { font: "mono", size: 10, color: level >= 1 ? C.yellow : C.muted, align: "center", alpha: head },
        ),
      ];
    });
    const headline = times >= 1 ? `${times}× Everest` : `${Math.round((total / EVEREST_METERS) * 100)} % Everest`;
    return {
      backdrop: 1,
      items: [
        label("Climbed on foot", head),
        text(thousands(d.count(total, p)), 20, 126, {
          size: 60,
          weight: 500,
          spacing: -1,
          alpha: head,
          after: [{ str: "M UP", font: "mono", size: 13, color: C.muted }],
        }),
        ...rings,
        text(headline, 20, 408, { size: 58, weight: 700, color: C.yellow, spacing: -1, alpha: seg(t, 0.78, 0.9) }),
        ...bars,
      ],
    };
  }

  enter() {
    return { ...EVEREST_RINGS[0], color: C.yellow, ring: 3 };
  }

  exit() {
    return { ...EVEREST_RINGS[1], color: C.yellow, ring: 3 };
  }
}

export const PHOTO_RING = { x: 180, y: 222 };
const SERIES_R = 80;
const STAMP_ROTATIONS = [-6, 4, -3, 5, -4, 6];

export class SeriesScene extends Scene {
  id = "series";

  available(d) {
    return d.stats.series.length > 0;
  }

  frame(t, d) {
    const entries = d.stats.series.slice(-6);
    const plain = entries.filter((entry) => !entry.highlight);
    const position = entries.length * seg(t, 0.2, 0.85);
    let last = plain[0]?.number;
    const stamps = entries.map((entry, i) => {
      const part = Math.min(1, Math.max(0, position - i));
      if (part <= 0) return null;
      if (!entry.highlight) last = entry.number;
      const color = entry.highlight ? C.green : C.orange;
      return group(
        [
          ring(0, 0, 48, color, 2, 1, [5, 5]),
          text(d.shortDate(entry.date), 0, -20, { font: "mono", size: 8, color: C.muted, align: "center" }),
          text(`#${entry.number}`, 0, 8, { size: 28, weight: 700, color, align: "center" }),
          text(`${entry.km.toFixed(1)} KM`, 0, 21, { font: "mono", size: 8, align: "center" }),
          text(`${entry.gain} M UP`, 0, 32, { font: "mono", size: 8, align: "center" }),
        ],
        {
          x: 69.33 + 110.67 * (i % 3),
          y: 361 + 112 * Math.floor(i / 3),
          rot: (STAMP_ROTATIONS[i] * Math.PI) / 180,
          scale: 1.5 - 0.5 * easeOutBack(part),
        },
      );
    });
    const head = seg(t, 0, 0.08);
    const first = plain[0]?.number;
    return {
      backdrop: 1,
      items: [
        label(d.film.series.label, head),
        text(last === first ? `#${first}` : `#${first} → #${last}`, 20, 108, { size: 40, weight: 700, alpha: head }),
        text(d.film.series.caption.toUpperCase(), 20, 128, { font: "mono", size: 11, color: C.muted, alpha: head }),
        photo("series", PHOTO_RING.x, PHOTO_RING.y, SERIES_R, { alpha: seg(t, 0, 0.18) }),
        ring(PHOTO_RING.x, PHOTO_RING.y, SERIES_R - 1.5, C.yellow, 3),
        ...stamps,
      ],
    };
  }

  enter() {
    return { ...PHOTO_RING, r: SERIES_R, color: C.yellow, ring: 3 };
  }

  exit() {
    return { ...PHOTO_RING, r: SERIES_R, color: C.yellow, ring: 3 };
  }
}

export const COLD_R = 130;
/** The thermometer: one dot per 2.5 °C, cold on the left, hot on the right. */
const SCALE = { min: -20, max: 40, step: 2.5, left: 29, right: 331, y: 477 };
const scaleX = (degrees) => lerp(SCALE.left, SCALE.right, (degrees - SCALE.min) / (SCALE.max - SCALE.min));
const degreesText = (degrees) => `${degrees > 0 ? "+" : degrees < 0 ? "−" : ""}${Math.abs(degrees)}°C`;

/** Coldest activity first, then the marker sweeps right to the hottest one. */
export class ColdestScene extends Scene {
  id = "coldest";

  available(d) {
    return Boolean(d.film.coldest);
  }

  frame(t, d) {
    const cold = d.film.coldest;
    const hot = d.film.hottest;
    const drop = easeInOut(seg(t, 0.08, hot ? 0.4 : 0.8));
    const rise = hot ? easeInOut(seg(t, 0.5, 0.88)) : 0;
    // The numbers settle from close by; only the markers travel along the scale.
    const coldNow = Math.round(d.count(cold.temperatureC, seg(t, 0.08, hot ? 0.4 : 0.8)));
    const hotNow = hot ? Math.round(d.count(hot.temperatureC, seg(t, 0.5, 0.88))) : 0;
    const coldMark = lerp(0, cold.temperatureC, drop);
    const hotMark = hot ? lerp(cold.temperatureC, hot.temperatureC, rise) : 0;
    const coldColor = coldMark < 0 ? C.purple : C.orange;
    const dots = [];
    for (let degrees = SCALE.min; degrees <= SCALE.max; degrees += SCALE.step) {
      dots.push(circle(scaleX(degrees), SCALE.y, 3.5, degrees === 0 ? C.white : degrees < 0 ? "#4A2A66" : "#7A2A12"));
    }
    const head = seg(t, 0, 0.08);
    const coldName = seg(t, hot ? 0.36 : 0.85, hot ? 0.46 : 1);
    const hotOn = seg(rise, 0, 0.08);
    const hotName = seg(t, 0.88, 1);
    const hotPhoto = seg(rise, 0.35, 0.85);
    const scaleLabel = (degrees, align) =>
      text(
        degreesText(degrees).replace("°C", ""),
        scaleX(degrees) + (align === "left" ? -9 : align === "right" ? 9 : 0),
        502,
        { font: "mono", size: 9, color: C.muted, align },
      );
    return {
      backdrop: 1,
      items: [
        label(hot ? "Coldest and hottest" : "Coldest activity", head),
        circle(PHOTO_RING.x, PHOTO_RING.y, COLD_R, C.surface),
        photo("coldest", PHOTO_RING.x, PHOTO_RING.y, COLD_R, { border: null, alpha: seg(t, 0, 0.2) }),
        // the hot day's picture takes over the ring while the marker moves to the hot end
        hot &&
          d.film.photos.hottest &&
          photo("hottest", PHOTO_RING.x, PHOTO_RING.y, COLD_R, { border: null, alpha: hotPhoto }),
        ring(PHOTO_RING.x, PHOTO_RING.y, COLD_R - 1.5, hotPhoto > 0.5 ? C.pink : coldColor, 3),
        text(degreesText(coldNow), 20, 436, { size: 50, weight: 700, color: coldColor, spacing: -2, alpha: head }),
        hot &&
          text(degreesText(hotNow), 340, 436, {
            size: 50,
            weight: 700,
            color: hotNow > 0 ? C.pink : C.purple,
            spacing: -2,
            align: "right",
            alpha: hotOn,
          }),
        ...dots,
        scaleLabel(SCALE.min, "left"),
        scaleLabel(0, "center"),
        scaleLabel(20, "center"),
        scaleLabel(SCALE.max, "right"),
        circle(scaleX(coldMark), SCALE.y, 9, coldColor),
        hot && circle(scaleX(hotMark), SCALE.y, 9, hotMark > 0 ? C.pink : C.purple, hotOn),
        text(cold.date, 20, 548, { font: "mono", size: 10, color: C.purple, alpha: coldName }),
        text(plainName(cold.name), 20, 570, { size: 16, weight: 700, maxWidth: 150, lineHeight: 20, alpha: coldName }),
        hot && text(hot.date, 340, 548, { font: "mono", size: 10, color: C.pink, align: "right", alpha: hotName }),
        hot &&
          text(plainName(hot.name), 340, 570, {
            size: 16,
            weight: 700,
            maxWidth: 150,
            lineHeight: 20,
            align: "right",
            alpha: hotName,
          }),
      ],
    };
  }

  enter() {
    return { ...PHOTO_RING, r: COLD_R, color: C.orange, ring: 3 };
  }

  exit(d) {
    return { ...PHOTO_RING, r: COLD_R, color: d.film.hottest && d.film.photos.hottest ? C.pink : C.purple, ring: 3 };
  }
}

export class LastRunScene extends Scene {
  id = "lastRun";

  available(d) {
    return Boolean(d.stats.lastRun);
  }

  frame(t, d) {
    const run = d.stats.lastRun;
    const q = easeInOut(seg(t, 0.4, 0.85));
    const [month, day] = d.shortDate(run.date).split(" ");
    const dayBefore = String(Math.max(1, Number(day) - 1)).padStart(2, "0");
    const total = (run.kmBefore + run.km * q).toFixed(1).padStart(d.stats.totalKm.toFixed(1).length, "0");
    const titleAlpha = seg(t, 0.2, 0.33);
    const statsAlpha = seg(t, 0.33, 0.42);
    const minutes = Math.round(run.seconds / 60);
    const stat = (value, unit, x) => [
      text(value, x, 516, { size: 24, weight: 700, alpha: statsAlpha }),
      text(unit, x, 530, { font: "mono", size: 9, color: "#dddddd", alpha: statsAlpha }),
    ];
    return {
      backdrop: 1,
      items: [
        cover("lastRun"),
        shade(
          [
            [0, 0.8],
            [0.3, 0],
            [0.5, 0],
            [0.76, 0.94],
            [1, 0.94],
          ],
          seg(t, 0, 0.15),
        ),
        ...flaps(month + (t < 0.25 ? dayBefore : day), 20, 50, {
          w: 34,
          h: 46,
          gap: 4,
          size: 26,
          gapAfter: { 2: 10 },
          alpha: seg(t, 0, 0.15),
        }),
        label("Last run of the year", titleAlpha, 412),
        text(plainName(run.name), 20, 447, { size: 30, weight: 700, maxWidth: 320, lineHeight: 33, alpha: titleAlpha }),
        // the three facts appear finished; only the year's km below counts on
        ...stat(run.km.toFixed(1), "KM", 20),
        ...stat(run.gain, "M UP", 110),
        ...stat(`${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`, "HOURS", 200),
        ...flaps(total, 20, 558, {
          w: 34,
          h: 46,
          gap: 5,
          size: 26,
          color: (i) => (i === total.length - 1 ? C.orange : C.white),
          alpha: seg(t, 0, 0.15),
        }),
        text("km since Jan 1st", 20, 621, { font: "mono", size: 9, color: "#dddddd", alpha: seg(t, 0, 0.15) }),
      ],
    };
  }

  enter() {
    return { ...PHOTO_RING, r: 480, color: C.purple, ring: 3 };
  }

  exit() {
    return { x: 180, y: 320, r: 480, color: C.white };
  }
}
