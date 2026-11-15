import { AppConfig, LoadedExport } from "../types";
import { loadExport } from "./exportLoader";

/** The parsed Strava export: read on first use and kept until reload(). */
export class ExportStore {
  private loaded: LoadedExport | null = null;

  constructor(private readonly config: Pick<AppConfig, "data" | "animation" | "film">) {}

  get(): LoadedExport {
    if (!this.loaded) {
      const started = Date.now();
      this.loaded = loadExport(this.config.data, this.config.animation, this.config.film);
      console.log(`Loaded export in ${Date.now() - started} ms:`, this.loaded.summary);
    }
    return this.loaded;
  }

  /** Forget the export; the next get() reads it again. */
  reload(): void {
    this.loaded = null;
  }
}
