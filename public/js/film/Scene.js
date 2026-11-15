/**
 * One screen of the year film. Everything it shows is a function of time:
 * frame(t, d) with t = 0..1 returns { items, backdrop, mapZoom? } for the Painter,
 * and enter(d) / exit(d) name the round shape { x, y, r, color, ring? } that arrives
 * from the previous scene and leaves for the next one.
 *
 * `d` is the FilmData the scenes read.
 */
export class Scene {
  /** Name in config.json (film.titles), in timelines and in sound cues */
  id = "";
  /** A scene with more to read stays this much longer at its end */
  extraHoldMs = 0;

  /** false = the year has no data for this scene; the film leaves it out */
  available() {
    return true;
  }

  /** Length of the scene without its title bubble and transitions; 0 = it only hands shapes over */
  durationMs(d) {
    return d.film.sceneSeconds * 1000 + this.extraHoldMs;
  }

  /** The words of the title bubble shown before the scene; nothing = no bubble */
  title(d) {
    return d.film.titles?.[this.id];
  }

  frame() {
    throw new Error(`Scene "${this.id}" has no frame()`);
  }

  enter() {
    throw new Error(`Scene "${this.id}" has no enter()`);
  }

  exit(d) {
    return this.enter(d);
  }

  /**
   * The frame `ms` after the scene started. The scene is finished `holdSeconds` before
   * its end and then stands still, so it can be read.
   */
  frameAfter(ms, d) {
    const hold = (d.film.holdSeconds ?? 0) * 1000 + this.extraHoldMs;
    const playMs = Math.max(1, this.durationMs(d) - hold);
    return this.frame(Math.min(1, Math.max(0, ms) / playMs), d);
  }
}
