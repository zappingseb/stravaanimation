// Renders a component to HTML with Vue's server renderer, so templates can be tested
// in Node without a browser. Lifecycle hooks like mounted() do not run.
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

export function render(component, props = {}) {
  return renderToString(createSSRApp({ render: () => h(component, props) }));
}

/** Text content of the HTML, whitespace collapsed. */
export function textOf(html) {
  return html
    .replace(/<!--.*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * A component's logic without rendering: props + data + computed + methods on one object.
 * `emitted` collects $emit calls.
 */
export function instance(component, props = {}) {
  const vm = { ...props, emitted: [] };
  vm.$emit = (event, ...args) => vm.emitted.push([event, ...args]);
  Object.assign(vm, component.data?.call(vm) ?? {});
  for (const [name, getter] of Object.entries(component.computed ?? {})) {
    Object.defineProperty(vm, name, { get: () => getter.call(vm) });
  }
  for (const [name, method] of Object.entries(component.methods ?? {})) {
    vm[name] = method.bind(vm);
  }
  return vm;
}
