# Firmware v2.0.0 Migration Plan

## 🚨 Breaking Changes Overview

The backend v2.0.0 introduces standardized weather data parsing that affects the ESP32C3 firmware:

1. **All wind speeds now in meters per second (m/s)** - no longer regional units
2. **Proper null handling** - missing data is `null`, not `0` 
3. **Enhanced gust accuracy** - gust values are `null` when only instantaneous data available
4. **API response structure changes** - field name adjustments needed

## 📋 Required Firmware Changes

### 1. **Update Wind Data Parsing** 🔧 HIGH PRIORITY

**Current Issue:**
```cpp
// Lines 629-632: Assumes wind data always has values
stations[i].windSpeed = station["data"]["wind"]["avg"].as<float>();
stations[i].windGust = station["data"]["wind"]["gust"].as<float>();
stations[i].windDirection = station["data"]["wind"]["direction"].as<int>();
stations[i].windUnit = station["data"]["wind"]["unit"].as<String>();
```

**Required Fix:**
```cpp
// Proper null handling for v2.0.0 backend
JsonObject windData = station["data"]["wind"];

// Wind speed (always present, backend returns m/s)
if (windData["avg"].isNull()) {
    stations[i].windSpeed = 0.0; // Calm conditions
} else {
    stations[i].windSpeed = windData["avg"].as<float>();
}

// Wind gust (can be null for instantaneous readings)
if (windData["gust"].isNull()) {
    stations[i].windGust = NAN; // Use NAN to indicate no gust data
} else {
    stations[i].windGust = windData["gust"].as<float>();
}

stations[i].windDirection = windData["direction"].as<int>();
// Backend v2.0.0 always returns m/s
stations[i].windUnit = "m/s";
```

### 2. **Update Display Logic for Null Gust Values** 🔧 HIGH PRIORITY

**Current Issue:**
```cpp
// Line 340: Always displays gust value
epaper.drawString("WIND GUST: " + String(stations[i].windGust, 1) + " " + stations[i].windUnit, x, y);
```

**Required Fix:**
```cpp
// Enhanced gust display with null handling
String gustDisplay;
if (isnan(stations[i].windGust)) {
    gustDisplay = "WIND GUST: N/A (inst. only)";
} else {
    gustDisplay = "WIND GUST: " + String(stations[i].windGust, 1) + " " + stations[i].windUnit;
}
epaper.drawString(gustDisplay, x, y);
```

### 3. **Update API Response Structure Handling** 🔧 MEDIUM PRIORITY

**Current Structure (Lines 622-632):**
```cpp
// Check existing API structure compatibility
JsonObject weatherData = station["data"];
JsonObject tempData = weatherData["temperature"];
JsonObject windData = weatherData["wind"];

// Current: station["data"]["temperature"]["air"]
// Current: station["data"]["wind"]["avg"], ["gust"], ["direction"]
```

**Potential v2.0.0 Structure:**
```cpp
// Backend v2.0.0 might use direct field access
// Need to verify actual API response structure

// Option 1: Nested structure (current)
stations[i].temperature = station["data"]["temperature"]["air"].as<float>();
stations[i].windSpeed = station["data"]["wind"]["avg"].as<float>();

// Option 2: Flat structure (if backend changed)
stations[i].temperature = station["data"]["temperature"].as<float>();
stations[i].windSpeed = station["data"]["windSpeed"].as<float>();
stations[i].windGust = station["data"]["windGust"].as<float>();
stations[i].windDirection = station["data"]["windDirection"].as<int>();
```

### 4. **Add Wind Speed Unit Conversion for Display** 🔧 LOW PRIORITY

**Enhancement for User Experience:**
```cpp
// Add unit conversion functions for local display preferences
float convertWindSpeed(float speedMs, String targetUnit) {
    if (targetUnit == "kts") {
        return speedMs * 1.94384; // m/s to knots
    } else if (targetUnit == "kph") {
        return speedMs * 3.6; // m/s to km/h
    } else if (targetUnit == "mph") {
        return speedMs * 2.237; // m/s to mph
    }
    return speedMs; // Default: m/s
}

// Usage in display
String displayUnit = (currentRegionId == "chamonix") ? "kph" : "kts";
float displaySpeed = convertWindSpeed(stations[i].windSpeed, displayUnit);
String windSpeedDisplay = "WIND SPD: " + String(displaySpeed, 1) + " " + displayUnit;
epaper.drawString(windSpeedDisplay, x, y);
```

### 5. **Enhanced Error Handling for Null Data** 🔧 MEDIUM PRIORITY

**Current Temperature Handling (Lines 622-627):**
```cpp
// Limited null checking
if (station["data"]["temperature"]["air"].isNull() || 
    !station["data"]["temperature"]["air"].is<float>()) {
    stations[i].temperature = NAN; 
} else {
    stations[i].temperature = station["data"]["temperature"]["air"].as<float>();
}
```

**Enhanced Null Handling:**
```cpp
// Comprehensive null and range checking
JsonObject tempData = station["data"]["temperature"];
if (tempData.isNull() || tempData["air"].isNull()) {
    stations[i].temperature = NAN;
} else {
    float temp = tempData["air"].as<float>();
    // Validate temperature range (-60°C to +60°C)
    if (temp >= -60.0 && temp <= 60.0) {
        stations[i].temperature = temp;
    } else {
        stations[i].temperature = NAN; // Invalid temperature
    }
}
```

### 6. **Update Legacy Parser Compatibility** 🔧 LOW PRIORITY

**Current Legacy Parser (Lines 652-675):**
```cpp
// Legacy single station parser may need updates
stations[0].temperature = doc["data"]["temperature"]["air"].as<float>();
stations[0].windSpeed = doc["data"]["wind"]["avg"].as<float>();
stations[0].windGust = doc["data"]["wind"]["gust"].as<float>();
```

**Updated Legacy Parser:**
```cpp
// Handle potential structure changes and null values
JsonObject data = doc["data"];
if (data["temperature"].isNull()) {
    stations[0].temperature = NAN;
} else {
    stations[0].temperature = data["temperature"]["air"].as<float>();
}

if (data["wind"]["gust"].isNull()) {
    stations[0].windGust = NAN;
} else {
    stations[0].windGust = data["wind"]["gust"].as<float>();
}
```

## 🧪 Testing Requirements

### 1. **Data Parsing Tests**
```cpp
// Test cases for null value handling
void testNullValueParsing() {
    String testJson = R"({
        "data": {
            "temperature": {"air": null},
            "wind": {
                "avg": 5.2,
                "gust": null,
                "direction": 180
            }
        }
    })";
    
    // Should handle null temperature and gust gracefully
}
```

### 2. **Display Tests**
- Test "N/A" display for null gust values
- Test temperature display with "--" for null values  
- Test wind speed display in m/s
- Test unit conversion (if implemented)

### 3. **Station-Specific Tests**
- **Seaview**: Test historical vs live data (null gust scenarios)
- **Lymington**: Test enhanced vs current API responses
- **Alpine stations**: Test unit handling and altitude display

## 📅 Implementation Timeline

### Phase 1: Critical Fixes (Day 1)
- [ ] Update wind data parsing for null values
- [ ] Fix display logic for null gust values
- [ ] Update windUnit to always show "m/s"

### Phase 2: Enhanced Experience (Day 2)  
- [ ] Add comprehensive null value handling
- [ ] Implement display unit conversion (optional)
- [ ] Update legacy parser compatibility

### Phase 3: Testing & Validation (Day 3)
- [ ] Test with live v2.0.0 backend
- [ ] Validate all display scenarios
- [ ] Performance and memory optimization
- [ ] Update firmware version to v2.0.0

## 🔧 Configuration Updates

### Update `config.h`
```cpp
// Update firmware version
#define DEVICE_FIRMWARE_VERSION "2.0.0"

// Add display preference constants
#define DISPLAY_UNITS_REGIONAL 1  // Show regional units (kts/kph)
#define DISPLAY_UNITS_METRIC 0    // Show m/s only

// Default regional display units
#define CHAMONIX_DISPLAY_UNIT "kph"
#define SOLENT_DISPLAY_UNIT "kts"
```

## 🚀 Deployment Strategy

### 1. **Development Testing**
```bash
# Upload to test device
arduino-cli compile --fqbn esp32:esp32:XIAO_ESP32C3
arduino-cli upload --fqbn esp32:esp32:XIAO_ESP32C3 --port /dev/ttyUSB0

# Monitor serial output
arduino-cli monitor --port /dev/ttyUSB0 --config baudrate=115200
```

### 2. **Validation Checklist**
- [ ] Device connects to WiFi successfully  
- [ ] Backend API calls return v2.0.0 data format
- [ ] Display shows proper wind data with null handling
- [ ] Temperature displays "--" when unavailable
- [ ] Gust shows "N/A" for instantaneous readings
- [ ] No crashes or memory leaks during operation

### 3. **Production Rollout**
- [ ] Update firmware on all deployed devices
- [ ] Monitor device heartbeats for successful updates
- [ ] Verify data display accuracy across all stations
- [ ] Update documentation with new firmware version

## ✅ QA Checklist

### Data Display
- [ ] Wind speeds display correctly from m/s source
- [ ] Gust values show "N/A" when null (instantaneous only)
- [ ] Temperature shows "--" when null/unavailable
- [ ] Wind direction displays properly (0-359°)
- [ ] Timestamps formatted correctly

### Error Handling
- [ ] No crashes with null values
- [ ] Graceful fallback for invalid temperatures
- [ ] Proper error messages for API failures
- [ ] Memory usage remains stable

### Regional Behavior  
- [ ] Chamonix devices show appropriate stations
- [ ] Solent devices show appropriate stations
- [ ] Regional unit display (optional) works correctly
- [ ] Device registration maintains region assignment

### Hardware Integration
- [ ] ePaper display updates without ghosting
- [ ] WiFi connection remains stable
- [ ] Serial debugging shows proper data flow
- [ ] LED status indicators work correctly

## 📚 Related Documentation

- [`backend/CHANGELOG.md`](../backend/CHANGELOG.md) - Backend API changes
- [`FRONTEND_MIGRATION_PLAN.md`](./FRONTEND_MIGRATION_PLAN.md) - Frontend changes
- [`firmware/README.md`](../firmware/README.md) - Hardware setup guide
- Live API: https://weather-backend.nativenav.workers.dev/api/v1/stations

## 🔍 Debug Commands

### Serial Monitor Debug
```cpp
// Add debug output for data parsing
DEBUG_PRINTF("Wind Speed: %.1f m/s\n", stations[i].windSpeed);
DEBUG_PRINTF("Wind Gust: %s\n", isnan(stations[i].windGust) ? "NULL" : String(stations[i].windGust, 1).c_str());
DEBUG_PRINTF("Temperature: %s\n", isnan(stations[i].temperature) ? "NULL" : String(stations[i].temperature, 1).c_str());
```

### API Response Testing
```bash
# Test v2.0.0 API directly
curl "https://weather-backend.nativenav.workers.dev/api/v1/weather/region/chamonix?mac=test123"

# Verify response structure matches firmware expectations
```

---

**Priority**: HIGH  
**Estimated Effort**: 1-2 days  
**Breaking**: Yes - requires immediate firmware updates for compatibility
