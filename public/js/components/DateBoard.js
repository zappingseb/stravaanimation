import { FlapBoard } from "./FlapBoard.js";

// "JAN 01" in the top left corner.
export const DateBoard = {
  name: "DateBoard",
  components: { FlapBoard },
  props: {
    isoDate: { type: String, required: true },
  },
  computed: {
    date() {
      return new Date(this.isoDate);
    },
    month() {
      return this.date.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
    },
    day() {
      return this.date.toLocaleDateString("en-US", { day: "2-digit" });
    },
  },
  template: `
    <div class="date-board">
      <flap-board :text="month" mode="LETTER" />
      <flap-board :text="day" mode="NUMBER" :ripple-offset="10" />
    </div>
  `,
};
