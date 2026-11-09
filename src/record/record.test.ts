import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { parseArgs } from "./record";

describe("parseArgs", () => {
  it("defaults to 30 fps, a 4 s finale and recordings/running-<year>.mp4", () => {
    const options = parseArgs([]);
    assert.equal(options.fps, 30);
    assert.equal(options.hold, 4);
    assert.equal(options.port, 3999);
    assert.equal(options.params, "");
    assert.match(options.out, /recordings[/\\]running-\d{4}\.mp4$/);
  });

  it("reads the options", () => {
    const args = ["--fps", "60", "--out", "x.mp4", "--params", "intro=0", "--hold", "6", "--port", "4000"];
    const options = parseArgs(args);
    assert.deepEqual(options, { fps: 60, out: path.resolve("x.mp4"), params: "intro=0", hold: 6, port: 4000 });
  });
});
