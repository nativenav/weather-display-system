# Development Solutions Notebook

This document contains critical development knowledge, solutions to common problems, and important technical details that future agents and developers need to know when working with this Weather Display System.

## 🚨 CRITICAL LIBRARY INFORMATION

### **Seeed_GFX Library Requirements**

**⚠️ ESSENTIAL:** This project requires the **Seeed_GFX** library, NOT the standard TFT_eSPI library.

- **Repository**: https://github.com/Seeed-Studio/Seeed_GFX
- **Purpose**: Fork of TFT_eSPI specifically optimized for Seeed XIAO ESP32C3 + ePaper displays
- **Key Features**: 
  - Includes `EPaper` class in `Extensions/EPaper.h`
  - Supports `epaper.update()` method for display refresh
  - Optimized for UC8179 controller (7.5" ePaper displays)
  - Works with XIAO ePaper Driver Board pin configurations

### **Library Installation Issues**

**Problem**: Arduino IDE/CLI may prefer standard TFT_eSPI over Seeed_GFX, causing compilation errors like:
```
error: 'EPaper' {aka 'class TFT_eSPI'} has no member named 'update'
```

**Solution**: 
1. Uninstall conflicting TFT_eSPI library: `arduino-cli lib uninstall TFT_eSPI`
2. Install Seeed_GFX: `arduino-cli lib install Seeed_GFX`
3. Verify only Seeed_GFX is installed: `arduino-cli lib list | grep -i "tft\|seeed"`

**Correct Include Pattern**:
```cpp
#include <TFT_eSPI.h>  // Seeed_GFX uses same include name but different implementation
```

**Driver Configuration**:
```cpp
// In driver.h - DO NOT create typedef for EPaper
// Seeed_GFX already provides EPaper class in Extensions/EPaper.h
#include <TFT_eSPI.h>  // This will use Seeed_GFX when TFT_eSPI is uninstalled
```

## 📋 Project Architecture (v2.0.0 Streamlined)

### **Backend Optimizations**
- **Removed**: Legacy compatibility wrapper functions (`fetchPrarionWeather`, `parsePrarionData`, etc.)
- **Direct API Calls**: Chamonix stations now use direct fetch calls to Pioupiou/Windbird APIs
- **Streamlined**: Eliminated unused legacy interfaces and test files
- **Regional Units**: Backend always returns m/s, firmware converts to regional display units

### **Firmware Structure**
```
firmware/weather-display-integrated/
├── weather-display-integrated-v2.0.0.ino  # Main firmware (production)
├── config.h                               # Timing and display configuration
├── driver.h                               # Hardware driver configuration (Seeed_GFX)
├── secrets.h.example                      # WiFi credentials template
└── secrets.h                             # Actual WiFi credentials (not in git)
```

### **Key Dependencies**
- **Seeed_GFX**: ePaper display library (essential)
- **ArduinoJson**: JSON parsing (v7.4.2+)
- **WiFi/HTTPClient**: ESP32 core libraries
- **Preferences**: Settings persistence

## 🛠️ Common Development Issues & Solutions

### **1. Display Not Updating**
**Symptoms**: Blank or frozen ePaper display
**Causes**: 
- Wrong library (TFT_eSPI instead of Seeed_GFX)
- Missing `epaper.update()` calls
- Incorrect SPI pin configuration

**Solutions**:
- Verify Seeed_GFX is installed and TFT_eSPI is removed
- Check SPI pin definitions in `driver.h` match hardware
- Ensure `epaper.update()` is called after drawing commands

### **2. WiFi Connection Issues**
**Configuration**: Project uses multi-network WiFi setup in `secrets.h`
```cpp
const WiFiNetwork WIFI_NETWORKS[] = {
  {"NetworkSSID", "password"},
  {"FoxGuest", ""},  // Open network example
};
```

**Auto-connect Logic**: Scans available networks and connects to first known network found.

### **3. Backend API Integration**
**v2.0.0 Changes**:
- **Region-based endpoints**: `/api/v1/weather/region/{regionId}` returns 3 stations
- **Unit standardization**: Backend always returns m/s wind speeds
- **Null handling**: Proper JSON null support for missing gust/temperature data
- **Auto-registration**: Devices register automatically using MAC address as ID

**Example Response Structure**:
```json
{
  "schema": "weather-region.v1",
  "regionId": "chamonix",
  "regionName": "Chamonix Valley",
  "stations": [
    {
      "stationId": "prarion",
      "data": {
        "wind": {"avg": 5.2, "gust": null, "direction": 270, "unit": "mps"},
        "temperature": {"air": 15.3, "unit": "celsius"}
      }
    }
    // ... 2 more stations
  ]
}
```

### **4. Display Layout (Three-Column)**
**v2.0.0 Layout**: 800px width ePaper divided into 3 columns (260px each)
- **Column positions**: [10, 275, 540] pixels
- **Font scaling**: Increased 30% for better readability
- **Unit conversion**: m/s → km/h (alpine) or knots (marine) for user display
- **Null handling**: "N/A (inst.)" for missing gust, "--" for missing temperature

## 🔧 Hardware Configuration

### **XIAO ESP32C3 + 7.5" ePaper Setup**
**Controller**: UC8179 (7.5" monochrome ePaper)
**Resolution**: 800x480 pixels
**SPI Pins** (defined in `driver.h`):
```cpp
#define EPAPER_SCK   8   // D8 - SCLK
#define EPAPER_MISO  9   // D9 - MISO  
#define EPAPER_MOSI  10  // D10 - MOSI
#define EPAPER_CS    1   // D1 - CS
#define EPAPER_DC    3   // D3 - DC
#define EPAPER_BUSY  2   // D2 - BUSY
#define EPAPER_RST   0   // D0 - RST
```

**Power**: USB-C or 3.7V LiPo battery
**LED**: Built-in LED on pin 21

### **Flashing Process**
1. Install Arduino CLI and ESP32 board package
2. Install required libraries (especially Seeed_GFX)
3. Configure WiFi credentials in `secrets.h`
4. Compile: `arduino-cli compile --fqbn esp32:esp32:XIAO_ESP32C3`
5. Flash: `arduino-cli upload -p /dev/cu.usbmodem* --fqbn esp32:esp32:XIAO_ESP32C3`

## 📊 System Integration

### **Cloudflare Deployments (Streamlined)**
**Active Deployments**:
- `weather-backend`: Main Worker API (weather-backend.nativenav.workers.dev)
- `weather-display-blue`: Frontend UI (wds.nativenav.com)

**Removed Deployments**: `weather-frontend`, `weather-management` (unused, removed to save resources)

### **Device Management**
- **Auto-registration**: Devices register using MAC address on first connection
- **Web Interface**: https://wds.nativenav.com for device management
- **Identify function**: Flash display for physical device identification
- **Heartbeat system**: Regular status updates to backend

## 🆕 Weather Forecast Integration (September 2025)

### **Meteoblue Forecast API Integration**
Added 10-hour weather forecasts using Meteoblue Basic-1H package:

- **Regions**: Les Houches (Chamonix) and Cowes (Solent)
- **Data**: Hourly temperature and weather conditions for current + next 9 hours
- **Update**: Every hour via cron job
- **Caching**: 1-hour TTL in Cloudflare KV
- **API**: Free Meteoblue Basic-1H package

#### **New Endpoints**:
```bash
# Chamonix region forecast (Les Houches)
GET /api/v1/forecast/region/chamonix

# Solent region forecast (Cowes)
GET /api/v1/forecast/region/solent
```

#### **Response Schema**: `forecast-region.v1`
```json
{
  "regionId": "chamonix",
  "location": "Les Houches",
  "forecast": [{
    "timestamp": "2025-09-09T16:00:00+02:00",
    "temperature": 14.2,
    "weatherCode": 3
  }],
  "ttl": 3600
}
```

#### **Implementation Files**:
- `src/fetchers/meteoblueForecast.ts` - API client with retry logic
- `src/parsers/meteoblueForecast.ts` - Data parsing and validation
- `src/config/regions.ts` - Extended with forecast coordinates
- `src/types/weather.ts` - Forecast data types

#### **Critical Setup Requirements**:
1. **API Key**: Add via `wrangler secret put METEOBLUE_API_KEY`
2. **Coordinates**: Les Houches (45.9237, 6.8694, 1000m) | Cowes (50.7606, -1.2974, 5m)
3. **Cron Schedule**: Hourly collection at minute 0 (existing crons trigger this)

## 🎯 Future Development Notes

### **For AI Agents Working on This Project**:
1. **Always verify Seeed_GFX is installed** before attempting firmware compilation
2. **Check library conflicts** if compilation fails - TFT_eSPI conflicts with Seeed_GFX
3. **Use region-based API endpoints** for new features (not individual stations)
4. **Respect the three-column layout** - firmware expects exactly 3 stations per region
5. **Handle JSON nulls properly** - backend v2.0.0 uses proper null values
6. **Test with open WiFi networks** like FoxGuest for development
7. **Forecast Integration** 🆕: Use `/api/v1/forecast/region/{regionId}` for 10-hour forecasts

### **Code Patterns to Follow**:
```cpp
// Display update pattern
epaper.fillScreen(TFT_WHITE);
drawWeatherData();
epaper.update();  // Essential for Seeed_GFX

// Null handling pattern
if (isnan(stations[i].windGust)) {
  gustDisplay = "N/A (inst.)";
} else {
  gustDisplay = String(windGust, 1) + " " + unit;
}

// Regional unit conversion pattern
float convertWindSpeed(float speedMs, String targetUnit) {
  if (targetUnit == "kts") return speedMs * 1.94384;
  if (targetUnit == "kph") return speedMs * 3.6;
  return speedMs;
}
```

## 📜 Change History

### **v2.0.0 (September 2024) - Streamlined Release**
- Removed legacy compatibility wrappers
- Updated to use Seeed_GFX exclusively
- Implemented three-column regional display
- Added proper null data handling
- Streamlined backend with direct parser calls
- Removed unused Cloudflare deployments
- Updated documentation with critical library information

---

**⚠️ IMPORTANT**: Always refer to this document when working on the firmware. The Seeed_GFX library requirement is non-negotiable for proper ePaper display functionality.
