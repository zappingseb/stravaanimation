import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CsvActivity } from "./csv";
import { createKmCounter } from "./kmCounter";

function activity(isoDate: string, distanceMeters: number | null): CsvActivity {
  const date = new Date(isoDate);
  return { id: isoDate, date, name: "", type: "Lauf", distanceMeters, elevationGainMeters: null, fileName: "" };
}

describe("createKmCounter", () => {
  // given out of order on purpose
  const counter = createKmCounter([
    activity("2025-01-03T08:00:00Z", 5000),
    activity("2025-01-01T08:00:00Z", 10000),
    activity("2025-01-02T08:00:00Z", null),
  ]);

  it("sums everything up to and including the date", () => {
    assert.equal(counter.kmUpTo(new Date("2025-01-01T08:00:00Z")), 10);
    assert.equal(counter.kmUpTo(new Date("2025-01-02T12:00:00Z")), 10);
    assert.equal(counter.kmUpTo(new Date("2025-01-03T08:00:00Z")), 15);
  });

  it("is 0 before the first activity", () => {
    assert.equal(counter.kmUpTo(new Date("2024-12-31T00:00:00Z")), 0);
  });

  it("knows the total and the count", () => {
    assert.equal(counter.totalKm, 15);
    assert.equal(counter.count, 3);
  });
});
