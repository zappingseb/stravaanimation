import { lerp } from "./ease.js";
import { C, H, W, area, circle, fitProfile, line } from "./items.js";

/** Hill silhouette of an elevation profile at the bottom of the frame, with the line a dot walks up to the summit. */
export class Hill {
  /** @param top y of the summit in the frame */
  constructor(profile, top) {
    this.points = fitProfile(profile, 0, top, W, H - 8);
    this.drawable = this.points.length >= 2;
    const summitIndex = profile.indexOf(Math.max(...profile));
    /** The way from the foot to the summit */
    this.climb = this.points.slice(0, summitIndex + 1);
    this.start = this.drawable ? { x: this.points[0][0], y: this.points[0][1] } : { x: 4, y: H - 20 };
    this.summit = this.drawable
      ? { x: this.points[summitIndex][0], y: this.points[summitIndex][1] }
      : { x: 180, y: top };
  }

  /** @param progress 0..1 of the way up; the dot walks at the tip of the line */
  items(progress, fade) {
    if (!this.drawable) return [];
    const { climb } = this;
    const at = (climb.length - 1) * Math.min(1, Math.max(0, progress));
    const [a, b] = [climb[Math.floor(at)], climb[Math.min(climb.length - 1, Math.floor(at) + 1)]];
    const tip = { x: lerp(a[0], b[0], at % 1), y: lerp(a[1], b[1], at % 1) };
    return [
      area([...this.points, [W, H + 40], [0, H + 40]], C.orange, 0.8 * fade),
      line(climb, C.red, 3, { progress }),
      circle(tip.x, tip.y, 9, C.red),
      circle(tip.x, tip.y, 6, C.white),
    ];
  }
}
