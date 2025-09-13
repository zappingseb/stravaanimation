### Project Structure
```
├── src/
│   ├── server.ts          # TypeScript Express backend
│   └── types.ts           # Type definitions
├── public/
│   └── index.html         # Vue.js frontend
├── dist/                  # Compiled TypeScript (auto-generated)
├── config.json            # App configuration
├── tsconfig.json          # TypeScript configuration
├── package.json           # Dependencies & scripts
├── Dockerfile             # Container definition
└── docker-compose.yml     # Multi-container setup
```

### Adding Features
- Backend routes and logic in `src/server.ts`
- Type definitions in `src/types.ts`
- Frontend logic in `public/index.html` Vue app
- Map styling uses Leaflet.js with CartoDB dark tiles
- Animation timing configurable via `config.json`
- Full TypeScript support# Strava Runner Animation

A web application that creates an animated visualization of your running routes using Strava data. Watch your year of running unfold in a 90-second time-lapse with cumulative distance tracking and airport-style date flipping.

## Features

- 🏃‍♂️ Animated runner moving along your actual GPS routes
- 📅 Airport-style flipping date display
- 📊 Cumulative distance tracking since January 1st
- 🗺️ Dark themed map with customizable center point and radius
- 🔐 Secure Strava OAuth integration with token refresh
- 💾 Local caching in MongoDB for fast replays

## Prerequisites

- Node.js 18+ 
- MongoDB
- Strava API Application (get from [Strava Developers](https://developers.strava.com/))

## Setup Instructions

### 1. Strava API Setup
1. Go to [Strava Developers](https://developers.strava.com/)
2. Create a new application
3. Note your `Client ID` and `Client Secret`
4. Set Authorization Callback Domain to: `localhost`

### 2. Configuration

#### Environment Variables
1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Fill in your Strava API credentials in `.env`:
```bash
STRAVA_CLIENT_ID=your-strava-client-id
STRAVA_CLIENT_SECRET=your-strava-client-secret
SESSION_SECRET=generate-a-random-string-here
```

#### App Configuration
Update `config.json` with your location settings:
```json
{
  "strava": {
    "redirectUri": "http://localhost:3000/auth/strava/callback"
  },
  "animation": {
    "startDate": "2024-01-01",
    "endDate": "2024-12-31",
    "centerLat": 48.1351,  // Your area center latitude
    "centerLng": 11.5820,  // Your area center longitude
    "radiusMeters": 5000,  // Filter radius in meters
    "animationDurationSeconds": 90
  }
}
```

### 3. Local Development

#### Option A: Node.js
```bash
# Install dependencies
npm install

# Start MongoDB (if running locally)
mongod

# Start the application
npm run dev

# Open browser to http://localhost:3000
```

#### Option B: Docker
```bash
# Start with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### 4. First Run
1. Open http://localhost:3000
2. Click "Connect with Strava"
3. Authorize the application on Strava
4. Wait for activity sync (may take a minute for 100+ activities)
5. Click "Start Animation" to watch your running year!

## Configuration Options

### Map Settings
- `centerLat/centerLng`: Center point of your running area
- `radiusMeters`: Only activities starting within this radius will be included
- Activities are automatically filtered to show only runs in your specified area

### Animation Settings
- `animationDurationSeconds`: Total video length (90 seconds recommended)
- `startDate/endDate`: Date range to include
- The app automatically calculates timing to fit all activities into the duration

### Finding Your Coordinates
Use [latlong.net](https://www.latlong.net/) or Google Maps:
1. Right-click on your area center
2. Copy the coordinates
3. Update `centerLat` and `centerLng` in config.json

## API Endpoints

- `GET /` - Main application
- `GET /auth/strava` - Initiate Strava OAuth
- `GET /auth/strava/callback` - OAuth callback
- `POST /api/activities/sync` - Sync activities from Strava
- `GET /api/activities` - Get cached activities
- `GET /api/config` - Get app configuration

## Technical Details

### Data Flow
1. User authenticates with Strava OAuth 2.0
2. App fetches all activities in date range
3. Filters activities by type (Run) and location (within radius)
4. Decodes GPS polylines and caches in MongoDB
5. Frontend animates runner along routes with timing calculated for smooth playback

### Token Management
- Automatically refreshes Strava tokens when expired
- Stores refresh tokens securely in MongoDB
- Handles rate limiting (100 requests per 15 minutes)

### Performance
- GPS coordinates are sampled for smooth animation
- Activities cached locally to avoid repeated API calls
- Optimized for ~100 activities in 90 seconds

## Troubleshooting

### Common Issues

**"OAuth failed"**
- Check your Strava Client ID and Secret
- Verify redirect URI exactly matches Strava app settings

**"No activities found"**
- Adjust `centerLat/centerLng` to your actual running area
- Increase `radiusMeters` if your routes are spread out
- Check date range includes your activities

**"Sync failed"**
- Check Strava API rate limits
- Verify your activities are marked as "Run" type
- Check network connectivity

### Docker Issues
```bash
# Reset everything
docker-compose down -v
docker-compose up -d

# Check logs
docker-compose logs mongodb
docker-compose logs app
```

## Development

### Project Structure
```
├── server.js           # Express backend with Strava OAuth
├── public/
│   └── index.html     # Vue.js frontend
├── config.json        # App configuration
├── package.json       # Dependencies
├── Dockerfile         # Container definition
└── docker-compose.yml # Multi-container setup
```

### Adding Features
- Routes are in `server.js`
- Frontend logic is in `index.html` Vue app
- Map styling uses Leaflet.js with CartoDB dark tiles
- Animation timing is configurable via `config.json`

## License

MIT License - feel free to modify and share!