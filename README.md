# Weather Display System

🌤️ **Live System Status**: [Management Interface](https://wds.nativenav.com) | [API Health](https://weather-backend.nativenav.workers.dev/health)

A complete weather data collection and display system with cloud backend, web management interface, and ESP32C3 firmware for ePaper displays. Currently monitoring 6 weather stations across UK marine and French alpine locations.

## 🚀 Current Status: **LIVE V2.0.0 - STREAMLINED & PRODUCTION-READY**

✅ **Backend v2.0.0**: Streamlined Cloudflare Worker with 6 active stations + device management  
✅ **Frontend v2.0.0**: Clean web interface with device management via wds.nativenav.com  
✅ **Firmware v2.1.5**: ESP32C3 with battery optimizations & refined aesthetics - **NEW!**  
✅ **Data Sources**: UK marine (3) + French alpine (3) weather stations with standardized units  
✅ **API v2.0.0**: REST endpoints with proper null handling and m/s wind speed standards  
✅ **Streamlined**: Removed legacy code, test files, and unused deployments for efficiency

## 🌐 Live System URLs

### 🖥️ Management Interface
**https://wds.nativenav.com**
- **Device Management**: Auto-registered ESP32C3 devices with real-time status
- **Device Operations**: Rename devices, reassign stations, identify (flash display)
- **Station Control**: Enable/disable weather stations
- **System Configuration**: Change data collection frequency
- **Live Weather Data**: Real-time data from all active stations
- **Health Monitoring**: Backend status and system diagnostics
- **Mobile-Responsive**: Full functionality on all screen sizes

### 🔌 API Endpoints
**Base URL**: `https://weather-backend.nativenav.workers.dev`
- Health: `/health`
- Regions: `/api/v1/regions`
- Stations: `/api/v1/stations`
- Weather Data: `/api/v1/weather/{station_id}?mac={device_mac}` (with auto-registration)
- Devices: `/api/v1/devices` (GET/POST)
- Device Management: `/api/v1/devices/{id}` (GET/PATCH)
- Device Identify: `/api/v1/devices/{id}/identify` (POST)
- Manual Collection: `/api/v1/collect` (POST)
- Configuration: `/api/v1/config` (GET/POST)

## 📍 Active Weather Stations

**All 6 stations now operational with live data! ✅**

| Station | Location | Status | Data Source | Last Test |
|---------|----------|--------|-------------|----------|
| **Brambles Bank** | Solent, UK | ✅ **LIVE** | Southampton VTS Marine | 24.5kt @ 299° |
| **Seaview** | Isle of Wight, UK | ✅ **LIVE** | Navis Live Data + Session | 21.4kt @ 197°, 17.7°C |
| **Lymington** | Hampshire, UK | ✅ **LIVE** | WeatherFile.com V03 API | 26.2kt @ 209°, 31.0kt gust |
| **Prarion (Les Houches)** | Chamonix, France (1,865m) | ✅ **LIVE** | Pioupiou 521 | Alpine wind data |
| **Tete de Balme** | Chamonix, France (2,204m) | ✅ **LIVE** | Pioupiou 1702 | Alpine wind data (v2.1.5: Fixed display) |
| **Planpraz** | Chamonix, France (1,958m) | ✅ **LIVE** | Pioupiou 1724 | Alpine wind data |

### Recent Updates (December 2025)
- 🔋 **Firmware v2.1.5**: Major battery optimizations - removed startup screen, enhanced serial output
- 🎨 **Aesthetic Improvements**: Capitalized field labels, degree symbols (°), fixed Tete de Balme display
- 🔧 **API Consolidation**: Fixed 503 errors for Chamonix stations by consolidating all three (Prarion, Tete de Balme, Planpraz) to use reliable Pioupiou API endpoints
- 🔧 **Lymington**: Fixed WeatherFile.com API integration with V03 endpoints
- 🔧 **Seaview**: Implemented proper Navis session management with hex parsing
- ✅ **All Marine Stations**: Now providing real-time Solent sailing conditions
- 🆕 **Frontend v2.0.0**: Updated for backend API v2.0.0 compatibility with standardized wind units and improved null handling

## 🏢️ Project Structure (Streamlined v2.0.0)
```
weather-display-system/
  backend/                    # ✅ Cloudflare Worker (streamlined)
    ├── src/
    │   ├── index.ts          # Main worker with direct parser calls
    │   ├── parsers/          # Weather station parsers (6 stations)
    │   ├── types/            # TypeScript type definitions
    │   ├── utils/            # Helper functions and device management
    │   └── config/           # Region and station configurations
    └── wrangler.toml         # Cloudflare deployment config
  
  frontend/                   # ✅ Cloudflare Pages (streamlined)
    ├── index.html            # Management interface
    ├── styles.css            # Clean responsive styling
    ├── script.js             # API integration
    └── package.json          # Deployment config
  
  firmware/                   # ESP32C3 v2.1.5 firmware (battery optimized)
    └── weather-display-integrated/
        ├── weather-display-integrated.ino  # Main firmware v2.1.5
        ├── config.h          # Configuration (updated v2.1.5)
        ├── driver.h          # ePaper display driver
        └── secrets.h.example # WiFi credentials template
  
  docs/                       # Essential documentation only
    ├── ADR-0001.md          # Architecture decisions
    ├── chamonix-stations.md # Station information
    └── README.md            # Documentation index
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
1. Visit the [Management Interface](https://wds.nativenav.com)
2. Monitor real-time weather data from all 6 stations
3. Enable/disable stations or trigger manual data collection
4. Edit device nicknames inline with the new blue-themed interface

### Use the API
```bash
# Get current weather from a station
curl https://weather-backend.nativenav.workers.dev/api/v1/weather/prarion

# Get all available stations
curl https://weather-backend.nativenav.workers.dev/api/v1/stations

# Check system health
curl https://weather-backend.nativenav.workers.dev/health
```

### ESP32C3 Integration with Auto-Registration
```cpp
// ESP32C3 client example with device auto-registration
#include <WiFi.h>
#include <HTTPClient.h>

String deviceMAC = WiFi.macAddress();
String deviceId = deviceMAC;
deviceId.replace(":", "");
deviceId.toLowerCase();

String getWeatherData(String station) {
  HTTPClient http;
  String url = "https://weather-backend.nativenav.workers.dev/api/v1/weather/" + station + 
               "?mac=" + deviceId + "&firmware=2.1.5";
  
  http.begin(url);
  http.addHeader("User-Agent", "WeatherDisplay/2.1.5 ESP32C3-" + deviceId);
  
  int httpCode = http.GET();
  
  if (httpCode == 201) {
    // New device auto-registered! (v2.1.5: Enhanced serial output)
    Serial.println("Device registered successfully with backend!");
  }
  
  return (httpCode == 200 || httpCode == 201) ? http.getString() : "Error";
}
```

## 📜 Documentation

- [Development Solutions Notebook](DEVELOPMENT-SOLUTIONS-NOTEBOOK.md) **⭐ ESSENTIAL for developers**
- [Architecture Decisions](docs/ADR-0001.md)
- [Chamonix Stations Guide](docs/chamonix-stations.md)
- [Frontend README](frontend/README.md)
- [Backend API Documentation](backend/README.md)
- [Firmware README](firmware/weather-display-integrated/README.md)

## 🔄 Development Status

| Component | Status | Description |
|-----------|--------|--------------|
| Backend API | ✅ **Production** | 6 stations active, caching, cron jobs |
| Web Interface | ✅ **Production** | Full management UI deployed |
| Data Parsers | ✅ **Complete** | UK marine + French alpine sources |
| Documentation | ✅ **Complete** | Setup guides and API docs |
| ESP32C3 Firmware | ✅ **Production** | v2.1.5 - Battery optimized + refined aesthetics |
| Mobile App | 📋 **Future** | Planned for Phase 6 |

---

*Weather Display System v0.1.0 - Built with Cloudflare Workers, Pages, and ESP32C3*

