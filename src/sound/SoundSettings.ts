import fs from "fs";
import path from "path";
import { SoundConfig } from "../types";

const KEY_NAME = "ELEVENLABS_API_KEY";
const KEY_LINE = new RegExp(`^\\s*${KEY_NAME}\\s*=.*$`, "m");
const MAX_KEY_LENGTH = 200;

/** A request that cannot be stored; the message is meant for the caller. */
export class SoundSettingsError extends Error {}

/**
 * The two things of the film's sound that are personal and never part of the repository:
 * the soundtrack (sound.music.file) and the ElevenLabs API key (.env). Both folders are
 * in .gitignore.
 */
export class SoundSettings {
  private readonly musicFile: string | null;

  /** @param envFile where the API key is kept; `npm run sound` reads it from there */
  constructor(
    sound: Pick<SoundConfig, "music">,
    private readonly envFile = path.resolve(".env"),
  ) {
    this.musicFile = sound.music.file ? path.resolve(sound.music.file) : null;
  }

  /** What is there. Never contains the key itself. */
  status(): { music: { file: string | null; present: boolean; bytes: number }; elevenLabsKey: { present: boolean } } {
    const present = this.musicFile !== null && fs.existsSync(this.musicFile);
    return {
      music: { file: this.musicFile, present, bytes: present ? fs.statSync(this.musicFile!).size : 0 },
      elevenLabsKey: { present: this.apiKey() !== null },
    };
  }

  /** The soundtrack, or null when there is none (the film is mixed without music). */
  music(): string | null {
    return this.musicFile && fs.existsSync(this.musicFile) ? this.musicFile : null;
  }

  /** Stores an MP3 as the film's soundtrack. */
  saveMusic(mp3: Buffer): void {
    if (!this.musicFile)
      throw new SoundSettingsError("config.json: sound.music.file is empty, so there is no place for a soundtrack");
    if (!SoundSettings.isMp3(mp3)) throw new SoundSettingsError("The soundtrack must be an MP3 file");
    fs.mkdirSync(path.dirname(this.musicFile), { recursive: true });
    fs.writeFileSync(this.musicFile, mp3);
  }

  /** An MP3 starts with an ID3 tag or with an MPEG audio frame. */
  static isMp3(data: Buffer): boolean {
    if (data.length < 4) return false;
    const id3 = data.subarray(0, 3).toString("latin1") === "ID3";
    const frame = data[0] === 0xff && (data[1]! & 0xe0) === 0xe0;
    return id3 || frame;
  }

  /** The key from the environment or from the .env file. */
  apiKey(): string | null {
    if (process.env[KEY_NAME]) return process.env[KEY_NAME]!;
    if (!fs.existsSync(this.envFile)) return null;
    const line = fs.readFileSync(this.envFile, "utf8").match(KEY_LINE)?.[0];
    const value = line
      ?.slice(line.indexOf("=") + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    return value || null;
  }

  /** Writes the key to the .env file (readable by the owner only) and leaves its other lines alone. */
  saveApiKey(apiKey: unknown): void {
    if (typeof apiKey !== "string" || !/^[\x21-\x7e]+$/.test(apiKey) || apiKey.length > MAX_KEY_LENGTH) {
      throw new SoundSettingsError("apiKey must be the ElevenLabs API key: one word without spaces");
    }
    const line = `${KEY_NAME}=${apiKey}`;
    const before = fs.existsSync(this.envFile) ? fs.readFileSync(this.envFile, "utf8") : "";
    const after = KEY_LINE.test(before)
      ? before.replace(KEY_LINE, () => line)
      : `${before}${before && !before.endsWith("\n") ? "\n" : ""}${line}\n`;
    fs.writeFileSync(this.envFile, after, { mode: 0o600 });
    fs.chmodSync(this.envFile, 0o600);
    process.env[KEY_NAME] = apiKey;
  }
}
