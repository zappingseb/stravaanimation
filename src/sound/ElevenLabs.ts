import { SoundConfig } from "../types";

const API = "https://api.elevenlabs.io/v1";
const OUTPUT_FORMAT = "mp3_44100_128";

/** The two ElevenLabs calls the film needs. Both return MP3 data. */
export class ElevenLabs {
  constructor(private readonly apiKey: string) {}

  /** A sound effect from a description. */
  effect(prompt: string, seconds: number): Promise<Buffer> {
    return this.post(`/sound-generation?output_format=${OUTPUT_FORMAT}`, { text: prompt, duration_seconds: seconds });
  }

  /** One announcer line. */
  speak(line: string, voice: SoundConfig["voice"]): Promise<Buffer> {
    const text = voice.style ? `${voice.style} ${line}` : line;
    return this.post(`/text-to-speech/${encodeURIComponent(voice.voiceId)}?output_format=${OUTPUT_FORMAT}`, {
      text,
      model_id: voice.model,
    });
  }

  private async post(path: string, body: unknown): Promise<Buffer> {
    const response = await fetch(`${API}${path}`, {
      method: "POST",
      headers: { "xi-api-key": this.apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 300);
      throw new Error(`ElevenLabs ${path}: HTTP ${response.status} ${detail}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }
}
