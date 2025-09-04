# Firmware v2.0.0 Changelog

## Overview
Major firmware update for ESP32C3 weather display clients to support backend API v2.0.0 with enhanced device registration, JSON parsing, and improved data handling.

## 🆕 New Features

### Device Auto-Registration
- **MAC Address Integration**: Device automatically sends MAC address and firmware version in API requests
- **Backend Registration**: Devices auto-register with backend on first connection
- **Unique Device ID**: MAC address used for device identification and management
- **Enhanced User-Agent**: Proper `ESP32C3-WeatherDisplay/2.0.0` identification

### JSON Data Parsing
- **Dual Format Support**: Handles both JSON and legacy display format responses
- **ArduinoJson Integration**: Added ArduinoJson library for robust JSON parsing
- **Auto-Detection**: Automatically detects response format and uses appropriate parser
- **Null Value Handling**: Proper handling of missing/null weather data fields

### Wind Unit Standardization
- **Backend v2.0.0 Ready**: Expects wind speeds in m/s from standardized backend
- **Local Unit Conversion**: Converts m/s to knots for display consistency
- **Backward Compatible**: Still handles legacy formats with unit specifications
- **Configuration Flags**: Easy switching between unit expectations

### Enhanced Error Handling
- **Improved JSON Validation**: Better error detection for malformed data
- **Null Data Handling**: Graceful handling of missing gust data with user feedback
- **Registration Feedback**: Clear indication when device auto-registers (HTTP 201)
- **Enhanced Debug Output**: More detailed logging for troubleshooting

## 🔧 Technical Changes

### Configuration Updates (`config.h`)
```cpp
// New version identification
#define FIRMWARE_VERSION "2.0.0"
#define USER_AGENT "ESP32C3-WeatherDisplay/2.0.0"

// Backend v2.0.0 compatibility flags
#define BACKEND_V2_COMPATIBLE true
#define EXPECT_WIND_MS true
#define HANDLE_NULL_VALUES true
```

### API Request Changes
```cpp
// Old format
/api/v1/weather/prarion?format=display

// New format with device registration
/api/v1/weather/prarion?mac=aabbccddeeff&firmware=2.0.0
```

### JSON Parsing Function
- **parseWeatherJson()**: New function to handle v2.0.0 JSON responses
- **Wind Unit Conversion**: Automatic m/s to knots conversion for display
- **Null Value Display**: Shows "N/A (instant only)" for missing gust data
- **Memory Efficient**: Uses DynamicJsonDocument with 1024-byte buffer

### Display Enhancements
- **Startup Information**: Shows firmware version and device MAC on startup
- **Backend Compatibility**: Displays "Backend: API v2.0.0" during initialization
- **Registration Status**: Visual feedback when device registers with backend

## 🔄 Compatibility

### Backward Compatibility
- ✅ **Current Backend**: Works with existing backend (still provides unit fields)
- ✅ **Legacy APIs**: Fallback to display format when JSON parsing fails
- ✅ **Existing Displays**: Same display layout and information hierarchy

### Forward Compatibility  
- ✅ **Backend v2.0.0**: Ready for standardized backend deployment
- ✅ **Unit Standardization**: Handles m/s wind speeds from v2.0.0 backend
- ✅ **Device Management**: Fully compatible with frontend device management
- ✅ **Null Handling**: Graceful degradation when data is missing

## 📋 Testing Results

### Current Backend (v1 format)
```json
{
  "schema": "weather.v1",
  "stationId": "prarion", 
  "timestamp": "2025-09-04T13:54:10.330Z",
  "data": {
    "wind": {
      "avg": 6.3,
      "gust": 9,
      "direction": 315,
      "unit": "km/h"  // Still includes unit field
    }
  },
  "deviceRegistration": null
}
```

### Device Registration
- **MAC Parameter**: `?mac=aabbccddeeff&firmware=2.0.0`
- **User-Agent**: `ESP32C3-WeatherDisplay/2.0.0`
- **Response**: JSON format with device registration status
- **Registration**: Automatic backend device registration on first connect

## 🚀 Deployment

### Requirements
- **ArduinoJson Library**: Must be installed in Arduino IDE/PlatformIO
- **WiFi Credentials**: Updated `wifi_credentials.h` file required
- **ESP32C3 Hardware**: XIAO ESP32C3 + 7.5" ePaper display

### Installation
1. Install ArduinoJson library (version 6.x)
2. Update `wifi_credentials.h` with network details
3. Upload firmware v2.0.0 to ESP32C3 device
4. Device will auto-register on first backend connection
5. Manage device via web interface at https://wds.nativenav.com

### Configuration Options
- **BACKEND_V2_COMPATIBLE**: Enable/disable v2.0.0 features
- **EXPECT_WIND_MS**: Toggle wind unit expectations
- **HANDLE_NULL_VALUES**: Enable enhanced null data handling

## 🎯 Next Steps

1. **Backend v2.0.0 Deployment**: Ready for standardized backend rollout
2. **Production Testing**: Verify with real weather stations
3. **Multiple Device Testing**: Test device registration with multiple units
4. **OTA Updates**: Deploy via wireless update system

---

*Firmware v2.0.0 - Backend API v2.0.0 Compatible*
*ESP32C3 Weather Display System*
