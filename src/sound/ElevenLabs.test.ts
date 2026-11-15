import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { ElevenLabs } from "./ElevenLabs";

const realFetch = globalThis.fetch;

interface Call {
  url: string;
  headers: Record<string, string>;
  body: unknown;
}

function stubFetch(status: number, answer: string): Call[] {
  const calls: Call[] = [];
  globalThis.fetch = (async (url: string, init: { headers: Record<string, string>; body: string }) => {
    calls.push({ url, headers: init.headers, body: JSON.parse(init.body) });
    return new Response(answer, { status });
  }) as unknown as typeof fetch;
  return calls;
}

describe("ElevenLabs", () => {
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it("asks for a sound effect of a length and returns the MP3", async () => {
    const calls = stubFetch(200, "mp3-data");
    const audio = await new ElevenLabs("secret").effect("a pop", 0.5);
    assert.equal(audio.toString(), "mp3-data");
    assert.deepEqual(calls, [
      {
        url: "https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128",
        headers: { "xi-api-key": "secret", "Content-Type": "application/json" },
        body: { text: "a pop", duration_seconds: 0.5 },
      },
    ]);
  });

  it("speaks a line with the voice, its model and its style in front", async () => {
    const calls = stubFetch(200, "mp3-data");
    await new ElevenLabs("secret").speak("Done!", {
      voiceId: "voice/1",
      model: "eleven_v3",
      style: "[excited]",
      gainDb: 0,
    });
    assert.equal(calls[0]!.url, "https://api.elevenlabs.io/v1/text-to-speech/voice%2F1?output_format=mp3_44100_128");
    assert.deepEqual(calls[0]!.body, { text: "[excited] Done!", model_id: "eleven_v3" });
  });

  it("speaks a line as it is when the voice has no style", async () => {
    const calls = stubFetch(200, "mp3-data");
    await new ElevenLabs("secret").speak("Done!", { voiceId: "v", model: "m", style: "", gainDb: 0 });
    assert.deepEqual(calls[0]!.body, { text: "Done!", model_id: "m" });
  });

  it("fails with the status and the reason, without the key", async () => {
    stubFetch(401, '{"detail":"invalid api key"}');
    await assert.rejects(new ElevenLabs("secret").effect("a pop", 0.5), (error: Error) => {
      assert.match(error.message, /sound-generation.*HTTP 401.*invalid api key/);
      assert.ok(!error.message.includes("secret"));
      return true;
    });
  });
});
