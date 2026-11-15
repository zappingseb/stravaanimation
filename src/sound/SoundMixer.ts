import { spawn } from "child_process";
import { SoundConfig } from "../types";

export interface MixCue {
  file: string;
  kind: "effect" | "voice";
  /** Seconds from the start of the video */
  at: number;
  gainDb: number;
}

export interface MixInput {
  video: string;
  out: string;
  /** Length of the video */
  seconds: number;
  /** null = no music */
  music: string | null;
  cues: MixCue[];
}

const db = (value: number) => `${value.toFixed(1)}dB`;

/** Lays music, effects and voice under a video with one ffmpeg call. */
export class SoundMixer {
  constructor(private readonly sound: Pick<SoundConfig, "music" | "targetLufs">) {}

  /**
   * The arguments for ffmpeg: video copied as it is, one mixed AAC audio track.
   * Only builds the list, so it can be tested and printed (--dry-run).
   */
  args({ video, out, seconds, music, cues }: MixInput): string[] {
    const inputs = ["-i", video];
    const filters: string[] = [];
    let nextInput = 1;

    // One input per sound file; a file used several times is split.
    const files = [...new Set(cues.map((cue) => cue.file))];
    const taps = new Map<string, string[]>();
    for (const file of files) {
      const uses = cues.filter((cue) => cue.file === file).length;
      const index = nextInput++;
      inputs.push("-i", file);
      const labels = Array.from({ length: uses }, (_, use) => `f${index}_${use}`);
      filters.push(
        uses === 1
          ? `[${index}:a]anull[${labels[0]}]`
          : `[${index}:a]asplit=${uses}${labels.map((l) => `[${l}]`).join("")}`,
      );
      taps.set(file, labels);
    }

    const placed = { effect: [] as string[], voice: [] as string[] };
    cues.forEach((cue, i) => {
      const source = taps.get(cue.file)!.shift()!;
      const label = `cue${i}`;
      filters.push(
        `[${source}]aformat=channel_layouts=stereo,adelay=${Math.round(cue.at * 1000)}:all=1,volume=${db(cue.gainDb)}[${label}]`,
      );
      placed[cue.kind].push(label);
    });

    /** Mixes the labels into one stream; silence when there are none. */
    const bus = (labels: string[], name: string) => {
      if (labels.length === 0)
        filters.push(`anullsrc=channel_layout=stereo:sample_rate=44100,atrim=duration=${seconds}[${name}]`);
      else
        filters.push(
          `${labels.map((l) => `[${l}]`).join("")}amix=inputs=${labels.length}:normalize=0:dropout_transition=0,apad,atrim=duration=${seconds}[${name}]`,
        );
    };
    bus(placed.effect, "effects");
    bus(placed.voice, "voice");

    const layers = ["[effects]", "[voiceOut]"];
    if (music) {
      const { startSeconds, gainDb, fadeOutSeconds, duck } = this.sound.music;
      const musicInput = nextInput++;
      // Music shorter than the film starts again instead of leaving the end silent.
      inputs.push("-stream_loop", "-1", "-i", music);
      const fadeStart = Math.max(0, seconds - fadeOutSeconds);
      filters.push(
        `[${musicInput}:a]aformat=channel_layouts=stereo,atrim=start=${startSeconds},asetpts=PTS-STARTPTS,volume=${db(gainDb)},` +
          `apad,atrim=duration=${seconds},afade=t=out:st=${fadeStart.toFixed(3)}:d=${fadeOutSeconds}[music]`,
      );
      // The voice is the side chain: while it speaks, the music is turned down.
      filters.push("[voice]asplit=2[voiceOut][voiceKey]");
      filters.push(
        `[music][voiceKey]sidechaincompress=threshold=${duck.threshold}:ratio=${duck.ratio}:attack=${duck.attackMs}:release=${duck.releaseMs}[ducked]`,
      );
      layers.push("[ducked]");
    } else {
      filters.push("[voice]anull[voiceOut]");
    }
    filters.push(
      `${layers.join("")}amix=inputs=${layers.length}:normalize=0:dropout_transition=0,` +
        `loudnorm=I=${this.sound.targetLufs}:TP=-1.5:LRA=11,aresample=48000[mix]`,
    );

    // prettier-ignore
    return [
      "-y", "-loglevel", "error",
      ...inputs,
      "-filter_complex", filters.join(";"),
      "-map", "0:v", "-map", "[mix]",
      "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
      "-t", String(seconds),
      "-movflags", "+faststart",
      out,
    ];
  }

  /** Runs ffmpeg with args(input). */
  mix(input: MixInput): Promise<void> {
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn("ffmpeg", this.args(input), { stdio: ["ignore", "inherit", "inherit"] });
      ffmpeg.on("error", reject);
      ffmpeg.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with code ${code}`))));
    });
  }
}
