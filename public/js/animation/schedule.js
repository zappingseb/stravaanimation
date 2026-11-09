// Runs and hikes share one timeline in date order: item i starts at i * intervalMs.

export function buildSchedule(activities, hikes, intervalMs) {
  const items = [
    ...activities.filter((a) => a.coordinates?.length > 1).map((activity) => ({ kind: "run", item: activity })),
    ...hikes.filter((h) => h.profile?.length > 1).map((hike) => ({ kind: "hike", item: hike })),
  ].sort((a, b) => a.item.date.localeCompare(b.item.date));

  const runs = [];
  const hikeSlots = [];
  items.forEach(({ kind, item }, i) => {
    const startAt = i * intervalMs;
    if (kind === "run") runs.push({ activity: item, startAt });
    else hikeSlots.push({ hike: item, startAt });
  });
  return { runs, hikes: hikeSlots };
}

/** How long a run takes to draw: km * secondsPerKm, but at least minRunSeconds. */
export function runDurationMs(distanceMeters, { secondsPerKm, minRunSeconds }) {
  return Math.max(minRunSeconds, (distanceMeters / 1000) * secondsPerKm) * 1000;
}
