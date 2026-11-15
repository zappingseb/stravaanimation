/// <reference lib="dom" />

// Renders the animation to an MP4 (1080x1920, portrait) frame by frame.
//
//   npm run record                         -> recordings/running-<year>.mp4
//   npm run record -- --fps 60 --out my.mp4 --params "interval=1&intro=0" --hold 5
//
// The page runs in headless Chrome with a virtual clock (see virtualClock.ts), so the
// video is smooth and the same on every run, however long each screenshot takes.

import { ChildProcess, spawn } from "child_process";
import path from "path";
import fs from "fs";
import { chromium, Page } from "playwright-core";
import { appConfig } from "../config";
import { installVirtualClock, VirtualClock } from "./virtualClock";
import { VideoEncoder } from "./videoEncoder";
import { PartSegment, SoundTimeline } from "../sound/SoundTimeline";

// 360x640 CSS pixels at 3x density = 1080x1920
const VIEWPORT = { width: 360, height: 640 };
const SCALE = 3;
const JPEG_QUALITY = 92;
const MAX_VIDEO_SECONDS = 600; // safety net if the finale is never reached
const LOAD_TIMEOUT_MS = 30_000;
const SETTLE_FRAMES = 30; // after loading: map tiles fade in, boards finish flipping

export interface Options {
  fps: number;
  out: string;
  params: string;
  hold: number;
  port: number;
}

/** What App.js exposes as window.runnerAnimation */
interface PageStatus {
  phase: string;
  error: string | null;
  tilesLoading: boolean;
}

export function parseArgs(argv: string[]): Options {
  const value = (name: string): string | undefined => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const year = appConfig.animation.startDate.slice(0, 4);
  return {
    fps: Number(value("fps") ?? 30),
    out: path.resolve(value("out") ?? `recordings/running-${year}.mp4`),
    params: value("params") ?? "",
    hold: Number(value("hold") ?? 4),
    port: Number(value("port") ?? 3999),
  };
}

/** Starts dist/server.js on `port` and waits until it answers. */
async function startServer(port: number): Promise<ChildProcess> {
  const server = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "inherit", "inherit"],
  });
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      if ((await fetch(`http://localhost:${port}/api/config`)).ok) return server;
    } catch {
      // not listening yet
    }
    await sleep(100);
  }
  server.kill();
  throw new Error(`Server did not start on port ${port}`);
}

/** Advances the page clock by one frame and reports the app's state. */
function step(page: Page, frameMs: number): Promise<PageStatus | null> {
  return page.evaluate(async (ms) => {
    const w = window as unknown as { __virtualClock: VirtualClock; runnerAnimation?: { status(): PageStatus } };
    await w.__virtualClock.step(ms);
    return w.runnerAnimation?.status() ?? null;
  }, frameMs);
}

/** Lets the app load its data and the map tiles arrive (network runs in real time). */
async function waitUntilReady(page: Page, frameMs: number): Promise<void> {
  const deadline = Date.now() + LOAD_TIMEOUT_MS;
  for (;;) {
    const status = await step(page, frameMs);
    if (status?.phase === "error") throw new Error(`App error: ${status.error}`);
    if (status?.phase === "ready" && !status.tilesLoading) break;
    if (Date.now() > deadline) throw new Error("App or map tiles did not load in time");
    await sleep(50);
  }
  for (let i = 0; i < SETTLE_FRAMES; i++) await step(page, frameMs);
}

/** What was recorded: the length of the video and when the app entered each phase (seconds of video). */
interface Recorded {
  seconds: number;
  phaseSeconds: Record<string, number>;
}

async function recordFrames(page: Page, video: VideoEncoder, opts: Options): Promise<Recorded> {
  const frameMs = 1000 / opts.fps;
  const holdFrames = Math.round(opts.hold * opts.fps);
  const started = Date.now();
  const phaseSeconds: Record<string, number> = {};
  let framesSinceFinale = -1;
  let frames = 0;

  for (let frame = 0; frame < MAX_VIDEO_SECONDS * opts.fps; frame++) {
    const status = await step(page, frameMs);
    await video.write(await page.screenshot({ type: "jpeg", quality: JPEG_QUALITY }));
    frames++;
    if (status && phaseSeconds[status.phase] === undefined) phaseSeconds[status.phase] = frame / opts.fps;

    if (status?.phase === "finale" && framesSinceFinale < 0) framesSinceFinale = 0;
    if (framesSinceFinale >= 0 && ++framesSinceFinale >= holdFrames) break;
    if (frame % opts.fps === 0) {
      const elapsed = (Date.now() - started) / 1000;
      process.stdout.write(`\r  ${frame / opts.fps} s of video rendered (${elapsed.toFixed(0)} s elapsed)   `);
    }
  }
  process.stdout.write("\n");
  if (framesSinceFinale < 0) console.warn(`Stopped after ${MAX_VIDEO_SECONDS} s without reaching the finale`);
  return { seconds: frames / opts.fps, phaseSeconds };
}

/** Writes where every part of the film starts next to the video; `npm run sound` places the sound with it. */
async function writeTimeline(page: Page, recorded: Recorded, videoFile: string): Promise<void> {
  const parts = await page.evaluate(() => {
    const app = (window as unknown as { runnerAnimation: { filmSegments?(part: string): PartSegment[] } })
      .runnerAnimation;
    return app.filmSegments ? { opening: app.filmSegments("opening"), stats: app.filmSegments("stats") } : null;
  });
  const timeline = parts && SoundTimeline.build(recorded.phaseSeconds, parts.opening, parts.stats, recorded.seconds);
  timeline?.write(videoFile); // none for a recording without the film (?film=0)
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  console.log(`Recording ${VIEWPORT.width * SCALE}x${VIEWPORT.height * SCALE} @ ${opts.fps} fps -> ${opts.out}`);

  const server = await startServer(opts.port);
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  let video: VideoEncoder | null = null;
  try {
    const page = await browser.newPage({
      viewport: VIEWPORT,
      deviceScaleFactor: SCALE,
      isMobile: true,
      hasTouch: true,
    });
    page.on("console", (message) => {
      if (message.type() === "error") console.error("[page]", message.text());
    });
    await page.addInitScript(installVirtualClock);

    const params = new URLSearchParams(opts.params);
    params.set("autoplay", "0");
    await page.goto(`http://localhost:${opts.port}/?${params}`);
    await waitUntilReady(page, 1000 / opts.fps);

    // Not awaited inside the page: play() resolves only at the end of the animation.
    await page.evaluate(() => {
      void (window as unknown as { runnerAnimation: { play(): Promise<void> } }).runnerAnimation.play();
    });
    video = new VideoEncoder(opts.out, opts.fps);
    const recorded = await recordFrames(page, video, opts);
    await video.finish();
    await writeTimeline(page, recorded, opts.out);
    console.log(`Done: ${opts.out}`);
  } catch (error) {
    video?.abort();
    throw error;
  } finally {
    await browser.close();
    server.kill();
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
