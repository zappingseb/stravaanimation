import { YearTitle } from "./YearTitle.js";

// Title card before the animation: MY YEAR / 2025 / Running Munich / Hiking the Alps.
export const IntroCard = {
  name: "IntroCard",
  components: { YearTitle },
  props: {
    visible: { type: Boolean, default: false },
    kicker: { type: String, default: "" },
    year: { type: String, required: true },
    lines: { type: Array, default: () => [] },
    stats: { type: String, default: "" },
  },
  methods: {
    lineDelay(i) {
      return `${0.6 + i * 0.35}s`;
    },
  },
  template: `
    <div class="intro" :class="{ 'is-visible': visible }">
      <div v-if="visible" class="intro__card">
        <year-title :kicker="kicker" :year="year" />
        <div v-for="(line, i) in lines" :key="i"
             class="intro__line" :class="'intro__line--' + i"
             :style="{ animationDelay: lineDelay(i) }">{{ line }}</div>
        <div class="intro__stats">{{ stats }}</div>
      </div>
    </div>
  `,
};
