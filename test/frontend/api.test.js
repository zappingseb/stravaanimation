import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { loadData } from "../../public/js/api.js";

const realFetch = globalThis.fetch;

function stubFetch(responses) {
  globalThis.fetch = async (url) => {
    const { status = 200, body } = responses[url];
    return { ok: status < 400, status, json: async () => body };
  };
}

describe("loadData", () => {
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it("loads config, runs, hikes and summary", async () => {
    stubFetch({
      "/api/config": { body: { animation: {} } },
      "/api/activities": { body: [{ id: "1" }] },
      "/api/hikes": { body: [] },
      "/api/summary": { body: { totalKm: 1 } },
    });
    assert.deepEqual(await loadData(), {
      config: { animation: {} },
      activities: [{ id: "1" }],
      hikes: [],
      summary: { totalKm: 1 },
    });
  });

  it("fails with the server's error message", async () => {
    stubFetch({
      "/api/config": { body: {} },
      "/api/activities": { status: 500, body: { error: "Loading export failed: no activities.csv" } },
      "/api/hikes": { body: [] },
      "/api/summary": { body: {} },
    });
    await assert.rejects(loadData(), /no activities\.csv/);
  });
});
