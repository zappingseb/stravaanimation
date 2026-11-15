import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FilmData } from "../../../public/js/film/FilmData.js";
import { filmFixture } from "./filmFixture.js";

describe("filmFixture", () => {
  it("is film data for a small made-up year", () => {
    const d = filmFixture();
    assert.ok(d instanceof FilmData);
    assert.equal(d.year, 2025);
    assert.equal(d.runCount, 2);
  });

  it("takes other stats", () => {
    assert.equal(filmFixture({ kudos: null }).stats.kudos, null);
  });

  it("places the map center in the middle of the frame", () => {
    assert.deepEqual(filmFixture().cityPoint([48.16, 11.59]), { x: 180, y: 320 });
  });
});
