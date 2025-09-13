// Split Flap Component
export const SplitFlap = {
  name: "SplitFlap",
  template: `
                <div class="split" :style="{ '--i': index }">
                    <transition name="flap" @after-leave="afterLeave">
                        <div class="letter" :key="displayedLetter">{{ displayedLetter }}</div>
                    </transition>
                </div>
            `,
  props: {
    index: {
      type: Number,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    mode: {
      type: String,
      default: "LETTER", // LETTER or NUMBER
    },
  },
  computed: {
    characters() {
      if (this.mode === "NUMBER") {
        return [" ", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "."];
      } else {
        return [
          " ",
          "A",
          "B",
          "C",
          "D",
          "E",
          "F",
          "G",
          "H",
          "I",
          "J",
          "K",
          "L",
          "M",
          "N",
          "O",
          "P",
          "Q",
          "R",
          "S",
          "T",
          "U",
          "V",
          "W",
          "X",
          "Y",
          "Z",
        ];
      }
    },
    desiredLetter() {
      return (this.text || " ").toUpperCase();
    },
    desiredCharIndex() {
      let idx = this.characters.indexOf(this.desiredLetter);
      if (idx === -1) return this.characters.length;
      return idx;
    },
    displayedLetterIdx() {
      return this.initialCharOffset + (this.charOffset || 0);
    },
    displayedLetter() {
      if (this.displayedLetterIdx === -1 || this.displayedLetterIdx < 0) return "?";
      if (this.displayedLetterIdx >= this.characters.length) return this.characters[this.characters.length - 1];
      if (this.displayedLetterIdx === this.desiredCharIndex) return this.desiredLetter;
      return this.characters[this.displayedLetterIdx] || this.desiredLetter;
    },
    step() {
      if (this.displayedLetterIdx === -1) return 0;
      if (this.displayedLetterIdx !== -1) {
        return this.displayedLetterIdx <= this.desiredCharIndex ? 1 : -1;
      }
    },
  },
  watch: {
    desiredLetter: {
      handler() {
        if (this.charOffset != null) return;
        this.charOffset = 0;
        this.offset(() => {
          this.finishAnimation();
          this.moveNextLetter();
        });
      },
    },
  },
  data() {
    return {
      initialCharOffset: 0,
      charOffset: null,
    };
  },
  mounted() {
    this.offset(this.moveNextLetter);
  },
  methods: {
    offset(call) {
      setTimeout(call, this.index * 50);
    },
    finishAnimation() {
      this.initialCharOffset = this.displayedLetterIdx;
      this.charOffset = null;
    },
    moveNextLetter() {
      if (this.displayedLetterIdx === this.desiredCharIndex) {
        this.finishAnimation();
        return;
      }
      if (this.step === 0) return;
      this.charOffset += this.step;
    },
    afterLeave() {
      this.moveNextLetter();
    },
  },
};
