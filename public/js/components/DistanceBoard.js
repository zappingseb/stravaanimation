import { FlapBoard } from "./FlapBoard.js";
import { YearTitle } from "./YearTitle.js";

// km counter in the bottom right corner. In the finale it moves to the center and
// gets the year title and "DONE!" above it.
export const DistanceBoard = {
  name: "DistanceBoard",
  components: { FlapBoard, YearTitle },
  props: {
    km: { type: Number, required: true },
    /** Number of characters of the counter, so it does not grow mid-animation (0099.9 -> 1684.9) */
    width: { type: Number, required: true },
    label: { type: String, default: "km since Jan 1st" },
    finale: { type: Boolean, default: false },
    kicker: { type: String, default: "" },
    year: { type: String, default: "" },
    finaleTitle: { type: String, default: "" },
  },
  computed: {
    text() {
      return this.km.toFixed(1).padStart(this.width, "0");
    },
  },
  template: `
    <div class="distance-board" :class="{ 'is-finale': finale }">
      <template v-if="finale">
        <year-title class="distance-board__year" :kicker="kicker" :year="year" />
        <div class="distance-board__title">{{ finaleTitle }}</div>
      </template>
      <flap-board class="distance-board__km" :text="text" mode="NUMBER" :ripple-offset="30" />
      <div class="distance-board__label">{{ label }}</div>
    </div>
  `,
};
