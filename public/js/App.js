import { loadData } from "./api.js";
import { sleep } from "./sleep.js";
import { readUrlOptions } from "./urlOptions.js";
import { MapView } from "./map/MapView.js";
import { Timeline } from "./animation/Timeline.js";
import { Film } from "./film/Film.js";
import { FilmData } from "./film/FilmData.js";
import { FilmPlayer } from "./film/FilmPlayer.js";
import { ControlsMenu } from "./components/ControlsMenu.js";
import { DateBoard } from "./components/DateBoard.js";
import { DistanceBoard } from "./components/DistanceBoard.js";
import { DistancePopup } from "./components/DistancePopup.js";
import { HikeProfile } from "./components/HikeProfile.js";
import { IntroCard } from "./components/IntroCard.js";

const INTRO_FADE_OUT_MS = 600; // .intro transition in intro.css
const COUNTDOWN_MS = 1200; // "Let's Go!"
const RUN_POPUP_MS = 600;
const FINALE_DELAY_MS = 200;

// Phases: loading -> ready -> intro -> countdown -> playing -> stats -> finale (or error)
// "stats" (the stat scenes of the year film) and the film's own title are skipped with ?film=0.
export const App = {
  name: "App",
  components: { ControlsMenu, DateBoard, DistanceBoard, DistancePopup, HikeProfile, IntroCard },
  data() {
    return {
      phase: "loading",
      error: null,
      config: null,
      activities: [],
      hikes: [],
      summary: null,
      filmStats: null,
      filmOn: true,
      assetsReady: false,
      boardDate: "",
      boardKm: 0,
      hike: null,
      hikeVisible: false,
      hikeProgress: 0,
      popup: null,
      showControls: false,
    };
  },
  computed: {
    year() {
      return this.config.animation.startDate.slice(0, 4);
    },
    kmWidth() {
      return Math.max(5, this.summary.totalKm.toFixed(1).length);
    },
    introStats() {
      return `${this.activities.length} runs · ${this.hikes.length} hikes`;
    },
    isPlaying() {
      return ["intro", "countdown", "playing", "stats"].includes(this.phase);
    },
    /** The film canvas covers the map: the boards step back. */
    isFilmScene() {
      return this.filmOn && ["intro", "stats", "finale"].includes(this.phase);
    },
  },
  async mounted() {
    // Leaflet objects stay out of Vue's reactivity on purpose.
    this.urlOptions = readUrlOptions();
    this.mapView = null;
    this.timeline = null;
    this.filmPlayer = null;
    this.film = null;
    this.filmOn = this.urlOptions.film;
    this.showControls = this.urlOptions.controls;
    this.exposeHooks();

    try {
      await this.load();
    } catch (error) {
      console.error("Startup failed:", error);
      this.fail(error.message);
      return;
    }
    if (this.urlOptions.autoplay) this.play();
  },
  methods: {
    async load() {
      Object.assign(this, await loadData());
      if (this.activities.length === 0) throw new Error("No runs found for the configured period and area.");

      this.resetBoards();
      this.phase = "ready";
      await this.$nextTick(); // #map exists once the stage is rendered

      // In the film the city tracks have a fixed length; URL parameters still win.
      const pacing = this.filmOn ? Film.cityPacing(this.config.film, this.activities) : {};
      const animation = { ...this.config.animation, ...pacing, ...this.urlOptions.animation };
      this.mapView = new MapView("map", this.config.map, {
        color: animation.routeColor,
        weight: animation.routeWeight,
        opacity: animation.routeOpacity,
        blend: animation.routeBlend,
      });
      this.mapView.fitToRoutes(this.activities);
      this.timeline = new Timeline(this.mapView, animation, this);
      if (this.filmOn) await this.loadFilm();
      this.assetsReady = true;
    },

    async loadFilm() {
      this.filmPlayer = new FilmPlayer(this.$refs.film, document.getElementById("map"));
      await this.filmPlayer.load(this.config.film.photos);
      this.film = new Film(
        new FilmData({
          config: this.config,
          stats: this.filmStats,
          activities: this.activities,
          cityPoint: (latLng) => this.filmPlayer.toDesign(this.mapView.containerPoint(latLng)),
        }),
      );
    },

    /** For scripts (npm run record): watch the phase, start the animation. */
    exposeHooks() {
      window.runnerAnimation = {
        status: () => ({
          phase: this.phase,
          error: this.error,
          tilesLoading: !this.assetsReady || (this.mapView?.isLoadingTiles() ?? true),
        }),
        play: () => this.play(),
        /** Still frame of the film for checking a scene: part "opening" or "stats", ms from its start. */
        showFilmFrame: (part, ms) => this.filmPlayer.show(this.film.frameAt(part, ms)),
        filmSegments: (part) => this.film?.segmentList(part) ?? [],
      };
    },

    fail(message) {
      this.error = message;
      this.phase = "error";
    },

    async play() {
      if (this.isPlaying) return;
      this.stopAll();
      this.mapView.clearRoutes();
      this.resetBoards();

      if (this.filmOn) {
        this.phase = "intro";
        if (!(await this.filmPlayer.play(this.film, "opening"))) return;
        this.filmPlayer.show(this.film.cityFrame());
      } else {
        await this.playIntro();
        this.phase = "countdown";
        this.showPopup("Let's Go!", COUNTDOWN_MS);
        await sleep(COUNTDOWN_MS);
      }

      this.phase = "playing";
      // The film shows the hikes in its mountain scenes instead of as overlays on the city.
      const completed = await this.timeline.play(this.activities, this.filmOn ? [] : this.hikes);
      if (!completed) return;
      if (this.filmOn) {
        this.advanceDate(this.config.animation.endDate);
        this.phase = "stats";
        if (!(await this.filmPlayer.play(this.film, "stats"))) return;
        this.phase = "finale"; // the film's own end screen stays on the canvas
        return;
      }
      // Includes counted activities after the last drawn one (e.g. a run outside the area on Dec 31).
      this.advanceKm(this.summary.totalKm);
      await sleep(FINALE_DELAY_MS);
      this.phase = "finale";
    },

    async playIntro() {
      const seconds = this.urlOptions.intro ? this.config.intro.seconds : 0;
      if (seconds <= 0) return;
      this.phase = "intro";
      await sleep(seconds * 1000);
      this.phase = "countdown";
      await sleep(INTRO_FADE_OUT_MS);
    },

    stopAll() {
      this.timeline.stop();
      this.filmPlayer?.stop();
      this.filmPlayer?.clear();
    },

    showAllRoutes() {
      this.stopAll();
      this.mapView.clearRoutes();
      this.activities.forEach((activity) => this.mapView.addFinishedRoute(activity.coordinates));
      this.advanceDate(this.activities[this.activities.length - 1].date);
      this.advanceKm(this.summary.totalKm);
      this.phase = "ready";
    },

    clearRoutes() {
      this.stopAll();
      this.mapView.clearRoutes();
      this.resetBoards();
      this.phase = "ready";
    },

    resetBoards() {
      this.boardDate = this.config.animation.startDate;
      this.boardKm = 0;
    },

    // Queued hikes can be shown after later runs started, so both boards only move forward.
    advanceDate(isoDate) {
      if (isoDate > this.boardDate) this.boardDate = isoDate;
    },
    advanceKm(km) {
      if (km > this.boardKm) this.boardKm = km;
    },

    showPopup(text, holdMs) {
      this.popup = { id: (this.popup?.id ?? 0) + 1, text, holdMs };
    },

    // Timeline listener

    onRunStart(activity) {
      this.advanceDate(activity.date);
      this.advanceKm(activity.cumulativeDistance);
      // The popup flies in from below and would cross the hike profile.
      // In the film the runs start too fast to read it.
      if (!this.hikeVisible && !this.filmOn) this.showPopup(`+${(activity.distance / 1000).toFixed(1)}`, RUN_POPUP_MS);
    },
    onHikeStart(hike) {
      this.hike = hike;
      this.hikeProgress = 0;
      this.hikeVisible = true;
      this.advanceDate(hike.date);
      this.advanceKm(hike.cumulativeDistance);
    },
    onHikeProgress(progress) {
      this.hikeProgress = progress;
    },
    onHikeEnd() {
      this.hikeVisible = false; // keeps `hike`, so the fade-out still shows it
    },
  },
  template: `
    <div class="app" :class="{ 'with-controls': showControls }">
      <div v-if="phase === 'loading'" class="status">
        <h2>Loading your running data...</h2>
      </div>
      <div v-else-if="phase === 'error'" class="status status--error">
        <h2>Could not load runs</h2>
        <p>{{ error }}</p>
      </div>
      <div v-else class="stage" :class="{ 'is-film-scene': isFilmScene }">
        <div id="map" class="stage__map"></div>
        <div class="veil" :class="{ 'is-visible': phase === 'finale' && !filmOn }"></div>

        <date-board v-show="phase !== 'finale'" :iso-date="boardDate" />
        <distance-board :km="boardKm" :width="kmWidth" :finale="phase === 'finale' && !filmOn"
                        :kicker="config.intro.kicker" :year="year" :finale-title="config.finale.title" />
        <hike-profile :hike="hike" :progress="hikeProgress" :visible="hikeVisible" />
        <distance-popup :message="popup" />
        <canvas v-if="filmOn" ref="film" class="film"></canvas>
        <intro-card :visible="phase === 'intro' && !filmOn" :kicker="config.intro.kicker" :year="year"
                    :lines="config.intro.lines" :stats="introStats" />

        <controls-menu v-if="showControls" :playing="isPlaying"
                       @start="play" @show-all="showAllRoutes" @clear="clearRoutes"
                       @zoom-in="mapView.zoomIn()" @zoom-out="mapView.zoomOut()" />
      </div>
    </div>
  `,
};
