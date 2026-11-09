// Burger menu (start / show all routes / clear) and zoom buttons. Only rendered with ?controls=1.
export const ControlsMenu = {
  name: "ControlsMenu",
  props: {
    playing: { type: Boolean, default: false },
  },
  emits: ["start", "show-all", "clear", "zoom-in", "zoom-out"],
  data() {
    return { open: false };
  },
  methods: {
    choose(event) {
      this.open = false;
      this.$emit(event);
    },
  },
  template: `
    <div class="controls">
      <button class="controls__burger" aria-label="Menu" @click="open = !open">
        <span></span><span></span><span></span>
      </button>
      <div class="controls__menu" :class="{ 'is-open': open }">
        <button class="controls__button" :disabled="playing" @click="choose('start')">
          {{ playing ? 'Playing...' : 'Start Animation' }}
        </button>
        <button class="controls__button" :disabled="playing" @click="choose('show-all')">Show All Routes</button>
        <button class="controls__button" @click="choose('clear')">Clear Routes</button>
      </div>
      <div class="controls__zoom">
        <button class="controls__button controls__button--square" aria-label="Zoom in"
                @click="$emit('zoom-in')">+</button>
        <button class="controls__button controls__button--square" aria-label="Zoom out"
                @click="$emit('zoom-out')">-</button>
      </div>
    </div>
  `,
};
