import { Painter } from "./Painter.js";

const FONTS = [
  '400 16px "Space Grotesk"',
  '500 16px "Space Grotesk"',
  '700 16px "Space Grotesk"',
  '400 16px "Space Mono"',
  '700 16px "Space Mono"',
];

// Plays a part of the Film on the canvas above the map: one requestAnimationFrame loop,
// every frame is film.frameAt(part, elapsed).
export class FilmPlayer {
  /** @param mapElement enlarged by scenes that zoom into the map (frame.mapZoom) */
  constructor(canvas, mapElement) {
    this.mapElement = mapElement;
    this.images = new Map();
    this.painter = new Painter(canvas, this.images);
    this.frameHandle = null;
    this.resolvePlay = null;
    this.onResize = () => this.painter.resize();
    window.addEventListener("resize", this.onResize);
  }

  /** Fonts and photos; a missing photo leaves an empty circle. */
  async load(photos) {
    const fonts = FONTS.map((font) => document.fonts.load(font).catch(() => null));
    const images = Object.entries(photos).map(
      ([key, { file, focus }]) =>
        new Promise((resolve) => {
          const image = new Image();
          image.onload = () => {
            this.images.set(key, { image, focus });
            resolve();
          };
          image.onerror = () => {
            console.warn(`Film photo not found: ${file}`);
            resolve();
          };
          image.src = `/film-photos/${encodeURIComponent(file)}`;
        }),
    );
    await Promise.all([...fonts, ...images]);
  }

  /** Design coordinates of a point of the map container (CSS pixels). */
  toDesign(point) {
    return this.painter.toDesign(point.x, point.y);
  }

  /**
   * @param part "opening" or "stats"
   * @returns resolves with true at the end of the part, with false when stop() is called
   */
  play(film, part) {
    this.stop();
    const length = film.durationMs(part);
    return new Promise((resolve) => {
      this.resolvePlay = resolve;
      const t0 = performance.now();
      const frame = (now) => {
        const elapsed = now - t0;
        this.show(film.frameAt(part, elapsed));
        if (elapsed >= length) this.finish(true);
        else this.frameHandle = requestAnimationFrame(frame);
      };
      this.frameHandle = requestAnimationFrame(frame);
    });
  }

  show(frame) {
    this.painter.paint(frame);
    this.zoomMap(frame.mapZoom);
  }

  /** Empty canvas, map back to normal. */
  clear() {
    this.show({ backdrop: 0, items: [] });
  }

  stop() {
    if (this.frameHandle) cancelAnimationFrame(this.frameHandle);
    this.finish(false);
  }

  finish(completed) {
    this.frameHandle = null;
    this.resolvePlay?.(completed);
    this.resolvePlay = null;
  }

  /** @param zoom { scale, x, y, toX, toY } in design coordinates: enlarge around (x, y) and move it to (toX, toY) */
  zoomMap(zoom) {
    const { style } = this.mapElement;
    if (!zoom || zoom.scale === 1) {
      if (style.transform) style.transform = "";
      return;
    }
    const { scale, left, top } = this.painter;
    style.transformOrigin = `${left + zoom.x * scale}px ${top + zoom.y * scale}px`;
    style.transform = `translate(${(zoom.toX - zoom.x) * scale}px, ${(zoom.toY - zoom.y) * scale}px) scale(${zoom.scale})`;
  }
}
