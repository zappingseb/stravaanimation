import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { MixInput, SoundMixer } from "./SoundMixer";

const sound = {
  targetLufs: -14,
  music: {
    file: "music.mp3",
    startSeconds: 0,
    gainDb: -12,
    fadeOutSeconds: 3,
    duck: { threshold: 0.02, ratio: 6, attackMs: 30, releaseMs: 450 },
  },
};
const input: MixInput = {
  video: "film.mp4",
  out: "film-sound.mp4",
  seconds: 10,
  music: "music.mp3",
  cues: [
    { file: "pop.mp3", kind: "effect", at: 1, gainDb: -6 },
    { file: "pop.mp3", kind: "effect", at: 1.25, gainDb: -6 },
    { file: "line.mp3", kind: "voice", at: 2, gainDb: 0 },
  ],
};
const mixArgs = (mix: MixInput) => new SoundMixer(sound).args(mix);
const filterOf = (args: string[]) => args[args.indexOf("-filter_complex") + 1]!;

describe("SoundMixer", () => {
  it("reads every sound file once and keeps the video as it is", () => {
    const args = mixArgs(input);
    assert.deepEqual(
      args.filter((_, i) => args[i - 1] === "-i"),
      ["film.mp4", "pop.mp3", "line.mp3", "music.mp3"],
    );
    assert.deepEqual(args.slice(args.indexOf("-c:v"), args.indexOf("-c:v") + 2), ["-c:v", "copy"]);
    assert.equal(args.at(-1), "film-sound.mp4");
  });

  it("delays every cue to its time and turns it to its level", () => {
    const filter = filterOf(mixArgs(input));
    assert.match(filter, /\[1:a\]asplit=2\[f1_0\]\[f1_1\]/);
    assert.match(filter, /adelay=1000:all=1,volume=-6\.0dB\[cue0\]/);
    assert.match(filter, /adelay=1250:all=1,volume=-6\.0dB\[cue1\]/);
    assert.match(filter, /adelay=2000:all=1,volume=0\.0dB\[cue2\]/);
  });

  it("turns the music down, ducks it under the voice and fades it out at the end", () => {
    const filter = filterOf(mixArgs(input));
    assert.match(filter, /\[3:a\].*volume=-12\.0dB.*afade=t=out:st=7\.000:d=3\[music\]/);
    assert.match(
      filter,
      /\[music\]\[voiceKey\]sidechaincompress=threshold=0\.02:ratio=6:attack=30:release=450\[ducked\]/,
    );
    assert.match(filter, /loudnorm=I=-14/);
  });

  it("repeats music that is shorter than the film", () => {
    const args = mixArgs(input);
    assert.deepEqual(args.slice(args.indexOf("music.mp3") - 3, args.indexOf("music.mp3")), [
      "-stream_loop",
      "-1",
      "-i",
    ]);
  });

  it("works without music and without voice", () => {
    const filter = filterOf(mixArgs({ ...input, music: null, cues: input.cues.slice(0, 1) }));
    assert.ok(!filter.includes("sidechaincompress"));
    assert.match(filter, /anullsrc.*\[voice\]/);
  });

  it(
    "is a call ffmpeg accepts",
    { skip: spawnSync("ffmpeg", ["-version"]).status !== 0 && "ffmpeg not installed" },
    () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mix-"));
      const make = (name: string, source: string, extra: string[]) => {
        const file = path.join(dir, name);
        const made = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "lavfi", "-i", source, ...extra, file]);
        assert.equal(made.status, 0, made.stderr.toString());
        return file;
      };
      const video = make("film.mp4", "color=c=black:s=64x64:r=10", ["-t", "2", "-pix_fmt", "yuv420p"]);
      const tone = make("tone.mp3", "sine=frequency=440", ["-t", "0.3"]);
      const music = make("music.mp3", "sine=frequency=220", ["-t", "1"]);
      const out = path.join(dir, "out.mp4");
      const args = new SoundMixer({ ...sound, music: { ...sound.music, fadeOutSeconds: 0.5 } }).args({
        video,
        out,
        seconds: 2,
        music,
        cues: [
          { file: tone, kind: "effect", at: 0.2, gainDb: -6 },
          { file: tone, kind: "effect", at: 0.6, gainDb: -6 },
          { file: tone, kind: "voice", at: 1, gainDb: 0 },
        ],
      });
      const mixed = spawnSync("ffmpeg", args);
      assert.equal(mixed.status, 0, mixed.stderr.toString());
      const probe = spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type", "-of", "csv=p=0", out]);
      assert.deepEqual(probe.stdout.toString().trim().split(/\s+/).sort(), ["audio", "video"]);
    },
  );
});
