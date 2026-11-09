// URL parameters override config.json for quick experiments, e.g.
//   /?interval=0.5&secondsPerKm=0.3&opacity=0.2&color=33aaff&blend=normal
//   /?autoplay=0&intro=0&controls=1

const NUMBER_PARAMS = {
  interval: "runStartIntervalSeconds",
  secondsPerKm: "secondsPerKm",
  minRunSeconds: "minRunSeconds",
  hikeSeconds: "hikeSeconds",
  opacity: "routeOpacity",
  weight: "routeWeight",
};

export function readUrlOptions(search = window.location.search) {
  const params = new URLSearchParams(search);

  const animation = {};
  for (const [param, key] of Object.entries(NUMBER_PARAMS)) {
    const value = parseFloat(params.get(param));
    if (!Number.isNaN(value)) animation[key] = value;
  }
  if (params.has("blend")) animation.routeBlend = params.get("blend");
  if (params.has("color")) animation.routeColor = `#${params.get("color")}`;

  return {
    animation,
    autoplay: params.get("autoplay") !== "0",
    intro: params.get("intro") !== "0",
    controls: params.get("controls") === "1",
  };
}
