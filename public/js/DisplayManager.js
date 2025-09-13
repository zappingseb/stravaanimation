// Display Manager for split-flap boards and UI state
export class DisplayManager {
    constructor(vueInstance) {
        this.vueInstance = vueInstance;
    }

    updateDisplays(activity) {
        const date = new Date(activity.date);
        
        const month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
        const dayYear = date.toLocaleDateString('en-US', {
            day: '2-digit'
        });
        const km = activity.cumulativeDistance.toFixed(1).padStart(5, '0');
        
        // Update split-flap displays
        this.vueInstance.currentMonth = month;
        this.vueInstance.currentDayYear = dayYear;
        this.vueInstance.currentKm = km;
        
        // Show activity distance in center
        this.showActivityDistance(activity.distance);
    }

    showActivityDistance(distanceInMeters) {
        // Convert meters to km with 1 decimal place
        this.vueInstance.activityDistance = (distanceInMeters / 1000).toFixed(1);
        this.vueInstance.showingActivityDistance = true;
        
        // Hide after 1.5 seconds
        setTimeout(() => {
            this.vueInstance.showingActivityDistance = false;
            // Clear after fade animation completes
            setTimeout(() => {
                this.vueInstance.activityDistance = null;
            }, 300);
        }, 1500);
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

    clearData() {
        this.vueInstance.activities = [];
        this.vueInstance.activityDistance = null;
        this.vueInstance.showingActivityDistance = false;
        this.vueInstance.runnerPosition = null;
    }
}