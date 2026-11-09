import { ChildProcess, spawn } from "child_process";
import fs from "fs";
import path from "path";

/** Turns a stream of JPEG frames into an H.264 MP4 with ffmpeg. */
export class VideoEncoder {
  private readonly ffmpeg: ChildProcess;
  private readonly exited: Promise<number>;

  constructor(outFile: string, fps: number) {
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    // prettier-ignore
    this.ffmpeg = spawn("ffmpeg", [
      "-y", "-loglevel", "error",
      "-f", "image2pipe", "-c:v", "mjpeg", "-framerate", String(fps), "-i", "-",
      // JPEG frames are full-range; players and Instagram expect TV range.
      "-vf", "scale=in_range=full:out_range=tv,format=yuv420p",
      "-c:v", "libx264", "-preset", "slow", "-crf", "18",
      "-movflags", "+faststart", // playable while still downloading
      outFile,
    ], { stdio: ["pipe", "inherit", "inherit"] });
    this.exited = new Promise((resolve) => this.ffmpeg.on("close", (code) => resolve(code ?? 1)));
  }

  async write(jpeg: Buffer): Promise<void> {
    const input = this.ffmpeg.stdin!;
    if (!input.write(jpeg)) await new Promise((resolve) => input.once("drain", resolve));
  }

  async finish(): Promise<void> {
    this.ffmpeg.stdin!.end();
    const code = await this.exited;
    if (code !== 0) throw new Error(`ffmpeg exited with code ${code}`);
  }

  /** Stops ffmpeg without waiting, e.g. after an error. */
  abort(): void {
    if (this.ffmpeg.exitCode === null) this.ffmpeg.kill();
  }
}
