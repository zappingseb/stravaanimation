import { countTo } from "./ease.js";

/** What the scenes read: stats, config and where things are on the city map. */
export class FilmData {
  /** Counters start 15 % away from their final value (1,700 -> 2,000). */
  static DEFAULT_COUNTER_SHARE = 0.15;

  /** @param cityPoint ([lat, lng]) => { x, y } of a place of the city map, in design coordinates */
  constructor({ config, stats, activities, cityPoint }) {
    const first = activities[0];
    const last = activities[activities.length - 1];
    this.stats = stats;
    this.film = config.film;
    this.intro = config.intro;
    this.finaleTitle = config.finale.title;
    this.year = stats.year;
    this.center = [config.map.centerLat, config.map.centerLng];
    this.runCount = activities.length;
    this.activeSet = new Set(stats.activeDays);
    this.firstRunStart = first?.coordinates[0] ?? this.center;
    this.lastRunEnd = last?.coordinates[last.coordinates.length - 1] ?? this.center;
    this.cityPoint = cityPoint;
    this.counterShare = config.film.counterStartShare ?? FilmData.DEFAULT_COUNTER_SHARE;
    this.dateFormat = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
      timeZone: config.film.timeZone,
    });
  }

  /** A counter at progress p (0..1) on its way up to `target`, see countTo() */
  count(target, p) {
    return countTo(target, p, this.counterShare);
  }

  /** ... and on its way down to it (pace, falling numbers) */
  countDown(target, p) {
    return countTo(target, p, -this.counterShare);
  }

  /** ISO date -> "DEC 31" */
  shortDate(iso) {
    return this.dateFormat.format(new Date(iso)).toUpperCase();
  }
}
