import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { instance, render, textOf } from "./render.js";

const Counter = {
  props: { start: Number },
  data() {
    return { count: this.start };
  },
  computed: {
    doubled() {
      return this.count * 2;
    },
  },
  methods: {
    increment() {
      this.count++;
      this.$emit("changed", this.count);
    },
  },
  template: `<p>Count: <b>{{ count }}</b></p>`,
};

describe("render", () => {
  it("renders a component's template with props", async () => {
    assert.equal(await render(Counter, { start: 2 }), "<p>Count: <b>2</b></p>");
  });
});

describe("textOf", () => {
  it("keeps only the text, whitespace collapsed", () => {
    assert.equal(textOf("<div><!--[--><span>a</span>\n  <b>b</b><!--]--></div>"), "a b");
  });
});

describe("instance", () => {
  it("combines props, data, live computed values and bound methods", () => {
    const vm = instance(Counter, { start: 1 });
    assert.equal(vm.doubled, 2);
    vm.increment();
    assert.equal(vm.doubled, 4);
    assert.deepEqual(vm.emitted, [["changed", 2]]);
  });
});
