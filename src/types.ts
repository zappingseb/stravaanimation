import { Document } from "mongoose";

export interface AppConfig {
  strava: {
    redirectUri: string;
  };
  animation: {
    startDate: string;
    endDate: string;
    centerLat: number;
    centerLng: number;
    radiusMeters: number;
    animationDurationSeconds: number;
  };
  database: {
    mongoUri: string;
  };
}

export interface StravaConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete: {
    id: number;
    firstname: string;
    lastname: string;
  };
}

export interface StravaActivity {
  id: number;
  name: string;
  type: string;
  start_date: string;
  start_latlng: [number, number] | null;
  distance: number;
  map?: {
    polyline?: string;
  };
}

export interface StravaDetailedActivity extends StravaActivity {
  map: {
    polyline: string;
  };
}

export interface IUser extends Document {
  stravaId: number;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date;
  name: string;
  createdAt: Date;
}

export interface IActivity extends Document {
  stravaId: number;
  name: string;
  date: Date;
  distance: number;
  coordinates: [number, number][];
  userId: string;
  createdAt: Date;
}

export interface ProcessedActivity {
  id: number;
  name: string;
  date: Date;
  distance: number;
  cumulativeDistance: number;
  coordinates: [number, number][];
}

export interface AuthStatus {
  authenticated: boolean;
  user?: {
    name: string;
    stravaId: number;
  };
}

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  totalActivities: number;
}

export interface ApiConfig {
  animation: AppConfig["animation"];
  map: {
    centerLat: number;
    centerLng: number;
    radiusMeters: number;
  };
}

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}
