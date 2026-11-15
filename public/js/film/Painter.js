import { C, H, W } from "./items.js";

const FONTS = { sans: '"Space Grotesk", sans-serif', mono: '"Space Mono", monospace' };

// Draws a frame of the film on a canvas. The 360 x 640 design space is scaled to fit
// the canvas and centered; backdrop, photos covering the frame and shades bleed to the edges.
export class Painter {
  /** @param images Map of photo key -> { image, focus } */
  constructor(canvas, images) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.images = images;
    this.resize();
  }

  resize() {
    const density = window.devicePixelRatio || 1;
    const { clientWidth: width, clientHeight: height } = this.canvas;
    this.canvas.width = Math.round(width * density);
    this.canvas.height = Math.round(height * density);
    this.scale = Math.min(width / W, height / H);
    this.left = (width - W * this.scale) / 2;
    this.top = (height - H * this.scale) / 2;
    this.density = density;
    /** The whole canvas in design coordinates */
    this.view = {
      x: -this.left / this.scale,
      y: -this.top / this.scale,
      w: width / this.scale,
      h: height / this.scale,
    };
  }

  /** Design coordinates of a point given in CSS pixels of the canvas. */
  toDesign(px, py) {
    return { x: (px - this.left) / this.scale, y: (py - this.top) / this.scale };
  }

  /** @param frame { items, backdrop: 0..1 } */
  paint(frame) {
    const { ctx, view } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const k = this.scale * this.density;
    ctx.setTransform(k, 0, 0, k, this.left * this.density, this.top * this.density);
    if (frame.backdrop > 0) {
      ctx.globalAlpha = frame.backdrop;
      ctx.fillStyle = C.bg;
      ctx.fillRect(view.x, view.y, view.w, view.h);
    }
    this.drawAll(frame.items, 1);
    ctx.globalAlpha = 1;
  }

  drawAll(items, alpha) {
    for (const item of items) {
      if (!item) continue;
      const itemAlpha = alpha * (item.alpha ?? 1);
      if (itemAlpha <= 0.003) continue;
      this.ctx.globalAlpha = itemAlpha;
      this[item.type](item, itemAlpha);
    }
  }

  group(item, alpha) {
    const { ctx } = this;
    ctx.save();
    ctx.translate(item.x, item.y);
    if (item.rot) ctx.rotate(item.rot);
    if (item.scale !== 1) ctx.scale(item.scale, item.scale);
    this.drawAll(item.items, alpha);
    ctx.restore();
  }

  circle({ x, y, r, fill }) {
    if (r <= 0) return;
    const { ctx } = this;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  ring({ x, y, r, color, width, dash }) {
    if (r <= 0) return;
    const { ctx } = this;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.setLineDash(dash ?? []);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  arc({ x, y, r, from, to, color, width }) {
    if (to <= from) return;
    const { ctx } = this;
    const turn = (f) => f * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.arc(x, y, r, turn(from), turn(to));
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.stroke();
  }

  pill({ x, y, w, h, fill }) {
    const { ctx } = this;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, Math.min(w, h) / 2);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  /** Ring filled from the bottom, like a tank. */
  tank({ x, y, r, level, color }) {
    const { ctx } = this;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = color;
    ctx.fillRect(x - r, y + r - 2 * r * level, 2 * r, 2 * r * level);
    ctx.restore();
    this.ring({ x, y, r: r - 1.5, color, width: 3 });
  }

  line({ points, color, width, progress, dash }) {
    if (points.length < 2 || progress <= 0) return;
    const { ctx } = this;
    const last = (points.length - 1) * Math.min(1, progress);
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i <= Math.floor(last); i++) ctx.lineTo(points[i][0], points[i][1]);
    const rest = last - Math.floor(last);
    if (rest > 0) {
      const [a, b] = [points[Math.floor(last)], points[Math.floor(last) + 1]];
      ctx.lineTo(a[0] + (b[0] - a[0]) * rest, a[1] + (b[1] - a[1]) * rest);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.setLineDash(dash ?? []);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  area({ points, fill }) {
    if (points.length < 3) return;
    const { ctx } = this;
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (const [x, y] of points.slice(1)) ctx.lineTo(x, y);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }

  /**
   * A split-flap card. With `next` and `flip` (0..1) it is caught mid-flip like an airport
   * board: the upper half of `char` folds down and uncovers `next`.
   */
  flap({ x, y, w, h, char, size, color, next, flip }) {
    const { ctx } = this;
    const middle = y + h / 2;
    const radius = Math.max(3, w * 0.1);
    /** One half of the card with its half of the character; squash < 1 folds it towards the middle. */
    const half = (character, upper, squash = 1, fill = C.tile) => {
      ctx.save();
      ctx.translate(0, middle);
      ctx.scale(1, squash);
      ctx.translate(0, -middle);
      ctx.beginPath();
      ctx.rect(x - 1, upper ? y - 1 : middle, w + 2, h / 2 + 1);
      ctx.clip();
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, radius);
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.font = `700 ${size}px ${FONTS.mono}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = color;
      ctx.fillText(character, x + w / 2, middle + size * 0.04);
      ctx.restore();
    };

    const flipping = next !== undefined && flip > 0 && flip < 1;
    half(flipping ? next : char, true);
    half(char, false);
    if (flipping) {
      // the falling leaf: first the old upper half, then the new lower half
      if (flip < 0.5) half(char, true, 1 - 2 * flip, "#333333");
      else half(next, false, 2 * flip - 1, "#333333");
    }
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = C.bg;
    ctx.fillRect(x, middle - 1, w, h > 60 ? 2 : 1);
  }

  setFont({ size, weight, font, spacing }) {
    this.ctx.font = `${weight ?? 400} ${size}px ${FONTS[font ?? "sans"]}`;
    this.ctx.letterSpacing = `${spacing ?? 0}px`;
  }

  text(item) {
    const { ctx } = this;
    this.setFont(item);
    ctx.textAlign = item.align;
    ctx.fillStyle = item.color;
    const lines = item.maxWidth ? this.wrap(item.str, item.maxWidth) : [item.str];
    const lineHeight = item.lineHeight ?? item.size * 1.4;
    lines.forEach((str, i) => ctx.fillText(str, item.x, item.y + i * lineHeight));

    if (item.after) {
      let x = item.x + (item.align === "left" ? ctx.measureText(item.str).width : 0);
      for (const part of item.after) {
        this.setFont({ font: item.font, ...part });
        ctx.textAlign = "left";
        ctx.fillStyle = part.color ?? item.color;
        x += part.gap ?? 8;
        ctx.fillText(part.str, x, item.y + (part.dy ?? 0));
        x += ctx.measureText(part.str).width;
      }
    }
    ctx.letterSpacing = "0px";
  }

  wrap(str, maxWidth) {
    const lines = [];
    let current = "";
    for (const word of str.split(" ")) {
      const candidate = current ? `${current} ${word}` : word;
      if (current && this.ctx.measureText(candidate).width > maxWidth) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  /** Draws the image so it covers the box, like CSS object-fit: cover. */
  drawCover(entry, x, y, w, h) {
    const { image, focus = 0.5 } = entry;
    const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight);
    const sw = w / scale;
    const sh = h / scale;
    this.ctx.drawImage(image, (image.naturalWidth - sw) / 2, (image.naturalHeight - sh) * focus, sw, sh, x, y, w, h);
  }

  photo({ key, x, y, r, border }) {
    const { ctx } = this;
    const entry = this.images.get(key);
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    if (entry) {
      this.drawCover(entry, x - r, y - r, 2 * r, 2 * r);
    } else {
      ctx.fillStyle = C.surface;
      ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
    ctx.restore();
    if (border) this.ring({ x, y, r: r - 1.5, color: border, width: 3 });
  }

  cover({ key, clip }) {
    const { ctx, view } = this;
    const entry = this.images.get(key);
    ctx.save();
    if (clip) {
      ctx.beginPath();
      ctx.arc(clip.x, clip.y, Math.max(0, clip.r), 0, Math.PI * 2);
      ctx.clip();
    }
    if (entry) {
      this.drawCover(entry, view.x, view.y, view.w, view.h);
    } else {
      ctx.fillStyle = C.surface;
      ctx.fillRect(view.x, view.y, view.w, view.h);
    }
    ctx.restore();
  }

  shade({ stops }) {
    const { ctx, view } = this;
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    for (const [position, darkness] of stops) gradient.addColorStop(position, `rgba(17, 17, 17, ${darkness})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(view.x, view.y, view.w, view.h);
  }
}
