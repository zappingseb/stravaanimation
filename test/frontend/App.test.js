import "./helpers/fakeLeaflet.js";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { App } from "../../public/js/App.js";
import { instance } from "./helpers/render.js";

function app() {
  const vm = instance(App);
  vm.config = { animation: { startDate: "2025-01-01" }, intro: { seconds: 3.5 } };
  vm.summary = { totalKm: 1684.9 };
  vm.activities = [{}, {}];
  vm.hikes = [{}];
  vm.resetBoards();
  return vm;
}

describe("App", () => {
  it("derives year, counter width and intro stats from the data", () => {
    const vm = app();
    assert.equal(vm.year, "2025");
    assert.equal(vm.kmWidth, 6);
    assert.equal(vm.introStats, "2 runs · 1 hikes");
  });

  it("moves the boards only forward", () => {
    const vm = app();
    vm.advanceDate("2025-03-01T08:00:00Z");
    vm.advanceDate("2025-02-01T08:00:00Z"); // a queued hike shown late
    vm.advanceKm(300);
    vm.advanceKm(250);
    assert.equal(vm.boardDate, "2025-03-01T08:00:00Z");
    assert.equal(vm.boardKm, 300);
  });

  it("updates the boards and shows the distance when a run starts", () => {
    const vm = app();
    vm.onRunStart({ date: "2025-01-05T08:00:00Z", distance: 10404, cumulativeDistance: 42.1 });
    assert.equal(vm.boardDate, "2025-01-05T08:00:00Z");
    assert.equal(vm.boardKm, 42.1);
    assert.equal(vm.popup.text, "+10.4");
  });

  it("does not show run distances over a hike profile", () => {
    const vm = app();
    vm.onHikeStart({ date: "2025-01-04T08:00:00Z", cumulativeDistance: 30 });
    vm.onRunStart({ date: "2025-01-05T08:00:00Z", distance: 5000, cumulativeDistance: 35 });
    assert.equal(vm.popup, null);
    vm.onHikeEnd();
    assert.equal(vm.hikeVisible, false);
    assert.ok(vm.hike, "kept for the fade-out");
  });

  it("counts intro, countdown and playing as playing", () => {
    const vm = app();
    for (const phase of ["intro", "countdown", "playing"]) {
      vm.phase = phase;
      assert.equal(vm.isPlaying, true, phase);
    }
    vm.phase = "finale";
    assert.equal(vm.isPlaying, false);
  });

  it("shows the error screen when loading fails", () => {
    const vm = app();
    vm.fail("No runs found");
    assert.equal(vm.phase, "error");
    assert.equal(vm.error, "No runs found");
  });
});
