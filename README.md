# Weather Display System

🌤️ **Live System Status**: [Management Interface](https://0b4669b0.weather-management.pages.dev) | [API Health](https://weather-backend.nativenav.workers.dev/health)

A complete weather data collection and display system with cloud backend, web management interface, and ESP32C3 firmware for ePaper displays. Currently monitoring 6 weather stations across UK marine and French alpine locations.

## 🚀 Current Status: **PRODUCTION READY**

✅ **Backend**: Deployed Cloudflare Worker with 6 active weather stations  
✅ **Frontend**: Live web management interface with real-time controls  
✅ **Data Sources**: UK marine (3) + French alpine (3) weather stations  
✅ **API**: Full REST API with caching, configuration, and health monitoring  
✅ **Documentation**: Complete setup and usage guides  
🔄 **Firmware**: ESP32C3 client ready for integration  

## 🌐 Live System URLs

### 🖥️ Management Interface
**https://0b4669b0.weather-management.pages.dev**
- Enable/disable weather stations
- Change data collection frequency
- View real-time weather data
- Monitor system health
- Mobile-responsive design

### 🔌 API Endpoints
**Base URL**: `https://weather-backend.nativenav.workers.dev`
- Health: `/health`
- Stations: `/api/v1/stations`
- Weather Data: `/api/v1/weather/{station_id}`
- Manual Collection: `/api/v1/collect` (POST)
- Configuration: `/api/v1/config` (GET/POST)

## 📍 Active Weather Stations

### UK Marine Stations
- **Brambles Bank**: Solent marine weather (Southampton VTS)
- **Seaview**: Isle of Wight marine data (Navis live data)
- **Lymington**: Hampshire harbor weather station

### French Alpine Stations
- **Prarion (Les Houches)**: 1,865m altitude, Pioupiou wind station
- **Tête de Balme**: 2,204m altitude, Windbird station  
- **Planpraz**: 1,958m altitude, Windbird station

## 🏗️ Project Structure
```
weather-display-system/
  backend/           # ✅ Cloudflare Workers + KV (deployed)
    ├── src/parsers/   # Weather station data parsers
    ├── src/fetchers/  # API clients for weather sources
    └── src/types/     # TypeScript interfaces
  frontend/          # ✅ Web management interface (deployed)
    ├── index.html     # Main management UI
    ├── styles.css     # Responsive design
    └── script.js      # API integration
  firmware/          # ESP32C3 client for ePaper displays
  docs/              # Architecture docs and station guides
  schemas/           # Versioned JSON API schemas
```

## 🛠️ Technology Stack

### Backend (Cloudflare)
- **Runtime**: Cloudflare Workers (serverless)
- **Storage**: Cloudflare KV (caching)
- **Cron**: Scheduled data collection (5-minute intervals)
- **Language**: TypeScript with full type safety

### Frontend (Cloudflare Pages)
- **Framework**: Vanilla HTML/CSS/JavaScript
- **Styling**: Modern CSS Grid/Flexbox with responsive design
- **Features**: Real-time updates, toast notifications, mobile-friendly

### Data Sources
- **UK Marine**: Southampton VTS, Navis live data, harbor stations
- **French Alpine**: Pioupiou wind stations, Windbird network
- **APIs**: REST APIs with JSON responses, error handling

## 🚀 Quick Start

### View Live Data
1. Visit the [Management Interface](https://0b4669b0.weather-management.pages.dev)
2. Monitor real-time weather data from all 6 stations
3. Enable/disable stations or trigger manual data collection

### Use the API
```bash
# Get current weather from a station
curl https://weather-backend.nativenav.workers.dev/api/v1/weather/prarion

# Get all available stations
curl https://weather-backend.nativenav.workers.dev/api/v1/stations

# Check system health
curl https://weather-backend.nativenav.workers.dev/health
```

### ESP32C3 Integration
```cpp
// Simple ESP32C3 client example
#include <WiFi.h>
#include <HTTPClient.h>

String getWeatherData(String station) {
  HTTPClient http;
  http.begin("https://weather-backend.nativenav.workers.dev/api/v1/weather/" + station + "?format=display");
  int httpCode = http.GET();
  return (httpCode == 200) ? http.getString() : "Error";
}
```

## 📖 Documentation

- [Architecture Decisions](docs/ADR-0001.md)
- [Chamonix Stations Guide](docs/chamonix-stations.md)
- [Frontend README](frontend/README.md)
- [API Schema](schemas/weather.v1.json)

## 🔄 Development Status

| Component | Status | Description |
|-----------|--------|--------------|
| Backend API | ✅ **Production** | 6 stations active, caching, cron jobs |
| Web Interface | ✅ **Production** | Full management UI deployed |
| Data Parsers | ✅ **Complete** | UK marine + French alpine sources |
| Documentation | ✅ **Complete** | Setup guides and API docs |
| ESP32C3 Firmware | 🔄 **Ready** | Client code available for integration |
| Mobile App | 📋 **Future** | Planned for Phase 6 |

---

*Weather Display System v0.1.0 - Built with Cloudflare Workers, Pages, and ESP32C3*

