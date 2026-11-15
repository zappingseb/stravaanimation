import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FilmTimeline } from "../types";
import { SoundTimeline } from "./SoundTimeline";

const timeline: FilmTimeline = {
  seconds: 20,
  segments: [
    { id: "title", start: 0, seconds: 3.5 },
    { id: "title>city", start: 3.5, seconds: 0.6 },
    { id: "city", start: 4.1, seconds: 8 },
    { id: "city>days", start: 12.1, seconds: 0.4 },
    { id: "days", start: 12.5, seconds: 4.5 },
    { id: "days>kudos", start: 17, seconds: 1.5 },
  ],
};

describe("SoundTimeline.build", () => {
  it("lines up the film's parts with the phases of the recording", () => {
    const built = SoundTimeline.build(
      { intro: 0, playing: 4.1, stats: 12.1 },
      [
        { id: "title", ms: 3500 },
        { id: "title>city", ms: 600 },
      ],
      [
        { id: "city>days", ms: 400 },
        { id: "days", ms: 4500 },
      ],
      18,
    );
    assert.deepEqual(built?.film.segments, [
      { id: "title", start: 0, seconds: 3.5 },
      { id: "title>city", start: 3.5, seconds: 0.6 },
      { id: "city", start: 4.1, seconds: 8 },
      { id: "city>days", start: 12.1, seconds: 0.4 },
      { id: "days", start: 12.5, seconds: 4.5 },
    ]);
    assert.equal(built?.film.seconds, 18);
  });

  it("is null for a recording without the film", () => {
    assert.equal(SoundTimeline.build({ intro: 0, playing: 4 }, [], [], 60), null);
  });

  it("names the timeline file after the video", () => {
    assert.equal(SoundTimeline.fileFor("recordings/running-2025.mp4"), "recordings/running-2025.timeline.json");
  });
});

describe("SoundTimeline.place", () => {
  it("places effects and lines by segment and offset", () => {
    const { placed } = new SoundTimeline(timeline).place([
      { at: "days", offset: 0.8, say: "Many days!" },
      { at: "title", effect: "boom" },
    ]);
    assert.deepEqual(placed, [
      { kind: "effect", what: "boom", at: 0, gainDb: 0 },
      { kind: "voice", what: "Many days!", at: 13.3, gainDb: 0 },
    ]);
  });

  it("repeats an effect", () => {
    const { placed } = new SoundTimeline(timeline).place([
      { at: "days", offset: 1, effect: "pop", gainDb: -3, repeat: { count: 3, everySeconds: 0.25 } },
    ]);
    assert.deepEqual(
      placed.map((cue) => cue.at),
      [13.5, 13.75, 14],
    );
    assert.ok(placed.every((cue) => cue.gainDb === -3));
  });

  it("gives every transition without its own cue the general one", () => {
    const { placed } = new SoundTimeline(timeline).place([
      { at: "transition", effect: "swoosh" },
      { at: "days>kudos", effect: "beads" },
    ]);
    assert.deepEqual(
      placed.map((cue) => `${cue.at} ${cue.what}`),
      ["3.5 swoosh", "12.1 swoosh", "17 beads"],
    );
  });

  it("reports cues for scenes the film does not have", () => {
    const { placed, skipped } = new SoundTimeline(timeline).place([{ at: "everest", effect: "cheer" }]);
    assert.deepEqual(placed, []);
    assert.equal(skipped[0]?.at, "everest");
  });

  it("rejects a cue without a sound", () => {
    assert.throws(() => new SoundTimeline(timeline).place([{ at: "days" }]), /needs "effect" or "say"/);
  });
});
