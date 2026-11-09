import express, { Request, Response } from "express";
import path from "path";
import { apiConfig, appConfig } from "./config";
import { loadExport } from "./export/exportLoader";
import { LoadedExport } from "./types";

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "../public");

// The export is parsed on the first request; POST /api/activities/reload re-reads it.
let loaded: LoadedExport | null = null;

function getExport(): LoadedExport {
  if (!loaded) {
    const started = Date.now();
    loaded = loadExport(appConfig.data, appConfig.animation);
    console.log(`Loaded export in ${Date.now() - started} ms:`, loaded.summary);
  }
  return loaded;
}

/** Responds with a part of the loaded export, or with HTTP 500 when the export cannot be read. */
function sendFromExport(pick: (data: LoadedExport) => unknown) {
  return (req: Request, res: Response) => {
    try {
      res.json(pick(getExport()));
    } catch (error) {
      console.error("Loading export failed:", error);
      res.status(500).json({ error: `Loading export failed: ${(error as Error).message}` });
    }
  };
}

const app = express();
app.use(express.static(PUBLIC_DIR, { etag: false, maxAge: 0 }));

app.get("/api/config", (req: Request, res: Response) => res.json(apiConfig()));
app.get("/api/activities", sendFromExport((data) => data.runs));
app.get("/api/hikes", sendFromExport((data) => data.hikes));
app.get("/api/summary", sendFromExport((data) => data.summary));
app.post(
  "/api/activities/reload",
  (req, res, next) => {
    loaded = null;
    next();
  },
  sendFromExport((data) => data.summary)
);
app.get("/api/*", (req: Request, res: Response) => res.status(404).json({ error: "Route not found" }));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Strava export: ${path.resolve(appConfig.data.exportDir)}`);
});
