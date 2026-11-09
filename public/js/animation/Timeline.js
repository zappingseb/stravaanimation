import { HikeQueue } from "./HikeQueue.js";
import { RunAnimation } from "./RunAnimation.js";
import { buildSchedule, runDurationMs } from "./schedule.js";

/** Shortest time a hike profile stays when the next hike is already due. */
const MIN_HIKE_MS = 600;

// Plays the year: run i starts at i * runStartIntervalSeconds, so several runs draw at
// the same time; hikes are shown through a HikeQueue. One requestAnimationFrame loop
// drives everything. The timeline reports what happens to a listener and does not
// know about the UI:
//   onRunStart(activity), onHikeStart(hike), onHikeProgress(progress 0..1), onHikeEnd()
export class Timeline {
  /** @param options { runStartIntervalSeconds, secondsPerKm, minRunSeconds, hikeSeconds } */
  constructor(mapView, options, listener) {
    this.mapView = mapView;
    this.options = options;
    this.listener = listener;
    this.runs = [];
    this.hikes = null;
    this.frameHandle = null;
    this.resolvePlay = null;
  }

  /** Resolves with true when the last run and hike are finished, with false when stop() is called. */
  play(activities, hikes) {
    this.stop();
    const schedule = buildSchedule(activities, hikes, this.options.runStartIntervalSeconds * 1000);
    this.runs = schedule.runs.map(({ activity, startAt }) => {
      const durationMs = runDurationMs(activity.distance, this.options);
      return new RunAnimation(activity, startAt, durationMs, this.mapView);
    });
    this.hikes = new HikeQueue(schedule.hikes, { maxMs: this.options.hikeSeconds * 1000, minMs: MIN_HIKE_MS });

    return new Promise((resolve) => {
      this.resolvePlay = resolve;
      const t0 = performance.now();
      const frame = (now) => {
        if (this.renderFrame(now - t0)) this.finish(true);
        else this.frameHandle = requestAnimationFrame(frame);
      };
      this.frameHandle = requestAnimationFrame(frame);
    });
  }

  stop() {
    if (this.frameHandle) cancelAnimationFrame(this.frameHandle);
    this.runs.forEach((run) => run.cancel());
    if (this.hikes && !this.hikes.done) this.listener.onHikeEnd();
    this.finish(false);
  }

  finish(completed) {
    this.frameHandle = null;
    this.runs = [];
    this.hikes = null;
    this.resolvePlay?.(completed);
    this.resolvePlay = null;
  }

  /** @returns true when everything is finished */
  renderFrame(elapsed) {
    let runsDone = true;
    for (const run of this.runs) {
      if (run.state === "done") continue;
      if (elapsed < run.startAt) {
        runsDone = false;
        break; // runs are sorted by start time
      }
      if (run.state === "pending") {
        run.start();
        this.listener.onRunStart(run.activity);
      }
      const progress = Math.min(1, (elapsed - run.startAt) / run.durationMs);
      run.advance(progress);
      if (progress >= 1) run.finish();
      else runsDone = false;
    }

    const { ended, started, progress } = this.hikes.update(elapsed);
    if (ended) this.listener.onHikeEnd();
    if (started) this.listener.onHikeStart(started);
    if (progress !== null) this.listener.onHikeProgress(progress);

    return runsDone && this.hikes.done;
  }
}
