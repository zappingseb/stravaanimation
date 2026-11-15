import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readUrlOptions } from "../../public/js/urlOptions.js";

describe("readUrlOptions", () => {
  it("maps URL parameters to animation options and flags", () => {
    const options = readUrlOptions(
      "?interval=0.3&opacity=0.2&color=33aaff&blend=normal&autoplay=0&intro=0&controls=1&film=0",
    );
    assert.deepEqual(options, {
      animation: { runStartIntervalSeconds: 0.3, routeOpacity: 0.2, routeColor: "#33aaff", routeBlend: "normal" },
      autoplay: false,
      intro: false,
      controls: true,
      film: false,
    });
  });

  it("ignores numbers that do not parse", () => {
    assert.deepEqual(readUrlOptions("?interval=fast").animation, {});
  });

  it("defaults to the autoplayed film with intro and without controls", () => {
    assert.deepEqual(readUrlOptions(""), { animation: {}, autoplay: true, intro: true, controls: false, film: true });
  });
});
