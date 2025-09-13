import express, { Request, Response } from "express";
import cors from "cors";
import axios from "axios";
import mongoose, { Schema } from "mongoose";
import session from "express-session";
import MongoStore from "connect-mongo";
import path from "path";
import { config as dotenvConfig } from "dotenv";
import config from "../config.json";
import {
  AppConfig,
  StravaConfig,
  StravaTokenResponse,
  StravaActivity,
  StravaDetailedActivity,
  IUser,
  IActivity,
  ProcessedActivity,
  AuthStatus,
  SyncResult,
  ApiConfig,
} from "./types";

dotenvConfig();

const app = express();
const PORT = process.env.PORT || 3000;

// Type the config
const appConfig = config as AppConfig;

// Strava configuration from environment variables
const stravaConfig: StravaConfig = {
  clientId: process.env.STRAVA_CLIENT_ID!,
  clientSecret: process.env.STRAVA_CLIENT_SECRET!,
  redirectUri: appConfig.strava.redirectUri,
};

// Validate required environment variables
if (!stravaConfig.clientId || !stravaConfig.clientSecret) {
  console.error("ERROR: STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET must be set in .env file");
  process.exit(1);
}

// Middleware
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:8080"],
    credentials: true,
  })
);
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "fallback-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI || appConfig.database.mongoUri,
    }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 }, // 24 hours
  })
);

// MongoDB connection
mongoose.connect(process.env.MONGO_URI || appConfig.database.mongoUri);

// Schemas
const ActivitySchema = new Schema<IActivity>({
  stravaId: { type: Number, required: true },
  name: { type: String, required: true },
  date: { type: Date, required: true },
  distance: { type: Number, required: true },
  coordinates: { type: [[Number]], required: true }, // [lat, lng] pairs
  userId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const UserSchema = new Schema<IUser>({
  stravaId: { type: Number, required: true },
  accessToken: { type: String, required: true },
  refreshToken: { type: String, required: true },
  tokenExpiresAt: { type: Date, required: true },
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const Activity = mongoose.model<IActivity>("Activity", ActivitySchema);
const User = mongoose.model<IUser>("User", UserSchema);

// Helper function to check if point is within radius
function isWithinRadius(lat1: number, lng1: number, lat2: number, lng2: number, radiusMeters: number): boolean {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c;
  return distance <= radiusMeters;
}

// Helper function to refresh Strava token
async function refreshStravaToken(user: IUser): Promise<string> {
  try {
    const response = await axios.post<StravaTokenResponse>("https://www.strava.com/oauth/token", {
      client_id: stravaConfig.clientId,
      client_secret: stravaConfig.clientSecret,
      refresh_token: user.refreshToken,
      grant_type: "refresh_token",
    });

    user.accessToken = response.data.access_token;
    user.refreshToken = response.data.refresh_token;
    user.tokenExpiresAt = new Date(response.data.expires_at * 1000);
    await user.save();

    return user.accessToken;
  } catch (error) {
    console.error("Token refresh failed:", (error as any).response?.data);
    throw error;
  }
}

// Simple polyline decoder
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

// Routes

// Debug route to check file structure
app.get("/debug", (req: Request, res: Response) => {
  const fs = require("fs");
  const publicPath = path.join(__dirname, "../public");
  try {
    const files = fs.readdirSync(publicPath);
    return res.json({
      publicPath,
      files,
      indexExists: fs.existsSync(path.join(publicPath, "index.html")),
    });
  } catch (error) {
    return res.json({
      error: "Cannot read public directory",
      publicPath,
      message: (error as Error).message,
    });
  }
});

// Check authentication status
app.get("/api/auth/status", async (req: Request, res: Response<AuthStatus>) => {
  if (!req.session.userId) {
    return res.json({ authenticated: false });
  }

  try {
    const user = await User.findOne({ stravaId: req.session.userId });
    if (!user) {
      return res.json({ authenticated: false });
    }

    // Check if token needs refresh
    if (user.tokenExpiresAt < new Date()) {
      try {
        await refreshStravaToken(user);
      } catch (error) {
        return res.json({ authenticated: false });
      }
    }

    return res.json({
      authenticated: true,
      user: {
        name: user.name,
        stravaId: user.stravaId,
      },
    });
  } catch (error) {
    return res.json({ authenticated: false });
  }
});

// Initiate Strava OAuth
app.get("/auth/strava", (req: Request, res: Response) => {
  const authUrl = `https://www.strava.com/oauth/authorize?client_id=${
    stravaConfig.clientId
  }&response_type=code&redirect_uri=${encodeURIComponent(
    stravaConfig.redirectUri
  )}&approval_prompt=force&scope=read,activity:read`;
  res.redirect(authUrl);
});

// Strava OAuth callback
app.get("/auth/strava/callback", async (req: Request, res: Response) => {
  const { code } = req.query;

  if (!code || typeof code !== "string") {
    return res.redirect("/?error=no_code");
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await axios.post<StravaTokenResponse>("https://www.strava.com/oauth/token", {
      client_id: stravaConfig.clientId,
      client_secret: stravaConfig.clientSecret,
      code: code,
      grant_type: "authorization_code",
    });

    const { access_token, refresh_token, expires_at, athlete } = tokenResponse.data;

    // Save or update user
    let user = await User.findOne({ stravaId: athlete.id });
    if (!user) {
      user = new User({
        stravaId: athlete.id,
        name: `${athlete.firstname} ${athlete.lastname}`,
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpiresAt: new Date(expires_at * 1000),
      });
    } else {
      user.accessToken = access_token;
      user.refreshToken = refresh_token;
      user.tokenExpiresAt = new Date(expires_at * 1000);
    }

    await user.save();

    // Set session
    req.session.userId = athlete.id;

    res.redirect("/?authenticated=true");
  } catch (error) {
    console.error("OAuth error:", (error as any).response?.data);
    res.redirect("/?error=oauth_failed");
  }
});

// Logout
app.post("/api/auth/logout", (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Session destroy error:", err);
    }
  });
  return res.json({ success: true });
});

// Fetch and cache activities
app.post("/api/activities/sync", async (req: Request, res: Response<SyncResult | { error: string }>) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const user = await User.findOne({ stravaId: req.session.userId });
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Refresh token if needed
    let accessToken = user.accessToken;
    if (user.tokenExpiresAt < new Date()) {
      accessToken = await refreshStravaToken(user);
    }

    const startDate = new Date(appConfig.animation.startDate);
    const endDate = new Date(appConfig.animation.endDate);

    let page = 1;
    let allActivities: StravaActivity[] = [];

    while (true) {
      const response = await axios.get<StravaActivity[]>("https://www.strava.com/api/v3/athlete/activities", {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          before: Math.floor(endDate.getTime() / 1000),
          after: Math.floor(startDate.getTime() / 1000),
          page: page,
          per_page: 200,
        },
      });

      if (response.data.length === 0) break;

      allActivities = allActivities.concat(response.data);
      page++;
    }

    // Filter running activities and process
    const runningActivities = allActivities.filter((activity) => activity.type === "Run" && activity.start_latlng);

    let syncedCount = 0;

    for (const activity of runningActivities) {
      try {
        // Check if activity starts within our radius
        const startLatlng = activity.start_latlng;
        if (!startLatlng) continue;

        const [startLat, startLng] = startLatlng;
        if (
          !isWithinRadius(
            startLat,
            startLng,
            appConfig.animation.centerLat,
            appConfig.animation.centerLng,
            appConfig.animation.radiusMeters
          )
        ) {
          continue;
        }

        // Check if already cached
        const existing = await Activity.findOne({ stravaId: activity.id });
        if (existing) continue;

        // Get detailed activity with coordinates
        const detailResponse = await axios.get<StravaDetailedActivity>(
          `https://www.strava.com/api/v3/activities/${activity.id}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        const detailData = detailResponse.data;

        if (!detailData.map || !detailData.map.polyline) continue;

        // Decode polyline
        const coordinates = decodePolyline(detailData.map.polyline);

        const newActivity = new Activity({
          stravaId: activity.id,
          name: activity.name,
          date: new Date(activity.start_date),
          distance: activity.distance,
          coordinates: coordinates,
          userId: user.stravaId.toString(),
        });

        await newActivity.save();
        syncedCount++;
      } catch (activityError) {
        console.error(`Error processing activity ${activity.id}:`, activityError);
        // Continue with next activity
      }
    }

    return res.json({
      success: true,
      syncedCount,
      totalActivities: runningActivities.length,
    });
  } catch (error) {
    console.error("Sync error:", (error as any).response?.data || (error as any).message);
    return res.status(500).json({ error: "Sync failed" });
  }
});

// Get activities for animation
app.get("/api/activities", async (req: Request, res: Response<ProcessedActivity[] | { error: string }>) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const activities = await Activity.find({
      userId: req.session.userId.toString(),
    }).sort({ date: 1 });

    console.log(`Found ${activities.length} activities for user`);

    // Calculate cumulative distances
    let cumulativeDistance = 0;

    function onlyUnique(value: IActivity, index: number, array: IActivity[]) {
      return array.map((x) => x.stravaId).indexOf(value.stravaId) === index;
    }

    const processedActivities: ProcessedActivity[] = activities.filter(onlyUnique).map((activity) => {
      cumulativeDistance += activity.distance;
      return {
        id: activity.stravaId,
        name: activity.name,
        date: activity.date,
        distance: activity.distance,
        cumulativeDistance: Math.round((cumulativeDistance / 1000) * 10) / 10, // km with 1 decimal
        coordinates: activity.coordinates,
      };
    });

    return res.json(processedActivities);
  } catch (error) {
    console.error("Activities fetch error:", error);
    return res.status(500).json({ error: "Failed to fetch activities" });
  }
});

// Get config for frontend
app.get("/api/config", (req: Request, res: Response<ApiConfig>) => {
  return res.json({
    animation: appConfig.animation,
    map: {
      centerLat: appConfig.animation.centerLat,
      centerLng: appConfig.animation.centerLng,
      radiusMeters: appConfig.animation.radiusMeters,
    },
  });
});

// Serve Vue app - catch all routes for SPA (MUST BE LAST!)
app.get("*", (req: Request, res: Response) => {
  // Only return 404 for API routes that don't exist
  if (req.path.startsWith("/api/") || req.path.startsWith("/auth/") || req.path === "/debug") {
    return res.status(404).json({ error: "Route not found" });
  }

  // Serve index.html for all other routes (including root "/")
  const indexPath = path.join(__dirname, "../public", "index.html");
  console.log("Serving index.html from:", indexPath, "for path:", req.path);

  // Add cache-busting headers for development
  res.set({
    "Cache-Control": "no-cache, no-store, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  });

  return res.sendFile(indexPath, (err) => {
    if (err) {
      console.error("Error serving index.html:", err);
      return res.status(500).send("Error loading page");
    }
    return;
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Static files served from: ${path.join(__dirname, "../public")}`);
  console.log(`Index file path: ${path.join(__dirname, "../public", "index.html")}`);

  // Check if index.html exists
  const fs = require("fs");
  const indexPath = path.join(__dirname, "../public", "index.html");
  if (fs.existsSync(indexPath)) {
    console.log("✅ index.html found");
  } else {
    console.log("❌ index.html NOT found");
  }
});
