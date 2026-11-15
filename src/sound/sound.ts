// Adds sound to a recorded film: music, effects and announcer lines from config.json (sound).
//
//   npm run sound                                   -> recordings/running-<year>-sound.mp4
//   npm run sound -- --video recordings/x.mp4 --out recordings/x-sound.mp4
//   npm run sound -- --dry-run                      -> prints the cue sheet and the ffmpeg call, generates nothing
//
// Missing effects and lines are generated with ElevenLabs (ELEVENLABS_API_KEY in .env,
// or PUT /api/sound/elevenlabs-key) and kept in sound.assetDir. The film timings come from
// <video>.timeline.json, which `npm run record` writes next to the video.

import fs from "fs";
import path from "path";
import { appConfig } from "../config";
import { AppConfig } from "../types";
import { ElevenLabs } from "./ElevenLabs";
import { SoundAssets } from "./SoundAssets";
import { SoundMixer } from "./SoundMixer";
import { SoundSettings } from "./SoundSettings";
import { PlacedCue, SoundTimeline } from "./SoundTimeline";

export interface Options {
  video: string;
  out: string;
  dryRun: boolean;
}

export function parseArgs(argv: string[], year = appConfig.animation.startDate.slice(0, 4)): Options {
  const value = (name: string): string | undefined => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const video = path.resolve(value("video") ?? `recordings/running-${year}.mp4`);
  return {
    video,
    out: path.resolve(value("out") ?? video.replace(/\.mp4$/i, "") + "-sound.mp4"),
    dryRun: argv.includes("--dry-run"),
  };
}

/** One run of `npm run sound`: cue sheet, missing sounds, mix. */
export class SoundTrack {
  private readonly assets: SoundAssets;
  private readonly mixer: SoundMixer;

  constructor(
    private readonly sound: AppConfig["sound"],
    private readonly options: Options,
    private readonly settings = new SoundSettings(sound),
  ) {
    this.assets = new SoundAssets(sound);
    this.mixer = new SoundMixer(sound);
  }

  async run(): Promise<void> {
    const { sound, options } = this;
    if (!fs.existsSync(options.video))
      throw new Error(`${options.video} not found. Record the film first (npm run record).`);

    const timeline = SoundTimeline.read(options.video);
    const { placed, skipped } = timeline.place(sound.cues);
    console.log(`Sound for ${options.video} (${timeline.film.seconds} s): ${placed.length} cues`);
    this.printCueSheet(placed);
    for (const cue of skipped) console.warn(`  skipped: the film has no "${cue.at}" (${cue.say ?? cue.effect})`);

    const music = this.settings.music();
    if (sound.music.file && !music) {
      console.warn(
        `  no music: ${path.resolve(sound.music.file)} not found (put an MP3 there or PUT /api/sound/music)`,
      );
    }
    const input = {
      video: options.video,
      out: options.out,
      seconds: timeline.film.seconds,
      music,
      cues: placed.map((cue) => ({
        file: this.assets.cueFile(cue),
        kind: cue.kind,
        at: cue.at,
        gainDb: cue.gainDb + (cue.kind === "voice" ? sound.voice.gainDb : (sound.effects[cue.what]?.gainDb ?? 0)),
      })),
    };
    const missing = this.assets.missing(placed);

    if (options.dryRun) {
      console.log(`\n${missing.length} sounds would be generated:`);
      for (const cue of missing) console.log(`  ${cue.kind}: ${cue.what}`);
      console.log(
        `\nffmpeg ${this.mixer
          .args(input)
          .map((arg) => (/[\s;[\]]/.test(arg) ? `'${arg}'` : arg))
          .join(" ")}`,
      );
      return;
    }

    if (missing.length > 0) {
      const apiKey = this.settings.apiKey();
      if (!apiKey)
        throw new Error(
          `${missing.length} sounds are missing and ELEVENLABS_API_KEY is not set (.env, or PUT /api/sound/elevenlabs-key)`,
        );
      console.log(`Generating ${missing.length} sounds with ElevenLabs -> ${path.resolve(sound.assetDir)}`);
      await this.assets.generate(missing, new ElevenLabs(apiKey));
    }
    await this.mixer.mix(input);
    console.log(`Done: ${options.out}`);
  }

  private printCueSheet(cues: PlacedCue[]): void {
    for (const cue of cues) {
      const gain = cue.gainDb ? ` (${cue.gainDb > 0 ? "+" : ""}${cue.gainDb} dB)` : "";
      console.log(`  ${cue.at.toFixed(2).padStart(6)} s  ${cue.kind.padEnd(6)}  ${cue.what}${gain}`);
    }
  }
}

if (require.main === module) {
  new SoundTrack(appConfig.sound, parseArgs(process.argv.slice(2))).run().catch((error) => {
    console.error((error as Error).message);
    process.exit(1);
  });
}
