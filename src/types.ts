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
  film: FilmConfig;
  sound: SoundConfig;
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
  film: FilmStats;
}

export interface ApiConfig extends TextConfig {
  film: Omit<FilmConfig, "photoDir">;
  animation: AnimationConfig;
  map: MapConfig & {
    centerLat: number;
    centerLng: number;
    radiusMeters: number;
  };
}

/** Settings of the year film: what the export cannot know (names, photos, weather). */
export interface FilmConfig {
  /** IANA time zone for start hours, days and months, e.g. "Europe/Berlin" */
  timeZone: string;
  /** Length of the city-track part of the film */
  citySeconds: number;
  /** Length of every stat scene, including the hold at its end */
  sceneSeconds: number;
  /** How long the finished scene stays before the next transition */
  holdSeconds: number;
  /** Counters start this share of their final value away from it instead of at zero (0.15: 1,700 -> 2,000) */
  counterStartShare: number;
  /** The most-run spot ignores this many meters around every run's start and end (keeps home off the screen) */
  hotspotMinMetersFromStart: number;
  /** Activity type in the export's language -> name on screen */
  sportNames: Record<string, string>;
  /** Activity types whose climb does not count as "climbed" (lifts) */
  elevationExcludedTypes: string[];
  /** A numbered series of activities: the name contains a keyword and "#<number>" */
  series: { label: string; caption: string; keywords: string[]; highlightKeyword: string };
  /** Pins of the "beyond the city" map */
  places: { name: string; lat: number; lng: number; highlight?: boolean }[];
  placesHeadline: string;
  /** The export has no weather; the temperature comes from a weather archive. */
  coldest: { name: string; date: string; temperatureC: number } | null;
  hottest: { name: string; date: string; temperatureC: number } | null;
  /** Scene id -> what the bubble says before the scene starts; a scene without an entry starts right away */
  titles: Record<string, string>;
  /** How long that bubble takes */
  titleSeconds: number;
  /** Sentences with placeholders: hotspot ({count}, {of}), kudos ({perDay}) */
  texts: Record<string, string>;
  /** Folder with the photos, served as /film-photos */
  photoDir: string;
  /** Scene id -> file in photoDir, optional "focus" = vertical object position 0..1 */
  photos: Record<string, { file: string; focus?: number }>;
}

export interface FilmActivity {
  name: string;
  /** ISO start time */
  date: string;
  km: number;
  /** moving time */
  seconds: number;
  /** elevation gain (m) */
  gain: number;
}

/** Everything the stat scenes of the year film show (GET /api/film). */
export interface FilmStats {
  year: number;
  daysInYear: number;
  /** Most visited ~100 m cell of the drawn runs */
  hotspot: { lat: number; lng: number; count: number; of: number } | null;
  /** Starts per local hour (counted activity types) */
  startHours: number[];
  fastest: FilmActivity | null;
  longest: (FilmActivity & { route: [number, number][] }) | null;
  /** Days of the year (1-based) with at least one activity of any type */
  activeDays: number[];
  streak: { days: number; firstDay: number };
  /** Kudos given; null when the export has no reactions.csv */
  kudos: number | null;
  /** km per month and in total (counted activity types) */
  monthsKm: number[];
  totalKm: number;
  /** km per activity type, largest first, on-screen names */
  sports: { name: string; km: number }[];
  highest: { name: string; meters: number; profile: number[] } | null;
  hilliest: (FilmActivity & { profile: number[]; route: [number, number][] }) | null;
  elevation: { total: number; months: number[] };
  series: { number: string; date: string; km: number; gain: number; highlight: boolean }[];
  lastRun: (FilmActivity & { kmBefore: number }) | null;
}

/** Sound of the recorded film (npm run sound): music, generated effects, announcer lines and when they play. */
export interface SoundConfig {
  /** Generated sounds are kept here and reused until their text changes */
  assetDir: string;
  /** Loudness of the finished mix (LUFS); -14 is what YouTube plays at */
  targetLufs: number;
  music: {
    /** Empty = no music; music shorter than the film starts again */
    file: string;
    /** Start this far into the music file */
    startSeconds: number;
    gainDb: number;
    fadeOutSeconds: number;
    /** The music gives way while the announcer speaks */
    duck: { threshold: number; ratio: number; attackMs: number; releaseMs: number };
  };
  voice: {
    /** ElevenLabs voice */
    voiceId: string;
    model: string;
    /** Put in front of every line, e.g. "[excited]" */
    style: string;
    gainDb: number;
  };
  /** Sound effects by name: a description for the generator and the length */
  effects: Record<string, { prompt: string; seconds: number; gainDb?: number }>;
  cues: SoundCue[];
}

/** One sound at one moment of the film. */
export interface SoundCue {
  /**
   * Film segment: a scene ("kudos"), a transition ("days>kudos"), a title bubble ("intro:kudos"), "city",
   * or "transition" / "intro" for every transition / title bubble without its own cue
   */
  at: string;
  /** Seconds after the segment starts */
  offset?: number;
  /** Name of an effect ... */
  effect?: string;
  /** ... or a line for the announcer */
  say?: string;
  gainDb?: number;
  /** Play the effect several times */
  repeat?: { count: number; everySeconds: number };
}

/** Where every part of a recorded film starts (written next to the video by npm run record). */
export interface FilmTimeline {
  seconds: number;
  segments: { id: string; start: number; seconds: number }[];
}
