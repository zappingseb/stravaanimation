import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseGpx } from "./gpx";

// ~11 m between neighbouring points (0.0001° latitude)
const GPX = `<?xml version="1.0"?>
<gpx><trk><trkseg>
  <trkpt lat="48.0000000" lon="11.0000000"><ele>500.0</ele><time>2025-03-01T08:00:00Z</time></trkpt>
  <trkpt lat="48.0001000" lon="11.0000000"><ele>502.0</ele><time>2025-03-01T08:00:05Z</time></trkpt>
  <trkpt lat="48.0002000" lon="11.0000000"><ele>504.0</ele></trkpt>
  <trkpt lat="48.0003000" lon="11.0000000"/>
</trkseg></trk></gpx>`;

describe("parseGpx", () => {
  it("reads points, start time, length and elevations", () => {
    const track = parseGpx(GPX, 0);

    assert.equal(track.points.length, 4);
    assert.deepEqual(track.points[0], [48, 11]);
    assert.equal(track.startTime?.toISOString(), "2025-03-01T08:00:00.000Z");
    assert.ok(Math.abs(track.distanceMeters - 33.4) < 0.5, `length ${track.distanceMeters}`);
    assert.deepEqual(
      track.elevations.map(([, ele]) => ele),
      [500, 502, 504]
    );
  });

  it("thins points closer than the spacing but always keeps the last one", () => {
    const track = parseGpx(GPX, 20);

    assert.deepEqual(track.points, [
      [48, 11],
      [48.0002, 11],
      [48.0003, 11],
    ]);
    assert.ok(track.distanceMeters > 33, "length is measured on all points");
  });

  it("returns an empty track for a file without points", () => {
    assert.deepEqual(parseGpx("<gpx></gpx>", 8).points, []);
  });
});
