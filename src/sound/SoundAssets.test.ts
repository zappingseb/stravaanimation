import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { SoundConfig } from "../types";
import { ElevenLabs } from "./ElevenLabs";
import { SoundAssets } from "./SoundAssets";

describe("SoundAssets", () => {
  const config = {
    assetDir: path.join(fs.mkdtempSync(path.join(os.tmpdir(), "assets-")), "sounds"),
    voice: { voiceId: "v1", model: "m", style: "[excited]", gainDb: 0 },
    effects: { pop: { prompt: "a pop", seconds: 0.5 } },
  } as unknown as SoundConfig;
  const assets = new SoundAssets(config);
  const pop = { kind: "effect" as const, what: "pop", at: 0, gainDb: 0 };
  const line = { kind: "voice" as const, what: "Hello", at: 1, gainDb: 0 };

  it("names a sound after what it is generated from", () => {
    const changed = { ...config, effects: { pop: { prompt: "a louder pop", seconds: 0.5 } } };
    assert.match(path.basename(assets.effectFile("pop")), /^effect-pop-[0-9a-f]{10}\.mp3$/);
    assert.notEqual(assets.effectFile("pop"), new SoundAssets(changed).effectFile("pop"));
    assert.notEqual(assets.voiceFile("Hello"), assets.voiceFile("Hello!"));
    assert.equal(assets.cueFile(pop), assets.effectFile("pop"));
    assert.equal(assets.cueFile(line), assets.voiceFile("Hello"));
  });

  it("refuses an effect that is not defined", () => {
    assert.throws(() => assets.effectFile("bang"), /"bang" is not defined in config\.json/);
  });

  it("generates the missing sounds once, each with its own call", async () => {
    const asked: string[] = [];
    const elevenLabs = {
      effect: async (prompt: string, seconds: number) => {
        asked.push(`effect: ${prompt}, ${seconds} s`);
        return Buffer.from("pop-mp3");
      },
      speak: async (text: string, voice: SoundConfig["voice"]) => {
        asked.push(`speak: ${text} as ${voice.voiceId}`);
        return Buffer.from("line-mp3");
      },
    } as unknown as ElevenLabs;
    const log = console.log;
    console.log = () => undefined;
    try {
      assert.deepEqual(assets.missing([pop, pop, line]), [pop, line]);
      await assets.generate(assets.missing([pop, pop, line]), elevenLabs);
    } finally {
      console.log = log;
    }
    assert.deepEqual(asked, ["effect: a pop, 0.5 s", "speak: Hello as v1"]);
    assert.equal(fs.readFileSync(assets.effectFile("pop"), "utf8"), "pop-mp3");
    assert.equal(fs.readFileSync(assets.voiceFile("Hello"), "utf8"), "line-mp3");
    assert.deepEqual(assets.missing([pop, pop, line]), []);
  });
});
