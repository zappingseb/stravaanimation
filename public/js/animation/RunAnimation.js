import { cumulativeLengths, pointAlong } from "./geometry.js";

// One run drawn progressively at constant speed: the line grows behind a runner dot
// (the dot can be left out when many runs are on the map at once).
// When the run is complete it moves from the per-frame canvas to the finished one.
export class RunAnimation {
  constructor(activity, startAt, durationMs, mapView, { withDot = true } = {}) {
    this.withDot = withDot;
    this.activity = activity;
    this.startAt = startAt;
    this.durationMs = durationMs;
    this.mapView = mapView;
    this.lengths = cumulativeLengths(activity.coordinates);
    this.state = "pending"; // pending -> running -> done
    this.line = null;
    this.dot = null;
    this.drawnIndex = 0; // last route point already part of the line
  }

  get totalLength() {
    return this.lengths[this.lengths.length - 1];
  }

  start() {
    const first = this.activity.coordinates[0];
    this.state = "running";
    this.line = this.mapView.addActiveRoute(first);
    this.dot = this.withDot ? this.mapView.addRunnerDot(first) : null;
  }

  /** @param progress 0..1 */
  advance(progress) {
    const coords = this.activity.coordinates;
    const { index, position } = pointAlong(coords, this.lengths, progress * this.totalLength);

    // Append only the new points instead of rebuilding the line every frame.
    const latlngs = this.line.getLatLngs();
    if (latlngs.length > 1) latlngs.pop(); // last frame's interpolated tip
    while (this.drawnIndex < index) {
      this.drawnIndex++;
      latlngs.push(L.latLng(coords[this.drawnIndex]));
    }
    latlngs.push(L.latLng(position));
    this.line.setLatLngs(latlngs);
    this.dot?.setLatLng(position);
  }

  finish() {
    this.state = "done";
    this.removeActiveLayers();
    this.mapView.addFinishedRoute(this.activity.coordinates);
  }

  /** Removes what a run in progress has on the map (when the animation is stopped). */
  cancel() {
    if (this.state === "running") this.removeActiveLayers();
    this.state = "done";
  }

  removeActiveLayers() {
    this.mapView.removeLayer(this.line);
    if (this.dot) this.mapView.removeLayer(this.dot);
    this.line = null;
    this.dot = null;
  }
}
