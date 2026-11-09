// A minimal stand-in for the global `L` (Leaflet) that records what the map receives.
// Import this module before any module that uses `L` at import time (BlendingCanvas).

/** Map settings as /api/config sends them */
export const mapConfig = {
  centerLat: 48.16,
  centerLng: 11.59,
  radiusMeters: 9000,
  tileUrl: "tiles/{z}/{x}/{y}",
  tileAttribution: "",
  tileMaxZoom: 16,
};

class FakeLayer {
  constructor(kind, data, options = {}) {
    this.kind = kind;
    this.options = options;
    Object.assign(this, data);
  }
  addTo(map) {
    map.layers.add(this);
    return this;
  }
}

class FakeMap {
  constructor(elementId, options) {
    this.elementId = elementId;
    this.options = options;
    this.layers = new Set();
    this.fitted = null;
    this.zoom = options.zoom;
  }
  removeLayer(layer) {
    this.layers.delete(layer);
  }
  fitBounds(bounds, options) {
    this.fitted = { bounds, options };
  }
  zoomIn() {
    this.zoom++;
  }
  zoomOut() {
    this.zoom--;
  }
  layersOf(kind) {
    return [...this.layers].filter((layer) => layer.kind === kind);
  }
}

class FakeCanvas extends FakeLayer {
  constructor(options) {
    const canvasParts = { _container: { style: {} }, _ctx: { globalCompositeOperation: "source-over" }, drawn: [] };
    super("canvas", canvasParts, options);
  }
  _updatePoly(layer) {
    this.drawn.push({ layer, composite: this._ctx.globalCompositeOperation });
  }
  static extend(methods) {
    class Extended extends FakeCanvas {}
    Object.assign(Extended.prototype, methods);
    return Extended;
  }
}

globalThis.L = {
  Canvas: FakeCanvas,
  map: (elementId, options) => new FakeMap(elementId, options),
  tileLayer: (url, options) => new FakeLayer("tiles", { url, isLoading: () => false }, options),
  circle: (center, options) => new FakeLayer("circle", { center }, options),
  circleMarker: (position, options) =>
    new FakeLayer(
      "dot",
      {
        position,
        setLatLng(p) {
          this.position = p;
        },
      },
      options
    ),
  polyline: (latlngs, options) =>
    new FakeLayer(
      "line",
      {
        latlngs: [...latlngs],
        getLatLngs() {
          return this.latlngs;
        },
        setLatLngs(next) {
          this.latlngs = next;
        },
      },
      options
    ),
  latLng: (point) => [...point],
  latLngBounds: () => ({
    points: [],
    extend(point) {
      this.points.push(point);
    },
    isValid() {
      return this.points.length > 0;
    },
  }),
};
