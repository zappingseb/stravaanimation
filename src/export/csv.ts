import fs from "fs";
import path from "path";

/** One row of activities.csv from a Strava bulk export. */
export interface CsvActivity {
  id: string;
  date: Date;
  name: string;
  type: string;
  distanceMeters: number | null;
  elevationGainMeters: number | null;
  /** Relative to the export folder, e.g. "activities/123.gpx"; empty for manual/treadmill entries */
  fileName: string;
}

// Column names differ with the language the export was made in.
const REQUIRED_COLUMNS = {
  id: ["Aktivitäts-ID", "Activity ID"],
  date: ["Aktivitätsdatum", "Activity Date"],
  name: ["Name der Aktivität", "Activity Name"],
  type: ["Aktivitätsart", "Activity Type"],
  distance: ["Distanz", "Distance"],
  fileName: ["Dateiname", "Filename"],
};
/** Optional: only used for the hike overlay label. */
const ELEVATION_GAIN_COLUMN = ["Höhenzunahme", "Elevation Gain"];

/** RFC 4180: quoted fields may contain commas, doubled quotes ("") and newlines. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Strava writes dates in UTC: "31.12.2025, 09:35:41" (de) or "Dec 31, 2025, 9:35:41 AM" (en). */
export function parseCsvDate(value: string): Date | null {
  const german = /^(\d{1,2})\.(\d{1,2})\.(\d{4}),?\s+(\d{1,2}):(\d{2}):(\d{2})$/.exec(value.trim());
  if (german) {
    const [day, month, year, hours, minutes, seconds] = german.slice(1).map(Number) as number[];
    return new Date(Date.UTC(year!, month! - 1, day!, hours!, minutes!, seconds!));
  }
  const parsed = new Date(`${value} UTC`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function readCsvActivities(exportDir: string): CsvActivity[] {
  const csvPath = path.join(exportDir, "activities.csv");
  const rows = parseCsv(fs.readFileSync(csvPath, "utf8").replace(/^﻿/, ""));
  const header = rows[0];
  if (!header) throw new Error(`${csvPath} is empty`);

  const columns = findColumns(header, csvPath);
  const activities: CsvActivity[] = [];
  for (const row of rows.slice(1)) {
    if (row.length < header.length / 2) continue; // trailing empty line
    const date = parseCsvDate(row[columns.date] ?? "");
    if (!date) {
      console.warn(`Skipping activity ${row[columns.id]}: unparseable date "${row[columns.date]}"`);
      continue;
    }
    activities.push({
      id: row[columns.id] ?? "",
      date,
      name: row[columns.name] ?? "",
      type: row[columns.type] ?? "",
      distanceMeters: parseNumber(row[columns.distance]),
      elevationGainMeters: columns.elevationGain >= 0 ? parseNumber(row[columns.elevationGain]) : null,
      fileName: row[columns.fileName] ?? "",
    });
  }
  return activities;
}

function findColumns(header: string[], csvPath: string) {
  const indexOf = (names: string[]) => header.findIndex((h) => names.includes(h.trim()));
  const lastIndexOf = (names: string[]) => header.findLastIndex((h) => names.includes(h.trim()));

  const columns = {
    id: indexOf(REQUIRED_COLUMNS.id),
    date: indexOf(REQUIRED_COLUMNS.date),
    name: indexOf(REQUIRED_COLUMNS.name),
    type: indexOf(REQUIRED_COLUMNS.type),
    // "Distance" exists twice: first in km with the locale's decimal separator ("10,40"),
    // then in meters ("10404.2"). Use the meters one.
    distance: lastIndexOf(REQUIRED_COLUMNS.distance),
    fileName: indexOf(REQUIRED_COLUMNS.fileName),
  };
  const missing = Object.entries(columns).filter(([, index]) => index < 0);
  if (missing.length > 0) {
    const names = missing.map(([name]) => name).join(", ");
    throw new Error(`${csvPath}: missing columns ${names} (header: ${header.join(" | ")})`);
  }
  return { ...columns, elevationGain: indexOf(ELEVATION_GAIN_COLUMN) };
}

function parseNumber(value: string | undefined): number | null {
  const number = parseFloat(value ?? "");
  return Number.isNaN(number) ? null : number;
}
