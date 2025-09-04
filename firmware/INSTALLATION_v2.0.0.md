# Firmware v2.0.0 Installation Guide

## Prerequisites

### Hardware Requirements
- **XIAO ESP32C3** development board
- **7.5" ePaper Display** (UC8179 controller)
- **WiFi Network** with internet access
- **USB-C Cable** for programming

### Software Requirements
- **Arduino IDE 2.x** or **PlatformIO**
- **ESP32 Board Package** (latest version)
- **Required Libraries:**
  - `TFT_eSPI` (for ePaper display)
  - `ArduinoJson` (version 6.x) - **NEW for v2.0.0**
  - `ArduinoOTA` (for wireless updates)

## Installation Steps

### 1. Install Required Libraries

#### Arduino IDE
1. Open **Library Manager** (Tools → Manage Libraries)
2. Search for and install:
   - **ArduinoJson** by Benoit Blanchon (version 6.x)
   - **TFT_eSPI** by Bodmer
3. Restart Arduino IDE

#### PlatformIO
Add to your `platformio.ini`:
```ini
lib_deps = 
    bblanchon/ArduinoJson@^6.21.3
    bodmer/TFT_eSPI@^2.5.0
```

### 2. Configure WiFi Credentials

Create or update `wifi_credentials.h`:

```cpp
// WiFi Credentials for Weather Display Client
#pragma once

// Primary WiFi Network
#define WIFI_SSID "Your_WiFi_Network"
#define WIFI_PASSWORD "Your_WiFi_Password"

// Optional: Backup WiFi Network
//#define WIFI_SSID_BACKUP "Backup_Network" 
//#define WIFI_PASSWORD_BACKUP "Backup_Password"
```

**⚠️ Security Note**: Never commit `wifi_credentials.h` to version control!

### 3. Hardware Connection

Connect ePaper display to XIAO ESP32C3:

```
ePaper Display    XIAO ESP32C3
--------------    ------------
VCC               3.3V
GND               GND  
DIN               D10 (MOSI)
CLK               D8  (SCK)
CS                D3
DC                D6
RST               D5  
BUSY              D4
```

### 4. Upload Firmware

1. **Select Board**: XIAO_ESP32C3 in Arduino IDE
2. **Select Port**: Choose the correct USB port
3. **Compile**: Verify code compiles without errors
4. **Upload**: Flash firmware to device
5. **Monitor**: Open Serial Monitor (115200 baud) to view startup logs

## First Boot Sequence

### Expected Startup Output
```
========================================
  Weather Display Client v2.0.0
  XIAO ESP32C3 + 7.5" ePaper
  Backend API v2.0.0 Compatible
========================================
Device MAC: AA:BB:CC:DD:EE:FF
Device ID: aabbccddeeff
Initializing ePaper display...
ePaper display initialized successfully
Initializing WiFi...
Connecting to WiFi: Your_Network
....................
WiFi connected successfully!
IP Address: 192.168.1.100
Signal Strength: -45 dBm
Free heap after setup: 250000 bytes
Setup complete! Starting weather updates...
```

### Display Verification
The ePaper should show:
1. **Startup Message**: "Weather Display Client Starting up..."
2. **Version Info**: "Firmware: v2.0.0"
3. **Backend Info**: "Backend: API v2.0.0"
4. **Device MAC**: "MAC: AA:BB:CC:DD:EE:FF"

### First Weather Update
```
Updating weather data...
Using v2.0.0 API mode (JSON)
Fetching: https://weather-backend.nativenav.workers.dev/api/v1/weather/prarion?mac=aabbccddeeff&firmware=2.0.0
Received 280 bytes
Device auto-registered with backend!
Detected JSON response
Parsing JSON weather data (v2.0.0)...
Parsed JSON into 8 display lines
```

## Configuration Options

### Station Selection
Edit `config.h` to change default station:

```cpp
// Available stations:
#define STATION_ID "prarion"        // Les Houches (default)
#define STATION_ID "tetedebalme"    // Tête de Balme  
#define STATION_ID "planpraz"       // Planpraz
#define STATION_ID "brambles"       // UK Marine
#define STATION_ID "seaview"        // UK Marine
#define STATION_ID "lymington"      // UK Marine
```

### Compatibility Mode
For testing with legacy backend:

```cpp
#define BACKEND_V2_COMPATIBLE false  // Disable v2.0.0 features
#define EXPECT_WIND_MS false         // Use legacy unit handling
#define HANDLE_NULL_VALUES false     // Disable enhanced null handling
```

### Update Intervals
Adjust refresh frequency:

```cpp
#define REFRESH_INTERVAL (5 * 60 * 1000)   // 5 minutes (default)
#define REFRESH_INTERVAL (2 * 60 * 1000)   // 2 minutes (more frequent)
#define REFRESH_INTERVAL (10 * 60 * 1000)  // 10 minutes (less frequent)
```

## Device Registration Verification

### Check Backend Registration
1. Visit **https://wds.nativenav.com**
2. Go to **Devices Tab**
3. Look for your device with MAC address
4. Device should show as **Online** with firmware **v2.0.0**

### Manual Registration Test
```bash
# Test device registration via curl
curl "https://weather-backend.nativenav.workers.dev/api/v1/weather/prarion?mac=YOUR_MAC_HERE&firmware=2.0.0" \
  -H "User-Agent: ESP32C3-WeatherDisplay/2.0.0" \
  -H "Accept: application/json"
```

## Troubleshooting

### Common Issues

#### 1. Compilation Errors
```
ArduinoJson.h: No such file or directory
```
**Solution**: Install ArduinoJson library v6.x via Library Manager

#### 2. WiFi Connection Failed  
```
WiFi connection failed. Starting in demo mode...
```
**Solutions**:
- Verify WiFi credentials in `wifi_credentials.h`
- Check WiFi signal strength at device location
- Ensure 2.4GHz WiFi (ESP32C3 doesn't support 5GHz)

#### 3. ePaper Display Issues
```
ePaper not enabled! Check driver.h configuration
```
**Solution**: Verify `driver.h` has `#define EPAPER_ENABLE`

#### 4. JSON Parsing Errors
```
JSON parsing failed: InvalidInput
```
**Solutions**:
- Check network connectivity
- Verify backend API is responding
- Try with `BACKEND_V2_COMPATIBLE false` for legacy mode

#### 5. Device Not Registering
**Check**:
- MAC address format in logs
- Backend response in Serial Monitor
- Network connectivity to backend API

### Debug Mode
Enable detailed logging:

```cpp
#define DEBUG_ENABLED true
```

Monitor via Serial Console at 115200 baud for detailed diagnostics.

## OTA Updates (Over-The-Air)

### Enable OTA Updates
Firmware v2.0.0 includes OTA capability:

1. **Network Discovery**: Device appears as "weather-display" on network
2. **Arduino IDE**: Use "Tools → Port → weather-display (192.168.x.x)"
3. **Password**: Default is "weather123" (change in code)
4. **Upload**: Select network port and upload as normal

### Security
⚠️ **Change default OTA password** in production:

```cpp
ArduinoOTA.setPassword("your_secure_password_here");
```

## Support

### Documentation
- **Firmware Changelog**: See `FIRMWARE_v2.0.0_CHANGELOG.md`
- **Backend API**: https://weather-backend.nativenav.workers.dev/health
- **Web Interface**: https://wds.nativenav.com

### Diagnostics
- **Serial Monitor**: 115200 baud rate
- **Memory Usage**: Monitored every 30 seconds
- **Network Status**: LED indicates WiFi connection status

---

*Firmware v2.0.0 Installation Guide*  
*ESP32C3 Weather Display System - Backend API v2.0.0 Compatible*
