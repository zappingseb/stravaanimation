// Abstract elevation profile of a hike: an orange area and a red line that runs along
// its top edge from left to right while `progress` goes from 0 to 1.

const WIDTH = 300; // viewBox units; the SVG scales to the overlay width
const HEIGHT = 120;
const PAD_TOP = 14;
const PAD_BOTTOM = 3; // the lowest point is not glued to the bottom edge
const PAD_X = 6; // keeps the round line caps and the dot inside the viewBox
/** Flat walks should look flat: the vertical scale covers at least this many meters. */
const MIN_RANGE_METERS = 400;

let nextClipId = 0;

export const HikeProfile = {
  name: "HikeProfile",
  props: {
    hike: { type: Object, default: null },
    progress: { type: Number, default: 0 },
    visible: { type: Boolean, default: false },
  },
  data() {
    return { WIDTH, HEIGHT, clipId: `hike-profile-clip-${nextClipId++}` };
  },
  computed: {
    points() {
      const profile = this.hike?.profile ?? [];
      if (profile.length < 2) return [];
      const min = Math.min(...profile);
      const range = Math.max(Math.max(...profile) - min, MIN_RANGE_METERS);
      const usableHeight = HEIGHT - PAD_TOP;
      return profile.map((elevation, i) => ({
        x: PAD_X + (i / (profile.length - 1)) * (WIDTH - 2 * PAD_X),
        y: HEIGHT - ((elevation - min) / range) * usableHeight - PAD_BOTTOM,
      }));
    },
    linePath() {
      return this.points.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    },
    areaPath() {
      if (!this.points.length) return "";
      const first = this.points[0];
      const last = this.points[this.points.length - 1];
      return `M${first.x},${HEIGHT} ${this.linePath.replace(/^M/, "L")} L${last.x},${HEIGHT} Z`;
    },
    clipWidth() {
      return PAD_X + this.progress * (WIDTH - 2 * PAD_X);
    },
    /** Position of the dot at the tip of the red line */
    dot() {
      const points = this.points;
      if (!points.length) return { x: 0, y: HEIGHT };
      const f = this.progress * (points.length - 1);
      const i = Math.min(Math.floor(f), points.length - 2);
      const t = f - i;
      return {
        x: points[i].x + (points[i + 1].x - points[i].x) * t,
        y: points[i].y + (points[i + 1].y - points[i].y) * t,
      };
    },
  },
  template: `
    <div class="hike-profile" :class="{ 'is-visible': visible }">
      <template v-if="hike">
        <svg class="hike-profile__chart" :viewBox="'0 0 ' + WIDTH + ' ' + HEIGHT" aria-hidden="true">
          <defs>
            <clipPath :id="clipId">
              <rect x="0" y="0" :width="clipWidth" :height="HEIGHT" />
            </clipPath>
          </defs>
          <path class="hike-profile__area" :d="areaPath" />
          <path class="hike-profile__line" :d="linePath" :clip-path="'url(#' + clipId + ')'" />
          <circle class="hike-profile__dot" :cx="dot.x" :cy="dot.y" r="3.5" />
        </svg>
        <div class="hike-profile__label">
          <span class="hike-profile__gain">▲ {{ hike.elevationGain }} m</span>
          <span class="hike-profile__name">{{ hike.name }}</span>
        </div>
      </template>
    </div>
  `,
};
