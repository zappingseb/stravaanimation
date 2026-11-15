import { easeIn, easeOutBack, seg } from "./ease.js";
import { C, group, isShape, isWords, morph, text } from "./items.js";

/**
 * The end of the transition into a scene: the shape that arrived for it swells into a
 * big bubble that says what the scene is about, and shrinks back into that shape.
 * Until then only the scene's shapes are there (Transition: shapesOnly); its words
 * follow the bubble.
 */
export class TitleBubble {
  static R = 122;

  constructor(scene, d) {
    this.scene = scene;
    this.d = d;
    this.title = scene.title(d);
  }

  /** A title without letters or digits is an icon ("👍") and drawn large. */
  get isIcon() {
    return !/[\p{L}\p{N}]/u.test(this.title);
  }

  /** The bubble swells where the arriving shape is, moved only as far as needed to fit the frame. */
  place(anchor) {
    const r = TitleBubble.R;
    return {
      x: Math.min(360 - r - 16, Math.max(r + 16, anchor.x)),
      y: Math.min(640 - r - 60, Math.max(r + 40, anchor.y)),
      r,
      color: C.orange,
    };
  }

  /** @param p 0..1 of the bubble's time */
  frame(p) {
    const { scene, d, title } = this;
    const start = scene.frame(0, d);
    const anchor = scene.enter(d);
    const bubble = this.place(anchor);
    const swell = easeOutBack(seg(p, 0, 0.28));
    const shrink = easeIn(seg(p, 0.78, 1));
    const words = seg(p, 0.16, 0.28) * (1 - seg(p, 0.72, 0.8));
    const twoLines = title.length > 13 && title.includes(" ");
    return {
      backdrop: start.backdrop,
      mapZoom: start.mapZoom,
      items: [
        // the shapes the transition delivered stay where they are; the words wait for the bubble to go
        ...start.items.filter(isShape),
        group(start.items.filter(isWords), { alpha: seg(p, 0.82, 1) }),
        ...(shrink > 0
          ? morph(bubble, anchor, shrink)
          : morph({ ...anchor, color: bubble.color }, bubble, Math.min(1, swell))),
        this.isIcon
          ? text(title, bubble.x, bubble.y + 32, { size: 92, align: "center", alpha: words })
          : text(title, bubble.x, bubble.y + (twoLines ? -6 : 10), {
              size: 28,
              weight: 700,
              color: C.bg,
              align: "center",
              maxWidth: 200,
              lineHeight: 32,
              alpha: words,
            }),
      ],
    };
  }
}
