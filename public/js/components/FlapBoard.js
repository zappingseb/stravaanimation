import { SplitFlap } from "./SplitFlap.js";

// A row of split-flap cards showing `text`, one card per character.
export const FlapBoard = {
  name: "FlapBoard",
  components: { SplitFlap },
  props: {
    text: { type: String, required: true },
    mode: { type: String, default: "LETTER" }, // LETTER or NUMBER
    /** Added to each card's ripple index, to stagger boards against each other */
    rippleOffset: { type: Number, default: 0 },
    /** Ripple index step between neighbouring cards */
    rippleStep: { type: Number, default: 1 },
  },
  template: `
    <div class="flap-board">
      <split-flap v-for="(char, i) in text" :key="i"
                  :index="rippleOffset + i * rippleStep" :text="char" :mode="mode" />
    </div>
  `,
};
