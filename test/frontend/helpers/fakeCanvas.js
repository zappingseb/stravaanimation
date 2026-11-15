/**
 * A canvas whose 2d context only writes down what is drawn on it:
 * canvas.calls is a list of [method, ...arguments], properties can be read back from canvas.ctx.
 * Text is 10 px wide per character.
 */
export function fakeCanvas(clientWidth = 360, clientHeight = 640) {
  const calls = [];
  const state = {};
  const ctx = new Proxy(state, {
    get(target, name) {
      if (name in target) return target[name];
      if (name === "measureText") return (str) => ({ width: String(str).length * 10 });
      if (name === "createLinearGradient") {
        return (...args) => {
          calls.push(["createLinearGradient", ...args]);
          return { addColorStop: (...stop) => calls.push(["addColorStop", ...stop]) };
        };
      }
      return (...args) => {
        calls.push([name, ...args]);
      };
    },
  });
  return { clientWidth, clientHeight, width: 0, height: 0, calls, ctx, getContext: () => ctx };
}

/** The arguments of the recorded calls of one method; -0 is written as 0. */
export const callsOf = (canvas, method) =>
  canvas.calls.filter(([name]) => name === method).map(([, ...args]) => args.map((value) => (value === 0 ? 0 : value)));
