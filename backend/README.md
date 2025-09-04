# Weather Backend - Cloudflare Workers

🚀 **Status**: **PRODUCTION DEPLOYED** at https://weather-backend.nativenav.workers.dev  
**Version**: v2.0.0 🆕 **Standardized Parsers**

## 🚨 v2.0.0 Breaking Changes

**Parser System Overhaul** - All weather parsers have been standardized:
- ✅ **Wind speeds now in m/s** (meters per second) across all stations
- ✅ **Proper null handling** - missing data is `null`, not `0`
- ✅ **Enhanced gust accuracy** - `null` when only instantaneous data available
- ✅ **Legacy code removed** - cleaner, more maintainable codebase

**Migration Required**: Frontend and firmware need updates for new data format. See [`CHANGELOG.md`](./CHANGELOG.md)

Cloudflare Workers backend serving weather data from 6 active stations with KV caching, cron collection, and configuration management.

## 🌐 Live Endpoints

**Base URL**: `https://weather-backend.nativenav.workers.dev`

### Weather Data
- `GET /api/v1/weather/{station_id}` - JSON weather data
- `GET /api/v1/weather/{station_id}?format=display` - ESP32C3 text format
- `GET /api/v1/stations` - List all available stations

### System Management
- `GET /health` - Health check and status
- `POST /api/v1/collect` - Manual data collection trigger
- `GET /api/v1/config` - System configuration
- `POST /api/v1/config` - Update configuration

## 📍 Active Weather Stations

### UK Marine (3 stations) ✅ All LIVE
- **brambles**: Brambles Bank (Southampton VTS)
  - Status: ✅ LIVE - 24.5kt @ 299°, 17.7°C, 995 hPa
- **seaview**: Seaview (Isle of Wight, Navis)
  - Status: ✅ LIVE - 21.4kt @ 197°, 17.7°C
  - Implementation: Session management + hex parsing
- **lymington**: Lymington Harbour
  - Status: ✅ LIVE - 26.2kt @ 209°, 31.0kt gust
  - Implementation: WeatherFile.com V03 enhanced API

### French Alpine (3 stations) ✅ All LIVE
- **prarion**: Les Houches (1,865m, Pioupiou 521)
- **tetedebalme**: Tête de Balme (2,204m, Windbird 1702)
- **planpraz**: Planpraz (1,958m, Windbird 1724)

### Recent Parser Fixes (September 2025)

#### 🔧 Seaview Navis Integration
- **Problem**: API returning "error%" due to missing authentication
- **Solution**: Implemented proper session management
- **Details**:
  - Establish PHPSESSID cookie via GET to session URL
  - Use cookie in subsequent API requests
  - Parse hex data using documented MSB/LSB bit manipulation
  - Extract wind speed, direction, and temperature

#### 🔧 Lymington WeatherFile.com Integration  
- **Problem**: Parser returning zero values
- **Solution**: Implemented correct V03 API endpoints
- **Details**:
  - Primary: `/V03/loc/GBR00001/infowindow.ggl` (enhanced with averages)
  - Fallback: `/V03/loc/GBR00001/latest.json` (current data)
  - POST method with proper headers including `wf-tkn: PUBLIC`
  - Parse JSON response with wind averages, gusts, and direction

## 🏗️ Architecture

### Core Components
```
src/
├── index.ts           # Main Worker with routing
├── types/             # TypeScript interfaces
│   ├── weather.ts     # Weather data types
│   └── devices.ts     # Device configuration types
├── parsers/           # Station-specific data parsers (v2.0 standardized)
│   ├── brambles.ts    # Southampton VTS parser (knots → m/s)
│   ├── seaview.ts     # Navis live data parser (knots → m/s)
│   ├── lymington.ts   # Harbour weather parser (m/s native)
│   ├── pioupiou.ts    # Pioupiou wind station (km/h → m/s)
│   └── windbird.ts    # Windbird stations (km/h → m/s)
├── fetchers/          # HTTP clients for data sources
│   ├── pioupiou.ts    # Pioupiou API client
│   └── windbird.ts    # Windbird API client
└── utils/helpers.ts   # Utilities and unit conversion
```

### Features Implemented
✅ **Multi-station Support**: 6 active weather stations  
✅ **Caching**: Cloudflare KV with TTL-based expiration  
✅ **Cron Jobs**: Automated data collection every 5 minutes  
✅ **Error Handling**: Comprehensive error logging and recovery  
✅ **CORS Support**: Full CORS headers for frontend integration  
✅ **Configuration API**: Dynamic system configuration management  
✅ **Display Format**: ESP32C3-optimized text output  
✅ **Health Monitoring**: System status and health endpoints  

## 🚀 Deployment

### Production Deployment
```bash
# Deploy to production
npm run deploy

# Deploy to specific environment
npm run deploy:staging
```

### Environment Configuration
```toml
# wrangler.toml
name = "weather-backend"
main = "dist/index.js"
compatibility_date = "2024-04-05"

[[kv_namespaces]]
binding = "WEATHER_CACHE"
id = "your-kv-namespace-id"

[triggers]
crons = ["*/5 * * * *"]  # Every 5 minutes

[vars]
ENVIRONMENT = "production"
# Note: No API keys required - system uses public weather APIs
```

## 📊 Monitoring

### Health Check
```bash
curl https://weather-backend.nativenav.workers.dev/health
```

### Station Status
```bash
# Check all stations
curl https://weather-backend.nativenav.workers.dev/api/v1/stations

# Get weather from specific station
curl https://weather-backend.nativenav.workers.dev/api/v1/weather/prarion
```

### Manual Data Collection
```bash
# Trigger collection from all stations
curl -X POST https://weather-backend.nativenav.workers.dev/api/v1/collect
```

## 🔧 Development

### Local Development
```bash
# Install dependencies
npm install

# Run local development server
npm run dev

# Type checking
npm run type-check
```

### Adding New Weather Stations
1. Create parser in `src/parsers/{station}.ts`
2. Add fetcher in `src/fetchers/` if needed
3. Update station routing in `src/index.ts`
4. Add station definition in `handleStationsRequest()`
5. Test and deploy

## 📈 Performance

- **Cold start**: ~5ms Worker startup time
- **Cache hit**: <50ms response time
- **Cache miss**: 200-500ms (depending on upstream API)
- **Cron execution**: ~2-5 seconds for all 6 stations
- **KV storage**: 5-minute TTL with automatic refresh

## 🎯 API Schema

Follows `weather.v1.json` schema:
```json
{
  "schema": "weather.v1",
  "stationId": "prarion",
  "timestamp": "2024-01-01T12:00:00Z",
  "data": {
    "wind": {
      "avg": 12.5,
      "gust": 18.2,
      "direction": "NW",
      "unit": "mps"
    },
    "temperature": {
      "air": 15.3,
      "unit": "celsius"
    }
  },
  "ttl": 300
}
```

## 🚀 ESP32C3 Firmware Integration

**⚠️ IMPORTANT**: When developing ESP32C3 firmware that displays this backend's data:
- **Use Seeed_GFX library**: https://github.com/Seeed-Studio/Seeed_GFX
- **NOT standard TFT_eSPI**: Causes compilation errors with ePaper displays
- **See**: [Development Solutions Notebook](../DEVELOPMENT-SOLUTIONS-NOTEBOOK.md) for details
- **API Endpoints**: Use region-based `/api/v1/weather/region/{regionId}` for three-column displays
- **Unit Handling**: Backend returns m/s, convert to regional units (km/h, knots) in firmware

---

*Built with TypeScript, Cloudflare Workers, and KV storage*

