/// <reference lib="dom" />

// A clock for the page that only moves when the recorder says so.
//
// installVirtualClock() replaces setTimeout/setInterval, requestAnimationFrame,
// performance.now and Date, and pauses every CSS transition/animation. Each call of
// window.__virtualClock.step(ms) then advances all of them by exactly `ms`, so every
// video frame shows the page exactly 1/fps seconds after the previous one, no matter
// how long a screenshot takes.
//
// It runs inside the page before any of the page's scripts (Playwright addInitScript),
// so it must not reference anything outside its own body.

export interface VirtualClock {
  step(ms: number): Promise<void>;
}

export function installVirtualClock(): void {
  type Callback = (...args: unknown[]) => void;
  interface Timer {
    at: number;
    callback: Callback;
    args: unknown[];
    interval: number | null;
    order: number;
  }

  const page = window as unknown as Record<string, unknown>;
  const RealDate = Date;
  const realSetTimeout = window.setTimeout.bind(window);
  const startEpoch = RealDate.now();
  let now = 0;
  let nextId = 1;
  const timers = new Map<number, Timer>();
  let animationFrames: { id: number; callback: FrameRequestCallback }[] = [];
  const pausedAnimations = new WeakSet<Animation>();

  function addTimer(callback: Callback, ms: unknown, args: unknown[], repeat: boolean): number {
    const id = nextId++;
    const delay = Math.max(repeat ? 1 : 0, Number(ms) || 0);
    timers.set(id, { at: now + delay, callback, args, interval: repeat ? delay : null, order: id });
    return id;
  }
  page.setTimeout = (callback: Callback, ms?: number, ...args: unknown[]) => addTimer(callback, ms, args, false);
  page.setInterval = (callback: Callback, ms?: number, ...args: unknown[]) => addTimer(callback, ms, args, true);
  page.clearTimeout = page.clearInterval = (id: number) => timers.delete(id);
  page.requestAnimationFrame = (callback: FrameRequestCallback) => {
    const id = nextId++;
    animationFrames.push({ id, callback });
    return id;
  };
  page.cancelAnimationFrame = (id: number) => {
    animationFrames = animationFrames.filter((frame) => frame.id !== id);
  };
  performance.now = () => now;
  page.Date = class VirtualDate extends RealDate {
    constructor(...args: ConstructorParameters<DateConstructor> | []) {
      if (args.length === 0) super(startEpoch + now);
      else super(...(args as [string]));
    }
    static override now() {
      return startEpoch + now;
    }
  };

  /** A real macrotask, so that pending microtasks (Vue updates, awaits) run. */
  const settle = () => new Promise((resolve) => realSetTimeout(resolve, 0));

  function run(callback: unknown, args: unknown[]): void {
    try {
      if (typeof callback === "function") callback(...args);
    } catch (error) {
      console.error("[virtual clock]", error);
    }
  }

  function nextDueTimer(until: number): [number, Timer] | null {
    let due: [number, Timer] | null = null;
    for (const entry of timers) {
      const timer = entry[1];
      if (timer.at > until) continue;
      if (!due || timer.at < due[1].at || (timer.at === due[1].at && timer.order < due[1].order)) due = entry;
    }
    return due;
  }

  /** CSS transitions/animations start paused at 0 and are advanced in step(). */
  function pauseNewAnimations(): void {
    for (const animation of document.getAnimations()) {
      if (pausedAnimations.has(animation)) continue;
      pausedAnimations.add(animation);
      animation.pause();
      animation.currentTime = 0;
    }
  }

  const clock: VirtualClock = {
    async step(ms) {
      for (const animation of document.getAnimations()) {
        if (pausedAnimations.has(animation)) animation.currentTime = (Number(animation.currentTime) || 0) + ms;
      }

      const target = now + ms;
      for (let due = nextDueTimer(target); due; due = nextDueTimer(target)) {
        const [id, timer] = due;
        now = Math.max(now, timer.at);
        if (timer.interval) timers.set(id, { ...timer, at: timer.at + timer.interval, order: nextId++ });
        else timers.delete(id);
        run(timer.callback, timer.args);
        await settle();
      }
      now = target;

      const frames = animationFrames;
      animationFrames = [];
      frames.forEach((frame) => run(frame.callback, [now]));
      await settle();
      pauseNewAnimations();
    },
  };
  page.__virtualClock = clock;
}
