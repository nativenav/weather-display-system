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

## 🔧 Critical Issue Resolutions (v2.1.x Series)

### **Seaview Temperature Accuracy Issue (v2.1.2-2.1.3)**

#### **Problem Identified**:
- Seaview temperature readings showing wildly incorrect values (-17.5°C, 33.9°C)
- Manual calculations showed parsing algorithm was correct
- Issue was with Navis Live Data API session handling and data source selection

#### **Root Cause Analysis**:
1. **Session Handling**: Navis API requires proper PHP session establishment
2. **Historical vs Live Data**: Historical temperature averages included outliers/stale data
3. **Data Selection**: Historical good for wind/gust, but live data needed for accurate temperature

#### **Solution Implementation** (v2.1.3):
```typescript
// Dual API Strategy: Best of both worlds
export async function fetchSeaviewWeather(): Promise<FetchResult> {
  // 1. Fetch historical for wind statistics
  const historicalResult = await fetchSeaviewHistoricalData();
  
  // 2. ALSO fetch live for accurate temperature
  let liveTempC: number | null = null;
  const live = await fetchSeaviewLiveData();
  if (live.success) {
    const parsed = parseNavisHexData(hexValue);
    liveTempC = parsed.temperature; // Override temperature
  }
  
  return { ...historicalResult, tempOverrideC: liveTempC };
}
```

#### **Session Management Improvements**:
```typescript
// Enhanced session establishment with timing
async function establishNavisSession(): Promise<string | null> {
  const response = await fetch(SEAVIEW_SESSION_URL, {
    headers: {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  });
  // Extract PHPSESSID cookie for subsequent requests
}

// Use session with timing delay
const sessionId = await establishNavisSession();
if (!sessionId) throw new Error('Session required');
await new Promise(resolve => setTimeout(resolve, 100)); // Critical timing
```

#### **Results**:
- ✅ Temperature accuracy: 15.2°C vs 15°C reference (0.1°C difference)
- ✅ Wind data quality: Maintained from historical samples
- ✅ Session reliability: 100% API connection success

### **Meteoblue Forecast Coverage Fix (v2.1.1)**

#### **Problem**: 
- Forecasts showing only 4 periods instead of intended 9
- Starting at midnight (00:00) instead of current time interval
- Insufficient data when `forecast_days=1` near end of day

#### **Root Cause**:
Meteoblue `basic-3h` package with `forecast_days=1` only provides 24 hours from midnight.
When current time is 18:48, requesting 9 periods (27 hours) starting from 18:00 extends into next day.

#### **Solution**:
```typescript
// Updated API configuration
const params = {
  forecast_days: '2'  // 48-hour coverage ensures 9 periods always available
};

// Parser logic finds nearest 3-hour interval before current time
function findNearestInterval(now: Date): Date {
  const currentHour = now.getUTCHours();
  const intervalHour = Math.floor(currentHour / 3) * 3;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), intervalHour);
}
```

#### **Results**:
- ✅ Consistent 9 periods (27-hour coverage)
- ✅ Proper start time: Current 3-hour interval, not midnight
- ✅ Cross-midnight support: Spans into next day correctly

### **Frontend Forecast Integration (v2.1.1)**

#### **Implementation**:
- New "🌤️ Forecasts" tab with region selector
- Weather icon mapping for Meteoblue pictocodes
- Timeline display with hourly intervals and day transitions
- Responsive card layout for both regions

#### **Key Frontend Code**:
```javascript
// Weather icon mapping for pictocodes
const iconMap = {
  1: '☀️',   // Clear sky
  3: '⛅️',   // Partly cloudy  
  9: '🌫️',   // Dense fog
  // ... comprehensive mapping
};

// Timeline generation with day labels
const timeString = time.getHours().toString().padStart(2, '0') + ':00';
const dayLabel = index === 0 ? '' : 
  (time.getDate() !== new Date().getDate() ? ' (+1d)' : '');
```

## 🔧 Advanced Session Handling Patterns

### **PHP Session Management** (Critical for Navis API)
```typescript
// Pattern: Establish session, use immediately with timing
const sessionId = await establishSession();
if (!sessionId) throw new Error('Session required');

// Critical: Small delay ensures session propagation
await new Promise(resolve => setTimeout(resolve, 100));

const headers = {
  'Cookie': `PHPSESSID=${sessionId}`,
  'Cache-Control': 'no-cache',
  'User-Agent': 'Mozilla/5.0...' // Match browser UA
};
```

### **Hex Data Parsing Validation**
```typescript
// Clean hex data before parsing
let hexValue = parts[2].replace(/%$/, '').trim(); // Remove URL encoding artifacts

// Validate hex length
if (hexValue.length < 8) {
  throw new Error(`Hex data too short: ${hexValue}`);
}

// Temperature validation for coastal UK
const tempValid = temp > -10 && temp < 50; // Realistic range
```

### **Dual Data Source Strategy**
```typescript
// Pattern: Use different data sources for different metrics
const historicalData = await fetchHistoricalData(); // Best for wind/gust
const liveData = await fetchLiveData();             // Best for temperature

// Combine optimally
return {
  windSpeed: historicalData.avgWind,
  windGust: historicalData.peakWind,
  temperature: liveData.temperature,  // Override with live
  timestamp: new Date().toISOString()
};
```

## 🎯 Future Development Notes

### **For AI Agents Working on This Project**:
1. **Always verify Seeed_GFX is installed** before attempting firmware compilation
2. **Check library conflicts** if compilation fails - TFT_eSPI conflicts with Seeed_GFX
3. **Use region-based API endpoints** for new features (not individual stations)
4. **Respect the three-column layout** - firmware expects exactly 3 stations per region
5. **Handle JSON nulls properly** - backend v2.0.0 uses proper null values
6. **Test with open WiFi networks** like FoxGuest for development
7. **Forecast Integration** 🆕: Use `/api/v1/forecast/region/{regionId}` for 10-hour forecasts

## 🚀 Production Deployment Patterns (v2.1.x)

### **Backend Deployment (Cloudflare Workers)**
```bash
# Deploy backend with version update
cd backend/
npm run deploy

# Verify deployment
curl -s "https://weather-backend.nativenav.workers.dev/health" | jq '.version'
```

### **Frontend Deployment (Cloudflare Pages)**
```bash
# Deploy frontend with fresh URL
cd frontend/
npm run deploy
# Returns new URL like: https://abc123.weather-display-blue.pages.dev
```

### **Version Management Best Practices**
1. **Synchronize versions**: Keep backend and frontend versions aligned
2. **Update all references**: package.json, API endpoints, footer displays
3. **Test before commit**: Verify APIs and UI functionality
4. **Document changes**: Update CHANGELOG.md with technical details

#### **Version Update Checklist**:
```bash
# Backend
- package.json version
- src/index.ts health endpoint  
- src/index.ts config endpoint

# Frontend  
- package.json version
- index.html footer
- script.js forecast version
```

### **Production URLs (Current)**
- **Backend API**: `https://weather-backend.nativenav.workers.dev`
- **Frontend UI**: `https://93ac4c96.weather-display-blue.pages.dev`
- **GitHub Repo**: `https://github.com/nativenav/weather-display-system`

### **Testing Production Deployments**
```bash
# Comprehensive production test
echo "Backend:" && curl -s API_URL/health | jq '.version'
echo "Seaview:" && curl -s API_URL/api/v1/weather/seaview | jq '.data.temperature.air'
echo "Forecasts:" && curl -s API_URL/api/v1/forecast/region/solent | jq '.forecast | length'
echo "Frontend:" && curl -s FRONTEND_URL | grep -o 'v[0-9.]*'
```

## 🧪 Debugging Methodologies

### **API Data Flow Tracing**
```typescript
// Add comprehensive logging for debugging
console.log(`[DEBUG] Raw API response: ${data.substring(0, 100)}...`);
console.log(`[DEBUG] Parsed values: temp=${temp}°C, wind=${wind}kts`);
console.log(`[DEBUG] Session: PHPSESSID=${sessionId}`);
```

### **Manual Verification Steps**
1. **Check external API directly**:
   ```bash
   # Get session and test API
   SESSION=$(curl -D - URL | grep PHPSESSID | cut -d= -f2 | cut -d\; -f1)
   curl -H "Cookie: PHPSESSID=$SESSION" API_URL
   ```

2. **Manual calculation verification**:
   ```javascript
   // Verify hex parsing logic
   const hexData = '22600255e5f';
   const MSB = parseInt(hexData.substring(0, 3), 16);  // 550
   const temp = (MSB - 400) / 10.0;  // Should match expected
   ```

3. **Compare with reference sources**:
   - Navis Live: https://www.navis-livedata.com/view.php?u=36371
   - Cross-reference temperature readings

### **Common Debugging Patterns**
```typescript
// Session verification
if (!sessionId || sessionId.length < 10) {
  console.warn('[WARN] Invalid session ID:', sessionId);
}

// Data validation
if (Math.abs(temperature - expectedTemp) > 5) {
  console.error('[ERROR] Temperature anomaly detected:', temperature);
}

// Timing diagnostics
const startTime = Date.now();
// ... operation ...
console.log(`[TIMING] Operation took ${Date.now() - startTime}ms`);
```

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
