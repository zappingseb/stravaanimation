// Display Manager for split-flap boards and UI state
export class DisplayManager {
  constructor(vueInstance) {
    this.vueInstance = vueInstance;
  }

  updateDisplays(activity) {
    const date = new Date(activity.date);

    const month = date.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
    const dayYear = date.toLocaleDateString("en-US", {
      day: "2-digit",
    });
    const km = activity.cumulativeDistance.toFixed(1).padStart(5, "0");

    // Update split-flap displays
    this.vueInstance.currentMonth = month;
    this.vueInstance.currentDayYear = dayYear;
    this.vueInstance.currentKm = km;
  }

  showActivityDistance(distanceInMeters, delay, go, exitAfter = 600) {
    setTimeout(() => {
      if (!go) {
        // Convert meters to km with 1 decimal place
        const distance = (distanceInMeters / 1000).toFixed(1);

        // Set the distance and initial state
        this.vueInstance.activityDistance = "+" + distance;
      } else {
        this.vueInstance.activityDistance = `Let's Go!`;
      }
      this.vueInstance.showingActivityDistance = true;
      this.vueInstance.animationPhase = "entering"; // New property to track animation phase

      // Start the flying-in animation
      setTimeout(() => {
        console.log("Showing distance at", distanceInMeters);
        this.vueInstance.animationPhase = "visible";
      }, 50); // Small delay to ensure DOM update

      // After display time, start exit animation
      setTimeout(() => {
        this.vueInstance.animationPhase = "exiting";

        // Clear after exit animation completes
        setTimeout(() => {
          this.vueInstance.showingActivityDistance = false;
          this.vueInstance.activityDistance = null;
          this.vueInstance.animationPhase = null;
        }, 100);
      }, exitAfter);
    }, delay);
  }

  updateRunnerPosition(position) {
    this.vueInstance.runnerPosition = position;
  }

  toggleControls() {
    this.vueInstance.controlsVisible = !this.vueInstance.controlsVisible;
  }

  setAnimationState(isAnimating) {
    this.vueInstance.isAnimating = isAnimating;
  }

  setSyncStatus(status) {
    this.vueInstance.syncStatus = status;
  }

  setLoadingState(loading) {
    this.vueInstance.loading = loading;
  }

  setAuthState(authenticated) {
    this.vueInstance.authenticated = authenticated;
  }

  sendDistanceToCenter() {
    // Get the stats display element
    const statsDisplay = document.querySelector(".overlay.stats-display");
    const statsDate = document.querySelector(".overlay.date-display");
    statsDate.setAttribute("style", "display:none");
    if (!statsDisplay) return;

    document.querySelector(".overlay.grey").classList.add("show");

    // Add the center animation class
    statsDisplay.classList.add("animate-to-center");

    // Set Vue state to track animation
    this.vueInstance.statsMovingToCenter = true;
  }

  clearData() {
    this.vueInstance.activities = [];
    this.vueInstance.activityDistance = null;
    this.vueInstance.showingActivityDistance = false;
    this.vueInstance.runnerPosition = null;
    this.vueInstance.animationPhase = null;
    this.vueInstance.statsMovingToCenter = false;
  }
}
