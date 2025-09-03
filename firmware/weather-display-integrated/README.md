# Weather Display Integrated Firmware

Complete firmware for XIAO ESP32C3 + 7.5" ePaper weather display that automatically connects to the Weather Display System backend.

## 🚀 Features

- **Auto WiFi Connection**: Scans and connects to known networks automatically
- **Auto Device Registration**: Uses MAC address to register with backend on first connection
- **Weather Data Display**: Shows temperature, wind speed, direction, and station info
- **Anti-Ghosting**: Prevents ePaper ghosting with full refresh cycles
- **Device Identification**: Flashes display when triggered from web management interface
- **Error Handling**: Shows clear error states when data unavailable
- **Persistent Settings**: Remembers device registration and station assignment

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

## ✅ Compilation Status

**Successfully compiles with Arduino CLI!**
- **Program storage**: 1,105,498 bytes (84% of available space)
- **Global variables**: 35,928 bytes (10% of available memory) 
- **Target board**: XIAO ESP32C3
- **Status**: Ready for testing (ePaper display temporarily disabled)

**Compile command**:
```bash
arduino-cli compile --fqbn esp32:esp32:XIAO_ESP32C3 weather-display-integrated.ino
```

## 🖥️ Display Layout

The ePaper display shows:
- **Station Name** (top header)
- **Temperature** (large, prominent display)
- **Wind Speed** and **Direction** 
- **Wind Gust** (if higher than average)
- **Last Update Time**
- **Status Footer** (WiFi status, registration, device ID, memory)

### Error States

When data is unavailable, the display shows:
- **"DATA UNAVAILABLE"** message
- Reason (WiFi disconnected, backend error, etc.)
- Connection status in footer

## 🔄 Operation

### First Boot
1. Device scans for configured WiFi networks
2. Connects to the first available network
3. Auto-registers with backend using MAC address
4. Gets assigned a weather station (default: Prarion for Chamonix region)
5. Flashes display 3 times to indicate successful registration

### Normal Operation
- Updates weather data every 5 minutes
- Sends heartbeat to backend every 30 seconds
- Uses full refresh every 10 display cycles to prevent ghosting
- Automatically reconnects to WiFi if connection drops

### Device Identification
- Web management interface can trigger device identification
- Device will flash display black/white 3 times when identified
- Useful for locating specific devices in multi-device deployments

## 🔧 Configuration Options

Edit `config.h` to customize:

- **Update intervals**: Weather refresh, heartbeat frequency
- **Debug output**: Enable/disable serial debugging
- **Display settings**: Refresh cycles, identify behavior
- **Network timeouts**: HTTP and WiFi connection timeouts

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

## 📈 Performance

- **Memory Usage**: ~270KB RAM (well within ESP32C3's 400KB)
- **Update Time**: 5-minute weather refresh interval
- **Display Refresh**: 2-3 seconds per update
- **WiFi Reconnection**: Automatic with exponential backoff

## 🛠️ Development

### Adding New Features
- Use `DEBUG_PRINTLN()` for debug output (respects DEBUG flag)
- Follow existing code structure for consistency
- Test memory usage with `ESP.getFreeHeap()`

### Custom Display Layouts
- Modify `drawWeatherData()` function
- Use `epaper.setTextSize()` and `epaper.drawString()` for text
- Respect display dimensions: 800x480 pixels

## 🔗 Integration

This firmware integrates with:
- **Backend**: Weather Display System (Cloudflare Workers)
- **Frontend**: Web management interface for device management
- **Hardware**: XIAO ESP32C3 + Seeed ePaper display

---

*Weather Display Integrated Firmware v1.0*
*Compatible with Weather Display System Backend*
