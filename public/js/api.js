async function fetchJson(url) {
  const response = await fetch(url);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || `${url}: HTTP ${response.status}`);
  return body;
}

/** Everything the app needs, loaded in parallel. */
export async function loadData() {
  const [config, activities, hikes, summary] = await Promise.all([
    fetchJson("/api/config"),
    fetchJson("/api/activities"),
    fetchJson("/api/hikes"),
    fetchJson("/api/summary"),
  ]);
  return { config, activities, hikes, summary };
}
