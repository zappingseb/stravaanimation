// Decides which hike profile is on screen. Hikes are shown one at a time and never
// hold up the runs; a hike stays until the next one is due (between minMs and maxMs),
// so several hikes within a few days play faster instead of lagging behind the date board.
// Pure logic (no DOM), driven by Timeline with the elapsed animation time.

/** Share of a hike's screen time the red line needs to reach the end; the rest shows the finished profile. */
const LINE_SHARE = 0.8;

export class HikeQueue {
  /** @param scheduled [{ hike, startAt }] sorted by startAt (ms) */
  constructor(scheduled, { maxMs, minMs }) {
    this.upcoming = [...scheduled];
    this.waiting = [];
    this.current = null;
    this.maxMs = maxMs;
    this.minMs = minMs;
  }

  get done() {
    return !this.current && this.waiting.length === 0 && this.upcoming.length === 0;
  }

  /** @returns {{ ended: object|null, started: object|null, progress: number|null }} */
  update(elapsed) {
    const events = { ended: null, started: null, progress: null };

    while (this.upcoming.length && this.upcoming[0].startAt <= elapsed) {
      this.waiting.push(this.upcoming.shift());
    }
    if (this.current && elapsed - this.current.shownAt >= this.current.duration) {
      events.ended = this.current.hike;
      this.current = null;
    }
    if (!this.current && this.waiting.length) {
      const { hike } = this.waiting.shift();
      this.current = { hike, shownAt: elapsed, duration: this.durationFrom(elapsed) };
      events.started = hike;
    }
    if (this.current) {
      events.progress = Math.min(1, (elapsed - this.current.shownAt) / (this.current.duration * LINE_SHARE));
    }
    return events;
  }

  durationFrom(elapsed) {
    const next = this.waiting[0] || this.upcoming[0];
    const untilNext = next ? next.startAt - elapsed : Infinity;
    return Math.min(this.maxMs, Math.max(this.minMs, untilNext));
  }
}
