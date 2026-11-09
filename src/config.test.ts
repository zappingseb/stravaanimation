import assert from "node:assert/strict";
import { describe, it } from "node:test";

// config.ts reads the environment on import, so it is loaded after setting it.
process.env.STRAVA_EXPORT_DIR = "/tmp/my-export";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { apiConfig, appConfig } = require("./config") as typeof import("./config");

describe("appConfig", () => {
  it("takes the export folder from STRAVA_EXPORT_DIR", () => {
    assert.equal(appConfig.data.exportDir, "/tmp/my-export");
  });
});

describe("apiConfig", () => {
  it("gives the browser the area with the map settings", () => {
    const config = apiConfig();
    assert.equal(config.map.centerLat, appConfig.animation.centerLat);
    assert.equal(config.map.radiusMeters, appConfig.animation.radiusMeters);
    assert.equal(config.map.tileUrl, appConfig.map.tileUrl);
  });

  it("does not expose where the export lives", () => {
    assert.equal("data" in apiConfig(), false);
  });
});
