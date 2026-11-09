import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { VideoEncoder } from "./videoEncoder";

const hasFfmpeg = spawnSync("ffmpeg", ["-version"]).status === 0;

/** A few JPEG frames, concatenated as ffmpeg's image2pipe reads them. */
function jpegFrames(count: number): Buffer {
  // prettier-ignore
  return spawnSync("ffmpeg", [
    "-loglevel", "error", "-f", "lavfi", "-i", "color=c=red:s=64x64",
    "-frames:v", String(count), "-f", "image2pipe", "-c:v", "mjpeg", "-",
  ]).stdout;
}

describe("VideoEncoder", { skip: !hasFfmpeg && "ffmpeg not installed" }, () => {
  it("writes an MP4", async () => {
    const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "video-")), "nested", "test.mp4");
    const encoder = new VideoEncoder(out, 30);
    await encoder.write(jpegFrames(3));
    await encoder.finish();

    const header = fs.readFileSync(out).subarray(4, 8).toString();
    assert.equal(header, "ftyp", "MP4 file type box");
  });

  it("fails when ffmpeg cannot read the frames", async () => {
    const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "video-")), "broken.mp4");
    const encoder = new VideoEncoder(out, 30);
    await encoder.write(Buffer.from("not a jpeg"));
    await assert.rejects(encoder.finish(), /ffmpeg exited with code/);
  });
});
