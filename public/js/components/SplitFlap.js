// One split-flap card. When `text` changes it flips through the character set one card
// at a time until it shows the new character; cards start with a delay of index * 50 ms
// so a row of cards ripples from left to right.

const CHARACTER_SETS = {
  NUMBER: [" ", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "."],
  LETTER: [" ", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"],
};
const RIPPLE_DELAY_MS = 50;

export const SplitFlap = {
  name: "SplitFlap",
  props: {
    index: { type: Number, required: true },
    text: { type: String, required: true },
    mode: { type: String, default: "LETTER", validator: (m) => m in CHARACTER_SETS },
  },
  data() {
    return {
      initialCharOffset: 0,
      charOffset: null, // set while flipping
    };
  },
  computed: {
    characters() {
      return CHARACTER_SETS[this.mode];
    },
    desiredLetter() {
      return (this.text || " ").toUpperCase();
    },
    desiredCharIndex() {
      const index = this.characters.indexOf(this.desiredLetter);
      return index === -1 ? this.characters.length : index;
    },
    displayedLetterIdx() {
      return this.initialCharOffset + (this.charOffset || 0);
    },
    displayedLetter() {
      const idx = this.displayedLetterIdx;
      if (idx < 0) return "?";
      if (idx === this.desiredCharIndex) return this.desiredLetter;
      if (idx >= this.characters.length) return this.characters[this.characters.length - 1];
      return this.characters[idx];
    },
    step() {
      return this.displayedLetterIdx <= this.desiredCharIndex ? 1 : -1;
    },
  },
  watch: {
    desiredLetter() {
      if (this.charOffset !== null) return; // already flipping; it will chase the new letter
      this.charOffset = 0;
      this.afterRippleDelay(() => {
        this.finishFlip();
        this.flipToNextLetter();
      });
    },
  },
  mounted() {
    this.afterRippleDelay(this.flipToNextLetter);
  },
  methods: {
    afterRippleDelay(callback) {
      setTimeout(callback, this.index * RIPPLE_DELAY_MS);
    },
    finishFlip() {
      this.initialCharOffset = this.displayedLetterIdx;
      this.charOffset = null;
    },
    flipToNextLetter() {
      if (this.displayedLetterIdx === this.desiredCharIndex) {
        this.finishFlip();
        return;
      }
      this.charOffset += this.step;
    },
  },
  template: `
    <div class="split-flap" :style="{ '--i': index }">
      <transition name="flap" @after-leave="flipToNextLetter">
        <div class="split-flap__card" :key="displayedLetter">{{ displayedLetter }}</div>
      </transition>
    </div>
  `,
};
