import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { SoundSettings, SoundSettingsError } from "./SoundSettings";

const MP3 = Buffer.from([0xff, 0xfb, 0x90, 0x00, 0x00]);

describe("SoundSettings", () => {
  let dir: string;
  let settings: SoundSettings;
  let envFile: string;
  const keyBefore = process.env.ELEVENLABS_API_KEY;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "sound-settings-"));
    envFile = path.join(dir, ".env");
    settings = new SoundSettings({ music: { file: path.join(dir, "assets", "soundtrack.mp3") } } as never, envFile);
    delete process.env.ELEVENLABS_API_KEY;
  });

  afterEach(() => {
    if (keyBefore === undefined) delete process.env.ELEVENLABS_API_KEY;
    else process.env.ELEVENLABS_API_KEY = keyBefore;
  });

  it("starts without soundtrack and key", () => {
    assert.deepEqual(settings.status(), {
      music: { file: path.join(dir, "assets", "soundtrack.mp3"), present: false, bytes: 0 },
      elevenLabsKey: { present: false },
    });
    assert.equal(settings.music(), null);
  });

  it("stores an MP3 as the soundtrack", () => {
    settings.saveMusic(MP3);
    assert.deepEqual(settings.status().music, { file: settings.music(), present: true, bytes: 5 });
    settings.saveMusic(Buffer.concat([Buffer.from("ID3"), MP3]));
    assert.equal(settings.status().music.bytes, 8);
  });

  it("refuses a file that is not an MP3", () => {
    assert.throws(() => settings.saveMusic(Buffer.from("RIFF....WAVE")), SoundSettingsError);
    assert.equal(settings.music(), null);
  });

  it("writes the key to .env for the owner only and never reports it", () => {
    fs.writeFileSync(envFile, "STRAVA_EXPORT_DIR=./export\nELEVENLABS_API_KEY=old\nPORT=3000");
    settings.saveApiKey("sk_new$1");
    assert.equal(
      fs.readFileSync(envFile, "utf8"),
      "STRAVA_EXPORT_DIR=./export\nELEVENLABS_API_KEY=sk_new$1\nPORT=3000",
    );
    assert.equal(fs.statSync(envFile).mode & 0o777, 0o600);
    assert.equal(settings.apiKey(), "sk_new$1");
    assert.ok(!JSON.stringify(settings.status()).includes("sk_new"));
    assert.equal(settings.status().elevenLabsKey.present, true);
  });

  it("adds the key to a .env that has none and reads it back from the file", () => {
    fs.writeFileSync(envFile, "PORT=3000");
    settings.saveApiKey("sk_abc");
    assert.equal(fs.readFileSync(envFile, "utf8"), "PORT=3000\nELEVENLABS_API_KEY=sk_abc\n");
    delete process.env.ELEVENLABS_API_KEY;
    assert.equal(settings.apiKey(), "sk_abc");
  });

  it("refuses a key with spaces, line breaks or no text", () => {
    for (const bad of ["", "two words", "key\nPORT=1", undefined, 42]) {
      assert.throws(() => settings.saveApiKey(bad), SoundSettingsError);
    }
    assert.equal(fs.existsSync(envFile), false);
  });
});
