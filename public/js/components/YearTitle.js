import { FlapBoard } from "./FlapBoard.js";

// "MY YEAR" above the year on split-flap cards. Opens the animation (IntroCard)
// and closes it (DistanceBoard finale) with exactly the same look.
export const YearTitle = {
  name: "YearTitle",
  components: { FlapBoard },
  props: {
    kicker: { type: String, default: "" },
    year: { type: String, required: true },
  },
  template: `
    <div class="year-title">
      <div class="year-title__kicker">{{ kicker }}</div>
      <flap-board class="year-title__year" :text="year" mode="NUMBER" :ripple-step="3" />
    </div>
  `,
};
