// Animation Engine for route visualization
export class AnimationEngine {
    constructor(config, displayManager) {
        this.config = config;
        this.displayManager = displayManager;
        this.map = null;
        this.drawnRoutes = [];
    }

    initMap() {
        if (!this.config) {
            console.warn('Cannot init map: config not loaded');
            return;
        }

        if (this.map) {
            this.map.remove();
        }

        return new Promise(resolve => {
            setTimeout(() => {
                try {
                    this.map = L.map('map', {
                        center: [this.config.map.centerLat, this.config.map.centerLng],
                        zoom: 14,
                        zoomControl: false,
                        scrollWheelZoom: true,
                        doubleClickZoom: true,
                        boxZoom: false,
                        keyboard: false,
                        dragging: true
                    });
                } catch(e) {
                    console.log("NO MAP")
                    return;
                }

                L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                    subdomains: 'abcd',
                    maxZoom: 20
                }).addTo(this.map);

                L.circle([this.config.map.centerLat, this.config.map.centerLng], {
                    radius: this.config.map.radiusMeters,
                    fillColor: 'transparent',
                    color: '#444',
                    weight: 1,
                    opacity: 0.5
                }).addTo(this.map);

                console.log('Map initialized successfully');
                resolve(this.map);
            }, 2000);
        });
    }

    async startAnimation(activities) {
        if (!activities.length) return;

        console.log('Starting animation with', activities.length, 'activities');
        this.clearRoutes();

        const totalDuration = this.config.animation.animationDurationSeconds * 1000;
        await this.continuousAnimation(activities, totalDuration);

        console.log('Animation completed');
    }

    async continuousAnimation(activities, totalDuration) {
        const totalSteps = activities.reduce((sum, activity) => {
            return sum + Math.min(activity.coordinates?.length || 0, 50);
        }, 0);
        
        const stepDuration = (totalDuration / totalSteps) / 2;
        const baseOpacity = Math.max(0.05, Math.min(0.9, 1.0 / Math.sqrt(activities.length / 1)));

        console.log(`Animation settings: ${totalSteps} total steps, ${stepDuration.toFixed(2)}ms per step, opacity: ${baseOpacity.toFixed(3)}`);

        for (let activityIndex = 0; activityIndex < activities.length; activityIndex++) {
            const activity = activities[activityIndex];
            const coordinates = activity.coordinates;
            
            if (!coordinates || coordinates.length === 0) {
                console.log(`Skipping activity ${activityIndex + 1}: no coordinates`);
                continue;
            }

            console.log(`Processing activity ${activityIndex + 1}/${activities.length}`);

            // Draw the route polyline immediately
            const routeCoords = coordinates.map(coord => [coord[0], coord[1]]);
            const polyline = L.polyline(routeCoords, {
                color: '#ff3300',
                weight: 4,
                opacity: baseOpacity,
                smoothFactor: 1.0,
                interactive: false
            });

            polyline.addTo(this.map);
            this.drawnRoutes.push(polyline);

            // Update displays
            this.displayManager.updateDisplays(activity);

            // Animate runner along this route
            const steps = Math.min(coordinates.length, 50);
            const stepSize = Math.max(1, Math.floor(coordinates.length / steps));

            for (let i = 0; i < coordinates.length; i += stepSize) {
                const coord = coordinates[i];
                const point = this.map.latLngToContainerPoint([coord[0], coord[1]]);
                
                this.displayManager.updateRunnerPosition({
                    x: point.x - 10,
                    y: point.y - 10
                });

                await this.sleep(stepDuration);
            }
        }
    }

    drawAllRoutes(activities) {
        console.log(`Drawing all ${activities.length} routes immediately`);
        this.clearRoutes();
        
        const baseOpacity = Math.max(0.05, Math.min(0.9, 1.0 / Math.sqrt(activities.length / 1)));
        
        activities.forEach((activity, index) => {
            const coordinates = activity.coordinates;
            if (!coordinates || coordinates.length === 0) {
                console.log(`Skipping activity ${index + 1}: no coordinates`);
                return;
            }

            const routeCoords = coordinates.map(coord => [coord[0], coord[1]]);
            
            const polyline = L.polyline(routeCoords, {
                color: '#ff3300',
                weight: 4,
                opacity: baseOpacity,
                smoothFactor: 1.0,
                interactive: false
            });

            polyline.addTo(this.map);
            this.drawnRoutes.push(polyline);
            console.log(`Drew route ${index + 1} with ${coordinates.length} points`);
        });
        
        console.log(`Finished drawing ${this.drawnRoutes.length} routes with opacity ${baseOpacity.toFixed(3)}`);
    }

    clearRoutes() {
        console.log(`Clearing ${this.drawnRoutes.length} routes`);
        this.drawnRoutes.forEach((route, index) => {
            this.map.removeLayer(route);
            console.log(`Removed route ${index + 1}`);
        });
        this.drawnRoutes = [];
    }

    zoomIn() {
        if (this.map) {
            this.map.zoomIn();
        }
    }

    zoomOut() {
        if (this.map) {
            this.map.zoomOut();
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    destroy() {
        if (this.map) {
            this.clearRoutes();
            this.map.remove();
            this.map = null;
        }
    }
}