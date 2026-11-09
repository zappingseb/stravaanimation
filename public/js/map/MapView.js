import { BlendingCanvas } from "./BlendingCanvas.js";

const RUNNER_DOT = {
  pane: "markerPane", // SVG layer above both route canvases
  radius: 6,
  color: "#ffffff",
  weight: 2,
  fillColor: "#ff4444",
  fillOpacity: 1,
  interactive: false,
};

// The Leaflet map and everything drawn on it.
//
// Routes live on two canvases that both blend additively (see BlendingCanvas):
// - finished routes: redrawn only when a run finishes or the map moves
// - routes being drawn: redrawn every frame, but holds only the few active lines.
// One canvas for everything repainted all finished routes every frame, which dropped a
// phone (3x pixel density) to ~30 fps late in the year. `plus-lighter` adds the active
// canvas onto the finished one like "lighter" does inside a canvas; the overlay pane is
// its own stacking context, so the map tiles underneath are not brightened.
export class MapView {
  /**
   * @param mapConfig  { centerLat, centerLng, radiusMeters, tileUrl, tileAttribution, tileMaxZoom }
   * @param routeStyle { color, weight, opacity, blend: "additive" | "normal" }
   */
  constructor(elementId, mapConfig, routeStyle) {
    this.routeStyle = routeStyle;
    this.finishedRoutes = [];

    const center = [mapConfig.centerLat, mapConfig.centerLng];
    this.map = L.map(elementId, {
      center,
      zoom: 13,
      zoomSnap: 0.25, // lets fitToRoutes() use the screen well on any size
      zoomControl: false,
      boxZoom: false,
      keyboard: false,
    });
    this.tileLayer = L.tileLayer(mapConfig.tileUrl, {
      attribution: mapConfig.tileAttribution,
      maxZoom: mapConfig.tileMaxZoom,
    }).addTo(this.map);
    L.circle(center, {
      radius: mapConfig.radiusMeters,
      fill: false,
      color: "#444",
      weight: 1,
      opacity: 0.5,
      interactive: false,
    }).addTo(this.map);

    this.finishedCanvas = new BlendingCanvas({ padding: 0.5 }).addTo(this.map);
    this.activeCanvas = new BlendingCanvas({ padding: 0.5 }).addTo(this.map);
    this.activeCanvas._container.style.mixBlendMode = routeStyle.blend === "additive" ? "plus-lighter" : "normal";
  }

  isLoadingTiles() {
    return this.tileLayer.isLoading();
  }

  /** Zoom so every route is visible, leaving room for the date (top) and km (bottom) boards. */
  fitToRoutes(activities) {
    const bounds = L.latLngBounds([]);
    for (const activity of activities) {
      for (const point of activity.coordinates) bounds.extend(point);
    }
    if (!bounds.isValid()) return;
    const boardHeight = Math.min(90, window.innerHeight * 0.12);
    this.map.fitBounds(bounds, { paddingTopLeft: [16, boardHeight], paddingBottomRight: [16, boardHeight] });
  }

  addActiveRoute(start) {
    return L.polyline([start], this.polylineOptions(this.activeCanvas)).addTo(this.map);
  }

  addRunnerDot(position) {
    return L.circleMarker(position, RUNNER_DOT).addTo(this.map);
  }

  addFinishedRoute(coordinates) {
    const route = L.polyline(coordinates, this.polylineOptions(this.finishedCanvas)).addTo(this.map);
    this.finishedRoutes.push(route);
    return route;
  }

  removeLayer(layer) {
    this.map.removeLayer(layer);
  }

  clearRoutes() {
    this.finishedRoutes.forEach((route) => this.map.removeLayer(route));
    this.finishedRoutes = [];
  }

  zoomIn() {
    this.map.zoomIn();
  }

  zoomOut() {
    this.map.zoomOut();
  }

  polylineOptions(renderer) {
    const { color, weight, opacity, blend } = this.routeStyle;
    return { renderer, color, weight, opacity, blend, lineCap: "round", lineJoin: "round", interactive: false };
  }
}
