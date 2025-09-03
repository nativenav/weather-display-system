# Weather Display System

🌤️ **Live System Status**: [Management Interface](https://0b4669b0.weather-management.pages.dev) | [API Health](https://weather-backend.nativenav.workers.dev/health)

A complete weather data collection and display system with cloud backend, web management interface, and ESP32C3 firmware for ePaper displays. Currently monitoring 6 weather stations across UK marine and French alpine locations.

## 🚀 Current Status: **LIVE WITH COMPLETE DEVICE MANAGEMENT**

✅ **Backend**: Deployed Cloudflare Worker with 6 active weather stations + device management API  
✅ **Frontend**: Live web management interface with full device management capabilities  
✅ **Device Management**: Auto-registration, identification, real-time status monitoring (DEPLOYED)  
✅ **Data Sources**: UK marine (3) + French alpine (3) weather stations  
✅ **API**: Full REST API with device endpoints, caching, and health monitoring (LIVE)  
✅ **Documentation**: Complete setup and usage guides  
✅ **Firmware**: ESP32C3 client ready for immediate deployment with WiFi setup

## 🌐 Live System URLs

### 🖥️ Management Interface
**https://0b4669b0.weather-management.pages.dev**
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
| **Tête de Balme** | Chamonix, France (2,204m) | ✅ **LIVE** | Windbird 1702 | Alpine wind data |
| **Planpraz** | Chamonix, France (1,958m) | ✅ **LIVE** | Windbird 1724 | Alpine wind data |

### Recent Fixes (September 2025)
- 🔧 **Lymington**: Fixed WeatherFile.com API integration with V03 endpoints
- 🔧 **Seaview**: Implemented proper Navis session management with hex parsing
- ✅ **All Marine Stations**: Now providing real-time Solent sailing conditions

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
               "?mac=" + deviceId + "&firmware=1.0.0";
  
  http.begin(url);
  http.addHeader("User-Agent", "ESP32C3-WeatherDisplay/1.0.0");
  
  int httpCode = http.GET();
  
  if (httpCode == 201) {
    // New device auto-registered!
    Serial.println("Device registered successfully!");
  }
  
  return (httpCode == 200 || httpCode == 201) ? http.getString() : "Error";
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
| ESP32C3 Firmware | ✅ **Complete** | Full implementation with device management (see DEVICE-MANAGEMENT-STATUS.md) |
| Mobile App | 📋 **Future** | Planned for Phase 6 |

---

*Weather Display System v0.1.0 - Built with Cloudflare Workers, Pages, and ESP32C3*

