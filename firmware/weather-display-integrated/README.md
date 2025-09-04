# Weather Display Integrated Firmware v2.0.0

Complete firmware for XIAO ESP32C3 + 7.5" ePaper weather display with three-column regional weather display, compatible with Weather Display System Backend v2.0.0.

## 🚀 Features v2.0.0

- **Three-Column Regional Display**: Shows all 3 stations per region in professional layout
- **Enhanced Null Data Handling**: Proper "N/A" and "--" display for missing data
- **Regional Unit Conversion**: Displays km/h for alpine stations, knots for marine stations
- **Backend v2.0.0 Compatibility**: Works with standardized m/s wind speed API
- **Aggressive Anti-Ghosting**: Perfect ePaper display quality with zero ghosting artifacts
- **Auto WiFi Connection**: Scans and connects to known networks automatically
- **Auto Device Registration**: Uses MAC address to register with backend on first connection
- **Device Identification**: Flashes display when triggered from web management interface
- **Error Handling**: Shows clear error states when data unavailable
- **Persistent Settings**: Remembers device registration and region assignment

## 🔧 Hardware Requirements

- **XIAO ESP32C3** microcontroller
- **Seeed Studio 7.5" ePaper Display** with driver board (UC8179)
- Proper pin connections as defined in `driver.h`

## 📚 Arduino Libraries Required

Install these libraries via Arduino IDE Library Manager:

1. **ESP32 Board Package** (Espressif Systems)
2. **ArduinoJson** (by Benoit Blanchon) - v6.x
3. **Seeed_GFX** - Install from GitHub: https://github.com/Seeed-Studio/Seeed_GFX

## ⚙️ Setup Instructions

### 1. Configure WiFi Credentials

1. Copy `secrets.h` to a new file (keep the same name)
2. Edit the WiFi networks array with your actual credentials:

```cpp
const WiFiNetwork WIFI_NETWORKS[] = {
  {"YourHomeWiFi", "your_password"},
  {"YourOfficeWiFi", "office_password"}
};
```

3. Make sure `secrets.h` is in your `.gitignore` to prevent committing passwords

### 2. Arduino IDE Configuration

1. Install ESP32 board package if not already installed
2. Select Board: **"XIAO_ESP32C3"** 
3. Select correct COM port for your device
4. Set Upload Speed: **921600** (or lower if upload fails)

### 3. Upload Firmware

1. Open `weather-display-integrated.ino` in Arduino IDE
2. Verify all required files are in the same folder:
   - `weather-display-integrated.ino`
   - `driver.h`
   - `config.h`
   - `secrets.h`
3. Compile and upload to your XIAO ESP32C3

## 🖥️ Display Layout v2.0.0

The 7.5" ePaper display shows a professional three-column layout:

### Header Section
- **Region Name** (left) - "Chamonix Valley" or "Solent Marine"
- **Current Date** (right) - "04 Sep 2025" format
- Horizontal separator line

### Three-Column Weather Data
Each column displays one weather station:
- **Station Name** (large font) - "Prarion", "Seaview", etc.
- **Wind Direction** - "WIND DIR: 180 deg"
- **Wind Speed** - "WIND SPD: 15.2 kph" (regional units)
- **Wind Gust** - "WIND GUST: 18.5 kph" or "WIND GUST: N/A (inst.)"
- **Temperature** - "AIR TEMP: 12.5 deg C" or "AIR TEMP: -- deg C"
- **Last Update** - "UPDATED: 14:25 UTC"
- Vertical separator lines between columns

### Status Footer
- **WiFi Signal** - "WiFi: -65dBm"
- **Memory Usage** - "Mem: 75%"
- **Device ID** - "ID: a1b2c3"
- **Firmware Version** - "v2.0.0"

### Error States v2.0.0

When data is unavailable, the display shows:
- **"DATA UNAVAILABLE"** message (large, prominent)
- Specific reason:
  - "WiFi Disconnected" - No network connection
  - "Backend Error" - API communication failure
  - "Waiting for data..." - Initial startup state
- Full status footer with connection diagnostics

## 🔄 Operation

### First Boot
1. Device scans for configured WiFi networks
2. Connects to the first available network
3. Auto-registers with backend using MAC address
4. Gets assigned a weather station (default: Prarion for Chamonix region)
5. Flashes display 3 times to indicate successful registration

### Normal Operation v2.0.0
- Updates weather data every **3 minutes** (improved responsiveness)
- Sends heartbeat to backend every 30 seconds
- **Aggressive anti-ghosting**: Full refresh with 3x flash clearing every update
- **Perfect display quality**: 5-6 second anti-ghosting sequence eliminates all artifacts
- Automatically reconnects to WiFi if connection drops
- **Regional unit display**: Alpine stations show km/h, marine stations show knots
- **Enhanced null handling**: Missing gust data shows "N/A (inst.)", missing temperature shows "--"

### Device Identification
- Web management interface can trigger device identification
- Device will flash display black/white 3 times when identified
- Useful for locating specific devices in multi-device deployments

## 🔧 Configuration Options v2.0.0

Edit `config.h` to customize:

### Core Settings
- **Update intervals**: Weather refresh (3 min), heartbeat frequency (30 sec)
- **Debug output**: Enable/disable serial debugging
- **Backend URL**: Weather Display System API endpoint

### v2.0.0 Display Settings
- **Anti-ghosting**: Flash clear cycles (3), delay timing (400ms)
- **Regional units**: Enable/disable unit conversion
- **Display units**: "kph" for alpine, "kts" for marine
- **JSON buffer**: 4KB for 3-station parsing

### Network & Error Handling
- **HTTP timeouts**: Connection and retry settings
- **WiFi recovery**: Reconnection attempts and timeouts
- **Temperature validation**: Range checking (-60°C to +60°C)
- **Null data handling**: Enhanced missing data detection

## 🐛 Troubleshooting

### Display Issues
- Verify Seeed_GFX library is installed
- Check pin connections match `driver.h` definitions
- Try power cycling the device

### WiFi Connection Issues
- Ensure WiFi network is 2.4GHz (ESP32C3 doesn't support 5GHz)
- Verify credentials in `secrets.h`
- Check serial monitor for connection debug messages

### Backend Communication Issues
- Verify backend URL in `config.h` is correct
- Check that Weather Display System backend is running
- Monitor serial output for HTTP error codes

### Memory Issues
- Monitor free heap in serial output
- Reduce `JSON_BUFFER_SIZE` if memory constrained
- Ensure no memory leaks in custom modifications

## 📊 Serial Monitor Output

Set baud rate to **115200** to see debug output:
- Device startup and MAC address
- WiFi connection status
- Weather data updates
- HTTP response codes
- Memory usage statistics

## 🔒 Security Notes

- Device uses MAC address for identification (simple but sufficient for hobbyist use)
- Communications are over HTTPS
- No sensitive data stored on device beyond WiFi credentials
- Backend registration is automatic and requires no manual API keys

## 📈 Performance v2.0.0

- **Memory Usage**: ~280KB RAM for 3-station parsing (well within ESP32C3's 400KB)
- **Update Time**: 3-minute weather refresh interval (improved responsiveness)
- **Display Refresh**: 5-6 seconds with aggressive anti-ghosting (perfect quality)
- **Data Processing**: 4KB JSON buffer for regional weather with 3 stations
- **WiFi Reconnection**: Automatic with retry logic
- **Anti-Ghosting**: Triple flash clearing + intensive pixel reset = zero artifacts

## 🛠️ Development

### Adding New Features
- Use `DEBUG_PRINTLN()` for debug output (respects DEBUG flag)
- Follow existing code structure for consistency
- Test memory usage with `ESP.getFreeHeap()`

### Custom Display Layouts v2.0.0
- **Three-column layout**: Modify `drawWeatherData()` function
- **Unit conversion**: Use `convertWindSpeed()` for regional preferences
- **Null handling**: Check `isnan()` for missing data display
- **Layout**: 800x480 pixels, 3 columns of 260px each
- **Typography**: Size 3 headers, size 2 data fields, enhanced spacing

## 🔗 Integration v2.0.0

This firmware integrates with:
- **Backend**: Weather Display System v2.0.0 (Cloudflare Workers)
- **Frontend**: Web management interface for device management
- **Hardware**: XIAO ESP32C3 + Seeed 7.5" ePaper display
- **API**: Regional endpoints with 3-station JSON responses
- **Units**: Backend m/s → Regional display units (km/h, knots)

## 🆕 v2.0.0 Migration Notes

### Breaking Changes from v1.x
- **Backend API**: Now requires v2.0.0 backend (standardized units)
- **Display Layout**: Changed from single station to three-column regional
- **Data Structure**: Enhanced null handling for missing data
- **Update Interval**: Reduced from 5 minutes to 3 minutes

### New Features
- ✅ **Three-column layout** showing all regional stations
- ✅ **Regional unit conversion** (km/h for alpine, knots for marine)  
- ✅ **Enhanced null handling** ("N/A" for missing gust, "--" for temperature)
- ✅ **Aggressive anti-ghosting** (perfect display quality)
- ✅ **Backend v2.0.0 compatibility** (standardized m/s wind speeds)

### Upgrade Path
1. **Flash v2.0.0 firmware** - settings and WiFi preserved
2. **Backend compatibility** - automatic with v2.0.0 API
3. **Display changes** - three-column layout appears immediately
4. **No configuration needed** - regional units auto-detected

---

*Weather Display Integrated Firmware v2.0.0*  
*Compatible with Weather Display System Backend v2.0.0*
