import fs from "fs";
import { FilmTimeline, SoundCue } from "../types";

export interface PartSegment {
  id: string;
  ms: number;
}

/** A cue at its place in the video. */
export interface PlacedCue {
  kind: "effect" | "voice";
  /** Effect name, or the announcer's line */
  what: string;
  /** Seconds from the start of the video */
  at: number;
  gainDb: number;
}

const round3 = (value: number) => Math.round(value * 1000) / 1000;
const isTransition = (id: string) => id.includes(">");
const isIntro = (id: string) => id.startsWith("intro:");

/**
 * The film's parts in video time. `npm run record` writes it next to the video;
 * `npm run sound` places the sound cues on it.
 */
export class SoundTimeline {
  constructor(readonly film: FilmTimeline) {}

  /**
   * @param phaseSeconds video time at which the app entered each phase (intro, playing, stats)
   * @param opening segments of the film before the city tracks, `stats` those after them
   * @returns null for a recording without the film (?film=0)
   */
  static build(
    phaseSeconds: Record<string, number>,
    opening: PartSegment[],
    stats: PartSegment[],
    seconds: number,
  ): SoundTimeline | null {
    const { intro, playing, stats: statsStart } = phaseSeconds;
    if (intro === undefined || playing === undefined || statsStart === undefined) return null;

    const segments: FilmTimeline["segments"] = [];
    const add = (part: PartSegment[], start: number) => {
      let at = start;
      for (const segment of part) {
        segments.push({ id: segment.id, start: round3(at), seconds: segment.ms / 1000 });
        at += segment.ms / 1000;
      }
    };
    add(opening, intro);
    segments.push({ id: "city", start: round3(playing), seconds: round3(statsStart - playing) });
    add(stats, statsStart);
    return new SoundTimeline({ seconds: round3(seconds), segments });
  }

  /** recordings/x.mp4 -> recordings/x.timeline.json */
  static fileFor(videoFile: string): string {
    return videoFile.replace(/\.[^./\\]+$/, "") + ".timeline.json";
  }

  static read(videoFile: string): SoundTimeline {
    const file = SoundTimeline.fileFor(videoFile);
    if (!fs.existsSync(file)) {
      throw new Error(
        `${file} not found. Record the film first (npm run record); it writes the timeline next to the video.`,
      );
    }
    return new SoundTimeline(JSON.parse(fs.readFileSync(file, "utf8")) as FilmTimeline);
  }

  write(videoFile: string): void {
    fs.writeFileSync(SoundTimeline.fileFor(videoFile), JSON.stringify(this.film, null, 2) + "\n");
  }

  /**
   * Turns "at: kudos, offset: 0.5" into seconds of the video. Cues for segments the film
   * does not have (a scene without data) are left out and reported in `skipped`.
   */
  place(cues: SoundCue[]): { placed: PlacedCue[]; skipped: SoundCue[] } {
    const placed: PlacedCue[] = [];
    const skipped: SoundCue[] = [];
    const withOwnCue = new Set(cues.map((cue) => cue.at));

    for (const cue of cues) {
      const general = cue.at === "transition" ? isTransition : cue.at === "intro" ? isIntro : null;
      const segments = general
        ? this.film.segments.filter((segment) => general(segment.id) && !withOwnCue.has(segment.id))
        : this.film.segments.filter((segment) => segment.id === cue.at);
      if (segments.length === 0) {
        skipped.push(cue);
        continue;
      }
      const what = cue.say ?? cue.effect;
      if (!what) throw new Error(`Sound cue at "${cue.at}" needs "effect" or "say"`);
      const count = cue.repeat?.count ?? 1;
      for (const segment of segments) {
        for (let i = 0; i < count; i++) {
          placed.push({
            kind: cue.say ? "voice" : "effect",
            what,
            at: round3(segment.start + (cue.offset ?? 0) + i * (cue.repeat?.everySeconds ?? 0)),
            gainDb: cue.gainDb ?? 0,
          });
        }
      }
    }
    placed.sort((a, b) => a.at - b.at);
    return { placed, skipped };
  }
}
