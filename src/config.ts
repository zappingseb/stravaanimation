import { config as loadDotenv } from "dotenv";
import configJson from "../config.json";
import { ApiConfig, AppConfig } from "./types";

loadDotenv();

/** config.json, with the export folder from STRAVA_EXPORT_DIR when set. */
export const appConfig: AppConfig = {
  ...(configJson as AppConfig),
  data: {
    ...(configJson as AppConfig).data,
    exportDir: process.env.STRAVA_EXPORT_DIR || configJson.data.exportDir,
  },
};

/** The part of the configuration the browser needs. */
export function apiConfig(): ApiConfig {
  const { animation, intro, finale, map } = appConfig;
  const { centerLat, centerLng, radiusMeters } = animation;
  return { animation, intro, finale, map: { ...map, centerLat, centerLng, radiusMeters } };
}
