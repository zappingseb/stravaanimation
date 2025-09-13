// API Service for communication with backend
export class ApiService {
    constructor() {
        this.baseURL = '';
    }

    async checkAuthStatus() {
        try {
            const response = await fetch('/api/auth/status', {
                credentials: 'include'
            });
            return await response.json();
        } catch (error) {
            console.error('Auth check failed:', error);
            throw error;
        }
    }

    async syncActivities() {
        try {
            const response = await fetch('/api/activities/sync', {
                method: 'POST',
                credentials: 'include'
            });
            return await response.json();
        } catch (error) {
            console.error('Sync failed:', error);
            throw error;
        }
    }

    async loadConfig() {
        try {
            const response = await fetch('/api/config');
            return await response.json();
        } catch (error) {
            console.error('Config load failed:', error);
            throw error;
        }
    }

    async loadActivities() {
        try {
            console.log('Loading activities...');
            const response = await fetch('/api/activities', {
                credentials: 'include'
            });
            const rawActivities = await response.json();
            console.log(`Received ${rawActivities.length} activities from backend`);
            
            return this.deduplicateActivities(rawActivities);
        } catch (error) {
            console.error('Activities load failed:', error);
            throw error;
        }
    }

    deduplicateActivities(rawActivities) {
        const uniqueIds = new Set();
        const duplicateIds = new Set();
        
        rawActivities.forEach(activity => {
            if (uniqueIds.has(activity.id)) {
                duplicateIds.add(activity.id);
            } else {
                uniqueIds.add(activity.id);
            }
        });
        
        if (duplicateIds.size > 0) {
            console.warn(`Found ${duplicateIds.size} duplicate activity IDs:`, Array.from(duplicateIds));
        }
        
        const seenIds = new Set();
        const deduplicatedActivities = rawActivities.filter(activity => {
            if (seenIds.has(activity.id)) {
                console.log(`Removing duplicate activity: ${activity.id} - ${activity.name}`);
                return false;
            }
            seenIds.add(activity.id);
            return true;
        });
        
        console.log(`Final count after deduplication: ${deduplicatedActivities.length} activities`);
        return deduplicatedActivities;
    }

    async logout() {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
            return { success: true };
        } catch (error) {
            console.error('Logout failed:', error);
            throw error;
        }
    }
}