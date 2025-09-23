const { createApp } = Vue;
import { SplitFlap } from "./SplitFlapComponent.js";
import { AnimationEngine } from "./AnimationEngine.js";
import { DisplayManager } from "./DisplayManager.js";
export const app = createApp({
  components: {
    SplitFlap,
  },
  methods: {
    async initializeApp() {
      try {
        // 1. Check authentication
        const authData = await window.mainApp.api.checkAuthStatus();

        if (authData.authenticated) {
          // 2. Set Vue state
          this.authenticated = true;

          // 3. Load config & activities
          this.config = await window.mainApp.api.loadConfig();
          this.activities = await window.mainApp.api.loadActivities();

          // 4. Initialize DisplayManager & AnimationEngine
          window.mainApp.displayManager = new DisplayManager(this);
          window.mainApp.animationEngine = new AnimationEngine(this.config, window.mainApp.displayManager);
        }
      } catch (error) {
        console.error("App initialization failed:", error);
      } finally {
        // 6. Turn off loading spinner
        this.loading = false;
      }

      // 7. Handle post-auth redirect
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("authenticated")) {
        await window.mainApp.animationEngine.initMap();

        window.mainApp.displayManager.showActivityDistance(0, 0, true, 1200);
        setTimeout(() => {
          window.mainApp.animationEngine.startAnimation(this.activities);
        }, 1200);
      }
    },
    isDigitOrDot(char) {
      return /[0-9\.]/.test(char);
    },
    toggleControls() {
      this.controlsVisible = !this.controlsVisible;
    },
    zoomIn() {
      if (typeof window !== "undefined" && window.mainApp?.animationEngine) {
        window.mainApp.animationEngine.zoomIn();
      }
    },
    zoomOut() {
      if (typeof window !== "undefined" && window.mainApp?.animationEngine) {
        window.mainApp.animationEngine.zoomOut();
      }
    },
    startAnimation() {
      // Use your animationEngine here
      if (window.mainApp.animationEngine) {
        window.mainApp.isAnimating = true;
        this.toggleControls();
        window.mainApp.animationEngine.startAnimation(this.activities);
      }
    },
    drawAllRoutes() {
      if (window.mainApp.animationEngine) {
        window.mainApp.animationEngine.drawAllRoutes(this.activities);
      }
    },
    clearRoutes() {
      if (window.mainApp.animationEngine) {
        window.mainApp.animationEngine.clearRoutes();
      }
    },
    logout() {
      // whatever your logout logic is
      window.location.href = "/logout"; // example
    },
  },
  data() {
    return {
      authenticated: false,
      loading: true,
      syncStatus: "",
      map: null,
      activities: [],
      config: null,
      isAnimating: false,
      currentMonth: "JAN",
      currentDayYear: "01",
      currentKm: "000.0",
      runnerPosition: null,
      currentActivityIndex: 0,
      currentPointIndex: 0,
      drawnRoutes: [],
      controlsVisible: false,
      animationPhase: null, // 'entering', 'visible', 'exiting', or null
    };
  },
  async mounted() {
    await this.initializeApp();
  },
});
