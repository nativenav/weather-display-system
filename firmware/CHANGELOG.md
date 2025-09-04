# Firmware Version Changelog

## v1.1 (September 4, 2025)

### 🌡️ **Temperature Display Fix**
- **Fixed**: Zero temperatures (0°C) now display correctly instead of showing "--"
- **Fixed**: Negative temperatures now display properly for alpine conditions
- **Improved**: Temperature validation logic - only hides truly invalid data (NaN or extreme values < -60°C or > 60°C)
- **Backend**: Compatible with improved upstream data validation system

### Technical Changes
- Updated temperature display logic in `drawWeatherData()` function
- Changed condition from `== 0.0 || isnan()` to proper range validation
- Version bumped in all display locations (startup, status footer)

### What You'll See After Updating
- **Before**: `AIR TEMP: -- deg C` for 0°C temperatures
- **After**: `AIR TEMP: 0.0 deg C` for actual freezing temperatures
- Negative alpine temperatures like `AIR TEMP: -5.2 deg C` now display correctly

---

## v1.0 (September 3, 2025)

### 🚀 **Initial Release**
- **Feature**: Auto-connect to multiple WiFi networks
- **Feature**: Auto-register with weather backend using MAC address
- **Feature**: 3-column weather display for regional stations
- **Feature**: Aggressive anti-ghosting for ePaper display
- **Feature**: Device identification via backend API
- **Feature**: Regional weather data (Chamonix Valley / Solent Marine)
- **Feature**: Dynamic unit display (km/h for alpine, knots for marine)
- **Feature**: Status footer with WiFi signal, memory usage, device ID, version

### Hardware Support
- XIAO ESP32C3 microcontroller
- Seeed 7.5" ePaper Display (UC8179)
- TFT_eSPI/Seeed_GFX graphics library

### Backend Integration
- Cloudflare Workers weather backend
- JSON API with device registration
- Heartbeat and identification system
- Regional endpoint support

---

## Installation Instructions

1. **Open in Arduino IDE**: Load `weather-display-integrated.ino`
2. **Install Libraries**:
   - ArduinoJson (by Benoit Blanchon)
   - Seeed_GFX (Seeed Studio)
   - TFT_eSPI (for ESP32 displays)
3. **Configure WiFi**: Update `secrets.h` with your network credentials
4. **Select Board**: XIAO ESP32C3
5. **Flash Device**: Upload to your ESP32C3

## Upgrading from v1.0 to v1.1

**Just flash the new firmware!** No configuration changes needed:
- Your WiFi settings will be preserved
- Device registration stays intact
- Only the temperature display behavior improves

After flashing v1.1, your device status footer will show `v1.1` and zero temperatures will display correctly.
