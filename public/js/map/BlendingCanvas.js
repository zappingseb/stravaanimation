// Leaflet canvas renderer that can blend routes additively ("lighter"): every pass over a
// street adds light, so its color keeps moving red -> orange -> yellow -> white with the
// number of runs. Normal alpha blending saturates at the route color after ~20 runs.
export const BlendingCanvas = L.Canvas.extend({
  _updatePoly(layer, closed) {
    this._ctx.globalCompositeOperation = layer.options.blend === "additive" ? "lighter" : "source-over";
    L.Canvas.prototype._updatePoly.call(this, layer, closed);
    this._ctx.globalCompositeOperation = "source-over";
  },
});
