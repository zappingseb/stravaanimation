import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { AppConfig } from "../types";
import { parseArgs, SoundTrack } from "./sound";
import { SoundSettings } from "./SoundSettings";

describe("parseArgs", () => {
  it("defaults to recordings/running-<year>.mp4 and writes next to it", () => {
    const options = parseArgs([], "2025");
    assert.equal(options.video, path.resolve("recordings/running-2025.mp4"));
    assert.equal(options.out, path.resolve("recordings/running-2025-sound.mp4"));
    assert.equal(options.dryRun, false);
  });

  it("reads the options", () => {
    assert.deepEqual(parseArgs(["--video", "a.mp4", "--out", "b.mp4", "--dry-run"]), {
      video: path.resolve("a.mp4"),
      out: path.resolve("b.mp4"),
      dryRun: true,
    });
  });
});

describe("SoundTrack", () => {
  let dir: string;
  let video: string;
  let sound: AppConfig["sound"];
  let printed: string[];
  const keyBefore = process.env.ELEVENLABS_API_KEY;
  const real = { log: console.log, warn: console.warn };
  const track = (dryRun: boolean) =>
    new SoundTrack(
      sound,
      { video, out: path.join(dir, "out.mp4"), dryRun },
      new SoundSettings(sound, path.join(dir, ".env")),
    );

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "sound-track-"));
    video = path.join(dir, "film.mp4");
    fs.writeFileSync(video, "video");
    fs.writeFileSync(
      path.join(dir, "film.timeline.json"),
      JSON.stringify({
        seconds: 10,
        segments: [
          { id: "title", start: 0, seconds: 3 },
          { id: "days", start: 3, seconds: 4 },
        ],
      }),
    );
    sound = {
      assetDir: path.join(dir, "assets"),
      targetLufs: -14,
      music: {
        file: path.join(dir, "assets", "soundtrack.mp3"),
        startSeconds: 0,
        gainDb: -12,
        fadeOutSeconds: 3,
        duck: { threshold: 0.02, ratio: 6, attackMs: 30, releaseMs: 450 },
      },
      voice: { voiceId: "v", model: "m", style: "", gainDb: 2 },
      effects: { boom: { prompt: "a boom", seconds: 1, gainDb: -4 } },
      cues: [
        { at: "title", effect: "boom", gainDb: 1 },
        { at: "days", offset: 0.5, say: "Many days!" },
        { at: "kudos", effect: "boom" },
      ],
    };
    printed = [];
    console.log = (line: string) => printed.push(line);
    console.warn = (line: string) => printed.push(line);
    delete process.env.ELEVENLABS_API_KEY;
  });

  afterEach(() => {
    Object.assign(console, real);
    if (keyBefore === undefined) delete process.env.ELEVENLABS_API_KEY;
    else process.env.ELEVENLABS_API_KEY = keyBefore;
  });

  it("prints the cue sheet, what is missing and the ffmpeg call on a dry run, and generates nothing", async () => {
    await track(true).run();
    const output = printed.join("\n");
    assert.match(output, /0\.00 s {2}effect {2}boom \(\+1 dB\)/);
    assert.match(output, /3\.50 s {2}voice {3}Many days!/);
    assert.match(output, /skipped: the film has no "kudos" \(boom\)/);
    assert.match(output, /no music: .*soundtrack\.mp3 not found/);
    assert.match(output, /2 sounds would be generated:/);
    assert.match(output, /volume=-3\.0dB/, "cue gain + effect gain");
    assert.match(output, /volume=2\.0dB/, "voice gain");
    assert.equal(fs.existsSync(sound.assetDir), false);
  });

  it("mixes the music in when the soundtrack is there", async () => {
    fs.mkdirSync(sound.assetDir);
    fs.writeFileSync(sound.music.file, "mp3");
    await track(true).run();
    assert.match(printed.join("\n"), /-stream_loop -1 -i \S*soundtrack\.mp3/);
  });

  it("stops when sounds are missing and there is no ElevenLabs key", async () => {
    await assert.rejects(track(false).run(), /2 sounds are missing and ELEVENLABS_API_KEY is not set/);
  });

  it("stops when the video or its timeline is missing", async () => {
    fs.rmSync(path.join(dir, "film.timeline.json"));
    await assert.rejects(track(true).run(), /film\.timeline\.json not found\. Record the film first/);
    fs.rmSync(video);
    await assert.rejects(track(true).run(), /film\.mp4 not found\. Record the film first/);
  });
});
