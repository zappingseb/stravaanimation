import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Scene } from "../../public/js/film/Scene.js";

class Probe extends Scene {
  id = "probe";

  frame(t) {
    return { backdrop: 1, items: [], t };
  }

  enter() {
    return { x: 1, y: 2, r: 3, color: "red" };
  }
}

const d = { film: { sceneSeconds: 4.5, holdSeconds: 1, titles: { probe: "Hello" } } };

describe("Scene", () => {
  it("is available, takes film.sceneSeconds and leaves by the shape it entered with", () => {
    const scene = new Probe();
    assert.equal(scene.available(d), true);
    assert.equal(scene.durationMs(d), 4500);
    assert.deepEqual(scene.exit(d), scene.enter(d));
  });

  it("reads its title from the config", () => {
    assert.equal(new Probe().title(d), "Hello");
    assert.equal(new Probe().title({ film: {} }), undefined);
  });

  it("is finished holdSeconds before its end and then stands still", () => {
    const scene = new Probe();
    assert.equal(scene.frameAfter(1750, d).t, 0.5);
    assert.equal(scene.frameAfter(3500, d).t, 1);
    assert.equal(scene.frameAfter(4500, d).t, 1);
    assert.equal(scene.frameAfter(-10, d).t, 0);
  });

  it("stays longer when it has more to read", () => {
    const scene = new Probe();
    scene.extraHoldMs = 1500;
    assert.equal(scene.durationMs(d), 6000);
    assert.equal(scene.frameAfter(3500, d).t, 1); // the animation is not slower, only the hold is longer
  });

  it("says which scene forgot its frame or entry shape", () => {
    const bare = new Scene();
    bare.id = "bare";
    assert.throws(() => bare.frame(0, d), /"bare" has no frame/);
    assert.throws(() => bare.enter(d), /"bare" has no enter/);
  });
});
