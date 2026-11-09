export interface DataConfig {
  /** Root of the unzipped Strava export (contains activities.csv and activities/). Env STRAVA_EXPORT_DIR wins. */
  exportDir: string;
  /** Values of the "Activity Type" CSV column to include, in the export's language (e.g. "Lauf", "Run"). */
  activityTypes: string[];
  /** Activity types shown as an elevation profile overlay instead of on the map (e.g. "Wandern", "Hike"). */
  hikeActivityTypes: string[];
  /** Activity types whose distance adds up in the "km since Jan 1st" counter, drawn or not. */
  countedActivityTypes: string[];
  /** Number of points of the hike elevation profile. */
  hikeProfileSamples: number;
  /** GPX points closer than this to the previous kept point are dropped to keep the payload small. */
  minPointSpacingMeters: number;
}

export interface AnimationConfig {
  startDate: string;
  endDate: string;
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  /** Delay between the start of one run and the start of the next. */
  runStartIntervalSeconds: number;
  /** Time a run takes to draw, per km of the run ... */
  secondsPerKm: number;
  /** ... but at least this long. */
  minRunSeconds: number;
  /** How long a hike's elevation profile is shown. Hikes do not hold up the runs. */
  hikeSeconds: number;
  routeColor: string;
  routeWeight: number;
  /** Opacity of a single route. */
  routeOpacity: number;
  /** "additive": overlapping routes add up light (red -> yellow -> white), "normal": plain alpha blending. */
  routeBlend: "additive" | "normal";
}

export interface MapConfig {
  /** Leaflet tile URL template. CARTO's dark_all now needs an API key, so the default is Esri's keyless dark gray. */
  tileUrl: string;
  tileAttribution: string;
  tileMaxZoom: number;
}

export interface TextConfig {
  intro: {
    /** Small line above the year, e.g. "My year" */
    kicker: string;
    /** Lines below the year; the 1st is drawn in the route color, the 2nd in the hike color */
    lines: string[];
    /** How long the title card stays before the animation starts (0 = no title card) */
    seconds: number;
  };
  finale: {
    /** Shown above the final km */
    title: string;
  };
}

export interface AppConfig extends TextConfig {
  data: DataConfig;
  animation: AnimationConfig;
  map: MapConfig;
}

/** A run drawn on the map. */
export interface RunActivity {
  id: string;
  name: string;
  /** ISO start time */
  date: string;
  /** meters */
  distance: number;
  /** km of all counted activities since startDate, up to and including this one */
  cumulativeDistance: number;
  /** [lat, lng], thinned */
  coordinates: [number, number][];
}

/** A hike shown as an elevation profile overlay. */
export interface HikeActivity {
  id: string;
  name: string;
  /** ISO start time */
  date: string;
  /** meters */
  distance: number;
  /** meters */
  elevationGain: number;
  /** km, see RunActivity */
  cumulativeDistance: number;
  /** elevation (m), evenly spaced by distance */
  profile: number[];
}

/** What was read from the export and why activities were left out (GET /api/summary). */
export interface LoadSummary {
  exportDir: string;
  activitiesInCsv: number;
  /** Runs of the configured types in the period */
  runsInPeriod: number;
  /** ... of which without GPS track (treadmill, manual entry) */
  noGpsFile: number;
  /** ... of which in a format that cannot be read (.fit, .tcx) */
  unsupportedFile: number;
  /** ... of which starting outside the area */
  outsideArea: number;
  /** ... the rest, drawn on the map */
  runsLoaded: number;
  hikesLoaded: number;
  countedActivities: number;
  /** Final value of the km counter */
  totalKm: number;
}

export interface LoadedExport {
  runs: RunActivity[];
  hikes: HikeActivity[];
  summary: LoadSummary;
}

export interface ApiConfig extends TextConfig {
  animation: AnimationConfig;
  map: MapConfig & {
    centerLat: number;
    centerLng: number;
    radiusMeters: number;
  };
}
