import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import express from "express";
import { SoundApi } from "./SoundApi";
import { SoundSettings } from "./SoundSettings";

const MP3 = Buffer.from([0xff, 0xfb, 0x90, 0x00, 0x00]);
/** Not a real key */
const KEY = "dummy-key-for-this-test";
const ENV_LINE = ["ELEVENLABS_API_KEY", KEY].join("=") + "\n";

describe("SoundApi", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sound-api-"));
  const musicFile = path.join(dir, "sound-assets", "soundtrack.mp3");
  const envFile = path.join(dir, ".env");
  const keyBefore = process.env.ELEVENLABS_API_KEY;
  let server: http.Server;
  let url: string;

  const put = (route: string, contentType: string, body: BodyInit) =>
    fetch(`${url}${route}`, { method: "PUT", headers: { "Content-Type": contentType }, body });

  before(async () => {
    delete process.env.ELEVENLABS_API_KEY;
    const app = express();
    app.use(
      "/api/sound",
      new SoundApi(new SoundSettings({ music: { file: musicFile } } as never, envFile), "1kb").router(),
    );
    server = app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/sound`;
  });

  after(() => {
    server.close();
    if (keyBefore === undefined) delete process.env.ELEVENLABS_API_KEY;
    else process.env.ELEVENLABS_API_KEY = keyBefore;
  });

  it("reports that nothing is there yet", async () => {
    const status = await (await fetch(url)).json();
    assert.deepEqual(status, {
      music: { file: musicFile, present: false, bytes: 0 },
      elevenLabsKey: { present: false },
    });
  });

  it("stores an uploaded MP3 as the soundtrack", async () => {
    const response = await put("/music", "audio/mpeg", MP3);
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).music, { file: musicFile, present: true, bytes: 5 });
    assert.deepEqual(fs.readFileSync(musicFile), MP3);
  });

  it("answers 400 to an upload that is not an MP3 and keeps the soundtrack", async () => {
    const response = await put("/music", "audio/mpeg", "RIFF....WAVE");
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "The soundtrack must be an MP3 file" });
    assert.deepEqual(fs.readFileSync(musicFile), MP3);
  });

  it("answers 413 as JSON to a soundtrack that is too large and keeps the old one", async () => {
    const response = await put("/music", "audio/mpeg", Buffer.concat([MP3, Buffer.alloc(2000)]));
    assert.equal(response.status, 413);
    assert.match((await response.json()).error, /too large/);
    assert.deepEqual(fs.readFileSync(musicFile), MP3);
  });

  it("answers 500 as JSON when the soundtrack cannot be written, without the reason", async () => {
    const error = console.error;
    console.error = () => undefined;
    fs.chmodSync(musicFile, 0o400);
    try {
      const response = await put("/music", "audio/mpeg", Buffer.concat([MP3, MP3]));
      assert.equal(response.status, 500);
      assert.deepEqual(await response.json(), { error: "The sound settings could not be stored" });
    } finally {
      fs.chmodSync(musicFile, 0o600);
      console.error = error;
    }
  });

  it("answers 400 to an upload with another content type", async () => {
    const response = await put("/music", "text/plain", "hello");
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /Content-Type: audio\/mpeg/);
  });

  it("stores the ElevenLabs key in .env and never sends it back", async () => {
    const response = await put("/elevenlabs-key", "application/json", JSON.stringify({ apiKey: KEY }));
    const text = await response.text();
    assert.equal(response.status, 200);
    assert.equal(JSON.parse(text).elevenLabsKey.present, true);
    assert.ok(!text.includes(KEY));
    assert.equal(fs.readFileSync(envFile, "utf8"), ENV_LINE);
    assert.ok(!(await (await fetch(url)).text()).includes(KEY));
  });

  it("answers 400 to a request without a usable key", async () => {
    for (const apiKey of [undefined, "", "two words"]) {
      const response = await put("/elevenlabs-key", "application/json", JSON.stringify({ apiKey }));
      assert.equal(response.status, 400);
    }
    assert.equal(fs.readFileSync(envFile, "utf8"), ENV_LINE);
  });

  it("only lets the computer it runs on change the settings", () => {
    const answer = (remoteAddress: string) => {
      let status = 200;
      let passed = false;
      const res = { status: (code: number) => ((status = code), { json: () => undefined }) };
      (SoundApi as unknown as { localOnly(req: unknown, res: unknown, next: () => void): void }).localOnly(
        { socket: { remoteAddress } },
        res,
        () => (passed = true),
      );
      return { status, passed };
    };
    assert.deepEqual(answer("127.0.0.1"), { status: 200, passed: true });
    assert.deepEqual(answer("::1"), { status: 200, passed: true });
    assert.deepEqual(answer("192.168.1.20"), { status: 403, passed: false });
  });
});
