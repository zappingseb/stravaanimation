import {
  CityScene,
  EarlyBirdScene,
  FastestScene,
  FinaleScene,
  HotspotScene,
  LongestScene,
  TitleScene,
} from "./scenes/munich.js";
import { DaysScene, KudosScene, MonthsScene, SportsScene } from "./scenes/dots.js";
import {
  AlpsScene,
  ColdestScene,
  EverestScene,
  HighestScene,
  HilliestScene,
  LastRunScene,
  SeriesScene,
} from "./scenes/mountains.js";
import { TitleBubble } from "./TitleBubble.js";
import { Transition } from "./Transition.js";

const FILM_SECONDS_PER_KM = 0.2;
const FILM_MIN_RUN_SECONDS = 1.2;

/**
 * The year film: title, city tracks, the stat scenes and the finale, with a transition
 * between every two scenes and a title bubble before the scenes that have a title.
 *
 * It is a list of segments { scene | from + to | announce, ms } in two parts:
 * `opening` runs before the city tracks, `stats` after them. The city tracks are drawn
 * by the map; the film only supplies their hand-over shapes and a caption.
 */
export class Film {
  /** All scenes in the order they play. */
  static scenes() {
    return [
      new TitleScene(),
      new CityScene(),
      new HotspotScene(),
      new EarlyBirdScene(),
      new FastestScene(),
      new LongestScene(),
      new DaysScene(),
      new KudosScene(),
      new MonthsScene(),
      new SportsScene(),
      new AlpsScene(),
      new HighestScene(),
      new HilliestScene(),
      new EverestScene(),
      new SeriesScene(),
      new ColdestScene(),
      new LastRunScene(),
      new FinaleScene(),
    ];
  }

  /** Name of a segment in timelines and sound cues: "kudos", "days>kudos", "intro:kudos" */
  static segmentId(segment) {
    return (
      segment.scene?.id ?? (segment.announce ? `intro:${segment.announce.id}` : `${segment.from.id}>${segment.to.id}`)
    );
  }

  /** Run speed and start interval so that the city tracks take film.citySeconds. */
  static cityPacing(film, activities) {
    const lastKm = (activities[activities.length - 1]?.distance ?? 0) / 1000;
    const tail = Math.max(FILM_MIN_RUN_SECONDS, lastKm * FILM_SECONDS_PER_KM);
    return {
      secondsPerKm: FILM_SECONDS_PER_KM,
      minRunSeconds: FILM_MIN_RUN_SECONDS,
      // runs start so close together that a dot on each would hide the lines
      runnerDotEvery: 2,
      runStartIntervalSeconds: Math.max(0.02, (film.citySeconds - tail) / Math.max(1, activities.length)),
    };
  }

  /** @param data FilmData; scenes it has no data for are left out */
  constructor(data, scenes = Film.scenes()) {
    this.data = data;
    this.scenes = scenes.filter((scene) => scene.available(data));
    const segments = this.buildSegments();
    const cityAt = segments.findIndex((segment) => segment.from?.id === "city");
    this.opening = segments.slice(0, cityAt);
    this.stats = segments.slice(cityAt);
  }

  buildSegments() {
    const d = this.data;
    const segments = [];
    this.scenes.forEach((scene, i) => {
      if (scene.title(d)) segments.push({ announce: scene, ms: (d.film.titleSeconds ?? 1.2) * 1000 });
      if (scene.durationMs(d) > 0) segments.push({ scene, ms: scene.durationMs(d) });
      const next = this.scenes[i + 1];
      if (next) segments.push({ from: scene, to: next, ms: Transition.durationMs(scene) });
    });
    return segments;
  }

  scene(id) {
    return this.scenes.find((scene) => scene.id === id);
  }

  /** @param part "opening" or "stats" */
  durationMs(part) {
    return this[part].reduce((sum, segment) => sum + segment.ms, 0);
  }

  /** [{ id, ms }] of a part, for timelines and sound cues */
  segmentList(part) {
    return this[part].map((segment) => ({ id: Film.segmentId(segment), ms: segment.ms }));
  }

  /** The frame `ms` after the start of a part; the last frame after its end. */
  frameAt(part, ms) {
    const segments = this[part];
    let start = 0;
    for (const segment of segments) {
      if (ms < start + segment.ms || segment === segments[segments.length - 1]) {
        return this.segmentFrame(segment, Math.max(0, ms - start));
      }
      start += segment.ms;
    }
    return { backdrop: 0, items: [] };
  }

  segmentFrame(segment, elapsed) {
    const d = this.data;
    const p = Math.min(1, elapsed / segment.ms);
    if (segment.from)
      return new Transition(segment.from, segment.to, d, { shapesOnly: Boolean(segment.to.title(d)) }).frame(p);
    if (segment.announce) return new TitleBubble(segment.announce, d).frame(p);
    return segment.scene.frameAfter(elapsed, d);
  }

  /** What the canvas shows while the map draws the city tracks. */
  cityFrame() {
    return this.scene("city").frame(1, this.data);
  }
}
