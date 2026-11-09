import fs from "fs";
import path from "path";
import zlib from "zlib";
import { haversineMeters, LatLng } from "../geo";

export interface Track {
  /** Thinned route, coordinates rounded to ~1 m */
  points: LatLng[];
  startTime: Date | null;
  /** Length of the full (not thinned) route */
  distanceMeters: number;
  /** [distance from start (m), elevation (m)] for every point that has an <ele> */
  elevations: [number, number][];
}

// Strava's GPX has no namespace prefixes on <trkpt>, so a regex is enough and much
// faster than a DOM parser for a year of tracks.
const TRACK_POINT = /<trkpt\b([^>]*)>([\s\S]*?)<\/trkpt>|<trkpt\b([^>]*)\/>/g;

/**
 * @param minPointSpacingMeters points closer than this to the previous kept point are
 *   dropped (keeps the payload small); the last point is always kept.
 */
export function parseGpx(xml: string, minPointSpacingMeters: number): Track {
  const points: LatLng[] = [];
  const elevations: [number, number][] = [];
  let startTime: Date | null = null;
  let distanceMeters = 0;
  let previous: LatLng | null = null;
  let lastKept: LatLng | null = null;

  for (const match of xml.matchAll(TRACK_POINT)) {
    const attributes = match[1] ?? match[3] ?? "";
    const body = match[2] ?? "";
    const point: LatLng = [numberAttribute(attributes, "lat"), numberAttribute(attributes, "lon")];
    if (Number.isNaN(point[0]) || Number.isNaN(point[1])) continue;

    startTime ??= elementDate(body, "time");
    if (previous) distanceMeters += haversineMeters(previous, point);
    const elevation = elementNumber(body, "ele");
    if (elevation !== null) elevations.push([distanceMeters, elevation]);

    if (!lastKept || haversineMeters(lastKept, point) >= minPointSpacingMeters) {
      points.push(roundPoint(point));
      lastKept = point;
    }
    previous = point;
  }
  // Always end the line where the activity ended.
  if (previous && previous !== lastKept) points.push(roundPoint(previous));

  return { points, startTime, distanceMeters, elevations };
}

/** Reads <file>.gpx or <file>.gpx.gz; returns null for missing or unsupported files (.fit, .tcx). */
export function readTrack(exportDir: string, fileName: string, minPointSpacingMeters: number): Track | null {
  const filePath = path.join(exportDir, fileName);
  if (!fs.existsSync(filePath)) return null;
  if (filePath.endsWith(".gpx")) {
    return parseGpx(fs.readFileSync(filePath, "utf8"), minPointSpacingMeters);
  }
  if (filePath.endsWith(".gpx.gz")) {
    return parseGpx(zlib.gunzipSync(fs.readFileSync(filePath)).toString("utf8"), minPointSpacingMeters);
  }
  return null;
}

function numberAttribute(attributes: string, name: string): number {
  const match = new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`).exec(attributes);
  return match ? parseFloat(match[1]!) : NaN;
}

function elementText(body: string, name: string): string | null {
  return new RegExp(`<${name}>([^<]+)</${name}>`).exec(body)?.[1] ?? null;
}

function elementNumber(body: string, name: string): number | null {
  const number = parseFloat(elementText(body, name) ?? "");
  return Number.isNaN(number) ? null : number;
}

function elementDate(body: string, name: string): Date | null {
  const text = elementText(body, name);
  return text ? new Date(text) : null;
}

/** 5 decimals are ~1 m, plenty for drawing and much smaller JSON. */
function roundPoint([lat, lng]: LatLng): LatLng {
  const round5 = (x: number) => Math.round(x * 1e5) / 1e5;
  return [round5(lat), round5(lng)];
}
