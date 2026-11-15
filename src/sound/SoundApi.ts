import express, { NextFunction, Request, Response, Router } from "express";
import { SoundSettings, SoundSettingsError } from "./SoundSettings";

const MAX_MUSIC = "60mb";
const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

/**
 * /api/sound: what `npm run sound` needs from the user.
 *
 *   GET /api/sound                  -> is there a soundtrack, is there a key (never the key itself)
 *   PUT /api/sound/music            -> body = the MP3 (Content-Type: audio/mpeg)
 *   PUT /api/sound/elevenlabs-key   -> body = { "apiKey": "..." }
 *
 * The two PUTs write to this computer, so they only answer requests from this computer.
 */
export class SoundApi {
  /** @param maxMusic largest soundtrack that is accepted, as express writes sizes */
  constructor(
    private readonly settings: SoundSettings,
    private readonly maxMusic = MAX_MUSIC,
  ) {}

  router(): Router {
    const router = Router();
    router.get("/", (req, res) => res.json(this.settings.status()));
    router.put(
      "/music",
      SoundApi.localOnly,
      express.raw({ type: ["audio/mpeg", "audio/mp3", "application/octet-stream"], limit: this.maxMusic }),
      (req, res) =>
        this.store(res, () => {
          if (!Buffer.isBuffer(req.body))
            throw new SoundSettingsError("Send the MP3 as the request body with Content-Type: audio/mpeg");
          this.settings.saveMusic(req.body);
        }),
    );
    router.put("/elevenlabs-key", SoundApi.localOnly, express.json({ limit: "2kb" }), (req, res) =>
      this.store(res, () => this.settings.saveApiKey(req.body?.apiKey)),
    );
    router.use(SoundApi.failed);
    return router;
  }

  /** Errors answer as JSON like the rest of the API: a body that is too large (413), a file that cannot be written (500). */
  private static failed(error: Error & { status?: number }, req: Request, res: Response, next: NextFunction): void {
    if (res.headersSent) return next(error);
    const status = error.status && error.status >= 400 ? error.status : 500;
    if (status >= 500) console.error("Sound settings failed:", error);
    res.status(status).json({ error: status >= 500 ? "The sound settings could not be stored" : error.message });
  }

  private static localOnly(req: Request, res: Response, next: NextFunction): void {
    if (LOOPBACK.has(req.socket.remoteAddress ?? "")) next();
    else res.status(403).json({ error: "Sound settings can only be changed from the computer the server runs on" });
  }

  /** Runs `save` and answers with the new status, or with HTTP 400 and the reason. */
  private store(res: Response, save: () => void): void {
    try {
      save();
      res.json(this.settings.status());
    } catch (error) {
      if (error instanceof SoundSettingsError) res.status(400).json({ error: error.message });
      else SoundApi.failed(error as Error, res.req, res, () => undefined);
    }
  }
}
