// Big text in the middle of the screen ("+10.4", "Let's Go!") that flies in from below,
// stays `holdMs` and flies out upwards. A new message replaces the current one.
//
// Usage: :message="{ id, text, holdMs }" - a new id starts a new popup.

const ENTER_DELAY_MS = 50; // lets the DOM render the start position before the transition
const EXIT_MS = 100;

export const DistancePopup = {
  name: "DistancePopup",
  props: {
    message: { type: Object, default: null },
  },
  data() {
    return {
      text: "",
      phase: null, // entering -> visible -> exiting -> null
      timers: [],
    };
  },
  watch: {
    "message.id"() {
      if (this.message) this.show(this.message);
    },
  },
  beforeUnmount() {
    this.clearTimers();
  },
  methods: {
    show({ text, holdMs }) {
      this.clearTimers();
      this.text = text;
      this.phase = "entering";
      this.after(ENTER_DELAY_MS, () => (this.phase = "visible"));
      this.after(holdMs, () => {
        this.phase = "exiting";
        this.after(EXIT_MS, () => (this.phase = null));
      });
    },
    after(ms, callback) {
      this.timers.push(setTimeout(callback, ms));
    },
    clearTimers() {
      this.timers.forEach(clearTimeout);
      this.timers = [];
    },
  },
  template: `
    <div v-show="phase" class="distance-popup" :class="'is-' + phase">
      <div class="distance-popup__text">{{ text }}</div>
    </div>
  `,
};
