import crypto from "crypto";
import fs from "fs";
import path from "path";
import { SoundConfig } from "../types";
import { ElevenLabs } from "./ElevenLabs";
import { PlacedCue } from "./SoundTimeline";

function hash(...parts: (string | number)[]): string {
  return crypto.createHash("sha256").update(parts.join("\u0000")).digest("hex").slice(0, 10);
}

/**
 * The generated effects and announcer lines in sound.assetDir. A file is named after
 * what it was generated from, so a sound is only generated again (and paid for again)
 * when its description or line changes.
 */
export class SoundAssets {
  private readonly dir: string;

  constructor(private readonly config: SoundConfig) {
    this.dir = path.resolve(config.assetDir);
  }

  effectFile(name: string): string {
    const effect = this.config.effects[name];
    if (!effect) throw new Error(`Sound effect "${name}" is not defined in config.json (sound.effects)`);
    return path.join(this.dir, `effect-${name}-${hash(effect.prompt, effect.seconds)}.mp3`);
  }

  voiceFile(line: string): string {
    const { voiceId, model, style } = this.config.voice;
    return path.join(this.dir, `voice-${hash(line, voiceId, model, style)}.mp3`);
  }

  cueFile(cue: PlacedCue): string {
    return cue.kind === "voice" ? this.voiceFile(cue.what) : this.effectFile(cue.what);
  }

  /** The cues whose files do not exist yet, each file once. */
  missing(cues: PlacedCue[]): PlacedCue[] {
    const seen = new Set<string>();
    return cues.filter((cue) => {
      const file = this.cueFile(cue);
      if (seen.has(file) || fs.existsSync(file)) return false;
      seen.add(file);
      return true;
    });
  }

  /** Generates the missing sounds. */
  async generate(missing: PlacedCue[], elevenLabs: ElevenLabs): Promise<void> {
    fs.mkdirSync(this.dir, { recursive: true });
    for (const cue of missing) {
      console.log(`  generating ${cue.kind}: ${cue.what}`);
      const effect = this.config.effects[cue.what];
      const audio =
        cue.kind === "voice"
          ? await elevenLabs.speak(cue.what, this.config.voice)
          : await elevenLabs.effect(effect!.prompt, effect!.seconds);
      fs.writeFileSync(this.cueFile(cue), audio);
    }
  }
}
