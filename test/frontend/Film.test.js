import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Film } from "../../public/js/film/Film.js";
import { Transition } from "../../public/js/film/Transition.js";
import { assertDrawable } from "./helpers/drawable.js";
import { filmFixture } from "./helpers/filmFixture.js";

describe("Film", () => {
  const d = filmFixture();
  const film = new Film(d);
  const ids = (part) => film.segmentList(part).map((segment) => segment.id);

  it("opens with the title and hands over to the city", () => {
    assert.deepEqual(ids("opening"), ["title", "title>city", "intro:city"]);
    assert.equal(ids("stats")[0], "city>hotspot");
    assert.equal(ids("stats").at(-1), "finale");
  });

  it("puts a title bubble between the transition into a scene and the scene", () => {
    assert.deepEqual(
      ids("stats").filter((id) => id.includes("days")),
      ["longest>days", "intro:days", "days", "days>kudos"],
    );
  });

  it("gives a scene without a title no bubble", () => {
    assert.ok(!ids("stats").includes("intro:months"));
    assert.ok(ids("stats").includes("months"));
  });

  it("takes about two minutes with the city tracks", () => {
    const seconds = (film.durationMs("opening") + film.durationMs("stats")) / 1000 + d.film.citySeconds;
    assert.ok(seconds > 85 && seconds < 125, `${seconds} s`);
  });

  it("lists the segments with the lengths the sound is placed on", () => {
    assert.deepEqual(film.segmentList("opening"), [
      { id: "title", ms: 3500 },
      { id: "title>city", ms: Transition.MS.title },
      { id: "intro:city", ms: 1200 },
    ]);
  });

  it("leaves out scenes without data, with their transitions", () => {
    const without = new Film(filmFixture({ kudos: null, hotspot: null }));
    assert.equal(without.scene("kudos"), undefined);
    assert.equal(without.scene("hotspot"), undefined);
    assert.equal(without.segmentList("stats")[0].id, "city>earlyBird");
    assertDrawable(without.frameAt("stats", 200), "city > earlyBird");
  });

  it("can draw a frame at any time of both parts", () => {
    for (const part of ["opening", "stats"]) {
      for (let ms = 0; ms <= film.durationMs(part); ms += 700)
        assertDrawable(film.frameAt(part, ms), `${part} at ${ms}`);
    }
  });

  it("holds a finished scene still at its end", () => {
    const list = film.segmentList("stats");
    const before = list.slice(
      0,
      list.findIndex((segment) => segment.id === "hotspot"),
    );
    const start = before.reduce((sum, segment) => sum + segment.ms, 0);
    assert.deepEqual(film.frameAt("stats", start + 3500), film.frameAt("stats", start + 4400));
    assert.notDeepEqual(film.frameAt("stats", start + 2000), film.frameAt("stats", start + 3500));
  });

  it("shows the last frame after the end", () => {
    assert.deepEqual(film.frameAt("opening", 1e9), film.frameAt("opening", film.durationMs("opening")));
  });

  it("shows the caption of the city tracks while the map draws them", () => {
    assert.equal(film.cityFrame().backdrop, 0);
    assert.ok(film.cityFrame().items.some((item) => item.str === "EVERY LINE IS ONE RUN"));
  });

  it("paces the city tracks to the configured length", () => {
    const activities = Array.from({ length: 135 }, () => ({ distance: 10000 }));
    const pacing = Film.cityPacing({ citySeconds: 25 }, activities);
    assert.ok(Math.abs(pacing.runStartIntervalSeconds * 135 + 2 - 25) < 0.01);
    assert.equal(pacing.runnerDotEvery, 2);
  });

  it("paces an empty year without dividing by zero", () => {
    assert.ok(Number.isFinite(Film.cityPacing({ citySeconds: 8 }, []).runStartIntervalSeconds));
  });
});
