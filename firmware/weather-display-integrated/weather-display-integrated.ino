/**
 * Weather Display Integrated v2.1.4 - XIAO ESP32C3 + 7.5" ePaper
 * 
 * Power-optimized three-column display with enhanced visual hierarchy and minimal flashing
 * Auto-registers with backend using MAC address as device ID
 * Compatible with Weather Display System Backend v2.0.0+
 * 
 * Hardware: XIAO ESP32C3 + Seeed 7.5" ePaper Display (UC8179)
 * Backend: Weather Display System (Cloudflare Workers) v2.0.0+
 * 
 * Features:
 * - Auto-connect to known WiFi networks
 * - Auto-register with backend on first connection  
 * - Three-column regional weather display (3 stations per region)
 * - Enhanced null data handling (proper "N/A" and "--" display)
 * - Regional unit conversion (m/s to km/h for alpine, knots for marine)
 * - Power-optimized: Combined operations every 3 minutes with sleep capability
 * - Optimized anti-ghosting: 2-flash cycle for faster updates
 * - Enhanced layout: Last updated in footer, no redundant headers
 * - Show connection status and errors
 * - MAC-based device identification
 * - Web-triggered device identification (flash display)
 * 
 * v2.1.4 Changes (Enhanced Visual Hierarchy):
 * - Added horizontal lines under station names for better visual separation
 * - Enhanced professional appearance with clear section divisions
 * 
 * v2.1.3 Changes (Refined Layout):
 * - Fixed footer font size (reverted to bitmap for better fit)
 * - Increased weather data line spacing by 50% (better readability)
 * - Fixed null wind gust display ("--" instead of "N/A (inst.)")
 * - Optimized overall layout balance
 * 
 * v2.1.2 Changes (Enhanced Typography):
 * - Upgraded to GFX Free Fonts for professional appearance
 * - FreeSans fonts for main weather data (smooth, readable)
 * - Optimized footer positioning (closer to bottom)
 * - Improved layout spacing and visual hierarchy
 * 
 * v2.1.1 Changes (Minimal Flashing):
 * - Reduced anti-ghosting to single flash cycle (minimal visual disruption)
 * - Simplified identify sequence to single flash (faster response)
 * - Optimized timing delays (200ms → 100ms)
 * - Removed all extra clearing sequences for smooth operation
 * 
 * v2.1.0 Changes (Power & UX Optimizations):
 * - Combined heartbeat, WiFi check, and weather update (3-min cycles)
 * - Moved last updated time to footer (applies to all 3 stations)
 * - Removed redundant region header to maximize display space
 * - Enhanced power management with deep sleep capability
 * 
 * v2.0.0 Foundation:
 * - Compatible with backend API v2.0.0 (all wind speeds in m/s)
 * - Proper null handling for missing gust and temperature data
 * - Regional unit display conversion for user-friendly formats
 * - Enhanced error handling and data validation
 * 
 * Libraries Required:
 * - WiFi (ESP32 core)
 * - HTTPClient (ESP32 core) 
 * - ArduinoJson (by Benoit Blanchon)
 * - Seeed_GFX (Seeed Studio)
 * - Preferences (ESP32 core)
 */

#include "TFT_eSPI.h"
#include "driver.h"
#include "config.h" 
#include "secrets.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <esp_sleep.h>  // v2.1.0: ESP32 deep sleep functionality

// ===============================================================================
// GLOBAL VARIABLES  
// ===============================================================================

#ifdef EPAPER_ENABLE
EPaper epaper;
#endif

// Device identification
String deviceMAC;
String deviceId;
bool isRegistered = false;

// Network and timing
unsigned long lastWeatherUpdate = 0;
unsigned long lastHeartbeat = 0;
unsigned long lastWiFiCheck = 0;
bool wifiConnected = false;
int wifiReconnectAttempts = 0;

// Weather data - now supports 3 stations per region with v2.0.0 backend compatibility
String currentRegionId = "";
String regionDisplayName = "";
struct StationData {
  String stationName;
  float temperature;    // NAN if null/unavailable
  float windSpeed;      // Always available from backend (0.0 = calm)
  float windGust;       // NAN if null/unavailable (instantaneous only)
  int windDirection;    // Always available (0-359)
  String windUnit;      // Backend always sends "m/s", display unit varies by region
  String displayUnit;   // Regional display unit ("kph" for alpine, "kts" for marine)
  String lastUpdateTime;
};
StationData stations[3]; // Array for 3 stations per region
bool dataValid = false;
String currentDate = "";

// Display state
bool needsDisplayUpdate = true;
bool identifyRequested = false;
unsigned long lastFullRefresh = 0;
int refreshCycle = 0;

// Error tracking
String lastError = "";
unsigned long lastErrorTime = 0;

// Preferences for persistent storage
Preferences preferences;

// ===============================================================================
// SETUP FUNCTION
// ===============================================================================

void setup() {
  Serial.begin(115200);
  delay(2000); // Allow serial monitor to connect
  
  // Force serial output even if DEBUG not working
  Serial.println("========================================");
  Serial.println("  Weather Display Integrated v2.1.4");
  Serial.println("  XIAO ESP32C3 + 7.5\" ePaper");
  Serial.println("  Enhanced Visual Hierarchy - Power Optimized");
  Serial.println("  Backend API v2.0.0+ Compatible");
  Serial.println("  DEBUG OUTPUT ENABLED");
  Serial.println("========================================");
  
  DEBUG_PRINTLN("========================================");
  DEBUG_PRINTLN("  Weather Display Integrated v2.1.4");
  DEBUG_PRINTLN("  XIAO ESP32C3 + 7.5\" ePaper");
  DEBUG_PRINTLN("  Enhanced Visual Hierarchy - Power Optimized");
  DEBUG_PRINTLN("  Backend API v2.0.0+ Compatible");
  DEBUG_PRINTLN("========================================");
  
  // Initialize status LED
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);
  
  // Initialize preferences
  preferences.begin("weather-display", false);
  
  // Get MAC address for device identification
  WiFi.mode(WIFI_STA);
  deviceMAC = WiFi.macAddress();
  deviceId = deviceMAC;
  deviceId.replace(":", "");
  deviceId.toLowerCase();
  
  Serial.printf("Device MAC: %s\n", deviceMAC.c_str());
  Serial.printf("Device ID: %s\n", deviceId.c_str());
  DEBUG_PRINTF("Device MAC: %s\n", deviceMAC.c_str());
  DEBUG_PRINTF("Device ID: %s\n", deviceId.c_str());
  
  // Initialize ePaper display
  initializeDisplay();
  
  // v2.1.3: Wake ePaper display in case we're coming from deep sleep
  wakePowerSaveMode();
  
  // Initialize WiFi
  initializeWiFi();
  
  // Load persisted settings
  loadSettings();
  
  DEBUG_PRINTF("Free heap after setup: %d bytes\n", ESP.getFreeHeap());
  DEBUG_PRINTLN("Setup complete! Starting weather updates...");
  
  // Force first update
  lastWeatherUpdate = 0;
  lastHeartbeat = 0;
}

// ===============================================================================
// POWER MANAGEMENT FUNCTIONS - v2.1.0
// ===============================================================================

void enterPowerSaveMode() {
  DEBUG_PRINTLN("=== v2.1.3 ENTERING POWER SAVE MODE ===");
  
  // Calculate remaining sleep time until next update
  unsigned long currentTime = millis();
  unsigned long timeSinceLastUpdate = currentTime - lastWeatherUpdate;
  unsigned long remainingSleepTime = WEATHER_UPDATE_INTERVAL - timeSinceLastUpdate;
  
  // Minimum sleep time to make it worthwhile
  if (remainingSleepTime < MINIMUM_SLEEP_TIME) {
    DEBUG_PRINTF("Sleep time too short (%lums), staying awake\n", remainingSleepTime);
    return;
  }
  
  // Put ePaper display to sleep first
#ifdef EPAPER_ENABLE
  DEBUG_PRINTLN("Putting ePaper display to sleep...");
  epaper.sleep();
#endif
  
  // Convert to minutes for cleaner logging
  int sleepMinutes = remainingSleepTime / 60000;
  int sleepSeconds = (remainingSleepTime % 60000) / 1000;
  
  DEBUG_PRINTF("Entering ESP32 deep sleep for %dm %ds\n", sleepMinutes, sleepSeconds);
  DEBUG_PRINTLN("Device will wake up for next weather update cycle");
  
  // Flush serial output before sleeping
  Serial.flush();
  
  // Configure ESP32 to wake up after remaining time
  esp_sleep_enable_timer_wakeup(remainingSleepTime * 1000ULL); // Convert to microseconds
  
  // Enter ESP32 deep sleep (device will restart when timer expires)
  esp_deep_sleep_start();
  
  // This line will never be reached as ESP32 restarts after deep sleep
}

void wakePowerSaveMode() {
  DEBUG_PRINTLN("=== v2.1.3 WAKING FROM POWER SAVE MODE ===");
  
  // Wake up ePaper display
#ifdef EPAPER_ENABLE
  DEBUG_PRINTLN("Waking up ePaper display...");
  epaper.wake();
#endif
  
  DEBUG_PRINTLN("Power save mode wake complete - ready for operations");
}

// ===============================================================================
// MAIN LOOP
// ===============================================================================

void loop() {
  unsigned long currentTime = millis();
  
  // v2.1.3 Power Optimization: Combined operations every 3 minutes
  if (wifiConnected && shouldUpdateWeather(currentTime)) {
    DEBUG_PRINTLN("=== v2.1.3 COMBINED OPERATION CYCLE ===");
    
    // Step 1: Monitor WiFi status
    monitorWiFiStatus();
    lastWiFiCheck = currentTime;
    
    // Step 2: Update weather data
    if (wifiConnected) {
      updateWeatherData();
    }
    
    // Step 3: Send heartbeat (combined with weather update)
    if (wifiConnected) {
      sendHeartbeat();
      lastHeartbeat = currentTime;
    }
    
    DEBUG_PRINTLN("=== COMBINED CYCLE COMPLETE - ENTERING SLEEP MODE ===");
  }
  
  // Update display if needed
  if (needsDisplayUpdate) {
    refreshDisplay();
    needsDisplayUpdate = false;
  }
  
  // Handle identify request (immediate response)
  if (identifyRequested) {
    performIdentifySequence();
    identifyRequested = false;
  }
  
  // Memory monitoring (less frequent in power mode)
  static unsigned long lastHeapCheck = 0;
  if (currentTime - lastHeapCheck > WEATHER_UPDATE_INTERVAL) { // Every 3 minutes
    DEBUG_PRINTF("Free heap: %d bytes\n", ESP.getFreeHeap());
    lastHeapCheck = currentTime;
  }
  
  // v2.1.3 Power Optimization: Enter deep sleep if enabled
  if (DEEP_SLEEP_ENABLED && SLEEP_BETWEEN_UPDATES && !identifyRequested && 
      (currentTime - lastWeatherUpdate < (WEATHER_UPDATE_INTERVAL - 10000))) {
    enterPowerSaveMode();
  } else {
    delay(1000); // 1 second delay for power savings
  }
}

// ===============================================================================
// DISPLAY FUNCTIONS
// ===============================================================================

void initializeDisplay() {
  DEBUG_PRINTLN("Initializing ePaper display...");
  
#ifdef EPAPER_ENABLE
  epaper.begin();
  epaper.fillScreen(TFT_WHITE);
  
  // Display startup message
  epaper.setTextSize(2);
  epaper.setTextColor(TFT_BLACK);
  epaper.drawString("Weather Display", 10, 10);
  epaper.drawString("Starting up...", 10, 40);
  
  epaper.setTextSize(1);
  epaper.drawString("MAC: " + deviceMAC, 10, 80);
  epaper.drawString("Device ID: " + deviceId, 10, 100);
  epaper.drawString("Firmware: v2.1.4 (Enhanced Visual Hierarchy)", 10, 400);
  epaper.drawString("Backend: Weather Display System v2.0.0+", 10, 420);
  epaper.update();
  
  DEBUG_PRINTLN("ePaper display initialized successfully");
#else
  DEBUG_PRINTLN("ePaper not enabled! Check driver.h configuration");
#endif
  
  delay(2000); // Show startup message briefly
}

void refreshDisplay() {
#ifdef EPAPER_ENABLE
  DEBUG_PRINTLN("Refreshing ePaper display with v2.1.4 enhanced visual hierarchy...");
  
  // v2.1.3: Ensure display is awake before refresh
  epaper.wake();
  
  // v2.1.3: Use minimal anti-ghosting (just 1 quick flash)
  performOptimizedAntiGhosting();
  
  // Clear and draw content
  epaper.fillScreen(TFT_WHITE);
  
  if (dataValid && wifiConnected) {
    drawWeatherData();
  } else {
    drawErrorState();
  }
  
  // Draw status footer with last updated time
  drawStatusFooter();
  
  epaper.update();
  
  refreshCycle++;
  DEBUG_PRINTF("v2.1.3 Refined layout refresh complete (cycle %d)\n", refreshCycle);
#endif
}

void performOptimizedAntiGhosting() {
#ifdef EPAPER_ENABLE
  DEBUG_PRINTLN("*** v2.1.3 MINIMAL ANTI-GHOSTING SEQUENCE ***");
  
  // v2.1.0: Minimal flash cycles - just 1 quick flash
  for (int flash = 0; flash < FLASH_CLEAR_CYCLES; flash++) {
    DEBUG_PRINTF("Flash cycle %d/%d (minimal)\n", flash + 1, FLASH_CLEAR_CYCLES);
    
    // Single BLACK flash
    epaper.fillScreen(TFT_BLACK);
    epaper.update();
    delay(ANTI_GHOST_DELAY);
    
    // Return to WHITE
    epaper.fillScreen(TFT_WHITE);
    epaper.update();
    delay(ANTI_GHOST_DELAY);
  }
  
  DEBUG_PRINTLN("*** MINIMAL ANTI-GHOSTING COMPLETE ***");
#endif
}

void drawWeatherData() {
#ifdef EPAPER_ENABLE
  // v2.1.2 Layout: Enhanced typography with GFX Free Fonts
  epaper.setTextColor(TFT_BLACK);
  
  // Three columns layout (260px each + margins) - more space without header
  int colWidth = 260;
  int colStartX[3] = {10, 275, 540}; // Column start positions
  
  for (int i = 0; i < 3; i++) {
    if (i >= 3 || stations[i].stationName.isEmpty()) continue;
    
    int x = colStartX[i];
    int y = 15; // Start from top (v2.1.2 optimized)
    
    // v2.1.4: Station name with FreeSansBold 18pt for prominence
    epaper.setFreeFont(&FreeSansBold18pt7b);
    epaper.drawString(stations[i].stationName, x, y);
    
    // v2.1.4: Add horizontal line under station name for visual separation
    epaper.drawLine(x, y + 25, x + colWidth - 10, y + 25, TFT_BLACK);
    
    y += 40; // Space for line + margin
    
    // v2.1.4: Data fields with FreeSans 12pt for readability
    epaper.setFreeFont(&FreeSans12pt7b);
    
    // Wind direction (no decimals) with label
    epaper.drawString("WIND DIR: " + String(stations[i].windDirection) + " deg", x, y);
    y += 42; // v2.1.3: Increased spacing by 50% (28 → 42px)
    
    // Wind speed with regional unit conversion for user-friendly display
    float displayWindSpeed = convertWindSpeed(stations[i].windSpeed, stations[i].displayUnit);
    epaper.drawString("WIND SPD: " + String(displayWindSpeed, 1) + " " + stations[i].displayUnit, x, y);
    y += 42; // v2.1.3: Increased spacing by 50%
    
    // Wind gust with proper null handling - simplified display
    String gustDisplay;
    if (isnan(stations[i].windGust)) {
      gustDisplay = "WIND GUST: --"; // v2.1.3: Simplified null display
    } else {
      float displayWindGust = convertWindSpeed(stations[i].windGust, stations[i].displayUnit);
      gustDisplay = "WIND GUST: " + String(displayWindGust, 1) + " " + stations[i].displayUnit;
    }
    epaper.drawString(gustDisplay, x, y);
    y += 42; // v2.1.3: Increased spacing by 50%
    
    // Temperature with proper null handling for v2.0.0 backend
    String tempDisplay;
    if (isnan(stations[i].temperature)) {
      tempDisplay = "AIR TEMP: -- deg C"; // Proper null display
    } else {
      tempDisplay = "AIR TEMP: " + String(stations[i].temperature, 1) + " deg C";
    }
    epaper.drawString(tempDisplay, x, y);
    y += 42; // v2.1.3: Final field spacing
    
    // v2.1.0: No individual update times - moved to footer
    
    // Draw vertical separator line (except after last column)
    if (i < 2) {
      epaper.drawLine(x + colWidth, 10, x + colWidth, 430, TFT_BLACK);
    }
  }
  
  // v2.1.2: Horizontal line much closer to footer
  epaper.drawLine(10, 440, 790, 440, TFT_BLACK);
#endif
}

void drawErrorState() {
#ifdef EPAPER_ENABLE
  epaper.setTextSize(3);
  epaper.setTextColor(TFT_BLACK);
  epaper.drawString("DATA", 10, 60);
  epaper.drawString("UNAVAILABLE", 10, 100);
  
  epaper.setTextSize(2);
  if (!wifiConnected) {
    epaper.drawString("WiFi Disconnected", 10, 160);
  } else if (!lastError.isEmpty()) {
    epaper.drawString("Backend Error", 10, 160);
    epaper.setTextSize(1);
    epaper.drawString(lastError, 10, 190);
  } else {
    epaper.drawString("Waiting for data...", 10, 160);
  }
#endif
}

void drawStatusFooter() {
#ifdef EPAPER_ENABLE
  // v2.1.3: Revert footer to bitmap font for better fit
  epaper.setFreeFont(); // Reset to default bitmap font
  epaper.setTextSize(1);
  
  // v2.1.0: Last Updated time (applies to all 3 stations)
  String lastUpdated = "Updated: " + (stations[0].lastUpdateTime.isEmpty() ? "--:--" : stations[0].lastUpdateTime);
  
  // WiFi signal strength in dBm
  String wifiSignal = wifiConnected ? ("WiFi:" + String(WiFi.RSSI()) + "dBm") : "WiFi:?";
  
  // Memory as percentage (total heap ~300KB for ESP32C3)
  int freeHeap = ESP.getFreeHeap();
  int totalHeap = 300000; // Approximate total heap for ESP32C3
  int memoryPercent = (freeHeap * 100) / totalHeap;
  String memoryStatus = "Mem:" + String(memoryPercent) + "%";
  
  // Device ID (first 6 characters)
  String shortId = "ID:" + deviceId.substring(0, 6);
  
  // v2.1.4 Footer layout: Bitmap font for better fit
  epaper.drawString(lastUpdated, 10, 460);  // v2.1.4: Bitmap font, bottom positioned
  epaper.drawString(wifiSignal, 150, 460);
  epaper.drawString(memoryStatus, 280, 460);
  epaper.drawString(shortId, 400, 460);
  epaper.drawString("v2.1.4", 500, 460);
#endif
}

void performIdentifySequence() {
#ifdef EPAPER_ENABLE
  Serial.println("*** IDENTIFY SEQUENCE STARTING ***");
  DEBUG_PRINTLN("Performing minimal identify sequence...");
  
  // v2.1.0: Single flash for minimal disruption
  epaper.fillScreen(TFT_BLACK);
  epaper.update();
  delay(300);
  
  epaper.fillScreen(TFT_WHITE);
  epaper.update();
  delay(300);
  
  // Restore normal display
  needsDisplayUpdate = true;
  
  Serial.println("*** IDENTIFY SEQUENCE COMPLETE ***");
  DEBUG_PRINTLN("Minimal identify sequence complete");
#endif
}

// ===============================================================================
// NETWORK FUNCTIONS  
// ===============================================================================

void initializeWiFi() {
  DEBUG_PRINTLN("Initializing WiFi...");
  
  WiFi.mode(WIFI_STA);
  
  // Try to connect to known networks
  connectToWiFi();
}

void connectToWiFi() {
  DEBUG_PRINTLN("Scanning for known networks...");
  
  int numNetworks = WiFi.scanNetworks();
  DEBUG_PRINTF("Found %d networks\n", numNetworks);
  
  // Try each configured network
  for (int i = 0; i < NUM_WIFI_NETWORKS; i++) {
    for (int j = 0; j < numNetworks; j++) {
      if (WiFi.SSID(j) == WIFI_NETWORKS[i].ssid) {
        DEBUG_PRINTF("Connecting to %s...\n", WIFI_NETWORKS[i].ssid);
        
        WiFi.begin(WIFI_NETWORKS[i].ssid, WIFI_NETWORKS[i].password);
        
        int timeout = 0;
        while (WiFi.status() != WL_CONNECTED && timeout < 30) {
          delay(1000);
          timeout++;
          Serial.print(".");
        }
        
        if (WiFi.status() == WL_CONNECTED) {
          wifiConnected = true;
          wifiReconnectAttempts = 0;
          
          // Enhanced WiFi connection info
          Serial.println("\n*** WiFi Connection Successful ***");
          Serial.printf("SSID: %s\n", WiFi.SSID().c_str());
          Serial.printf("IP Address: %s\n", WiFi.localIP().toString().c_str());
          Serial.printf("Signal Strength: %d dBm\n", WiFi.RSSI());
          Serial.printf("Gateway: %s\n", WiFi.gatewayIP().toString().c_str());
          Serial.printf("DNS: %s\n", WiFi.dnsIP().toString().c_str());
          Serial.println("********************************");
          
          DEBUG_PRINTF("\nConnected! IP: %s\n", WiFi.localIP().toString().c_str());
          needsDisplayUpdate = true;
          return;
        } else {
          DEBUG_PRINTLN("\nConnection failed");
        }
      }
    }
  }
  
  wifiConnected = false;
  wifiReconnectAttempts++;
  DEBUG_PRINTLN("No known networks found");
  needsDisplayUpdate = true;
}

void monitorWiFiStatus() {
  bool previousStatus = wifiConnected;
  wifiConnected = (WiFi.status() == WL_CONNECTED);
  
  if (previousStatus != wifiConnected) {
    DEBUG_PRINTF("WiFi status changed: %s\n", wifiConnected ? "Connected" : "Disconnected");
    needsDisplayUpdate = true;
    
    if (!wifiConnected) {
      // Try to reconnect
      if (wifiReconnectAttempts < MAX_WIFI_RECONNECT_ATTEMPTS) {
        DEBUG_PRINTLN("Attempting WiFi reconnection...");
        connectToWiFi();
      }
    } else {
      wifiReconnectAttempts = 0;
    }
  }
}

// ===============================================================================
// WEATHER DATA FUNCTIONS
// ===============================================================================

bool shouldUpdateWeather(unsigned long currentTime) {
  return (currentTime - lastWeatherUpdate > WEATHER_UPDATE_INTERVAL) ||
         (lastWeatherUpdate == 0);
}

bool shouldSendHeartbeat(unsigned long currentTime) {
  return (currentTime - lastHeartbeat > HEARTBEAT_INTERVAL) ||
         (lastHeartbeat == 0);
}

void updateWeatherData() {
  Serial.println("Updating weather data...");
  DEBUG_PRINTLN("Updating weather data...");
  
  HTTPClient http;
  String url = String(BACKEND_URL) + "/api/v1/weather/region/" + currentRegionId + 
               "?mac=" + deviceId;
  
  http.begin(url);
  http.addHeader("User-Agent", "WeatherDisplay/1.0 ESP32C3-" + deviceId);
  http.addHeader("X-Device-MAC", deviceMAC);
  
  int httpResponseCode = http.GET();
  
  if (httpResponseCode == 200) {
    String payload = http.getString();
    if (parseRegionWeatherResponse(payload)) {
      dataValid = true;
      lastError = "";
      DEBUG_PRINTLN("Weather data updated successfully");
    } else {
      dataValid = false;
      lastError = "Parse Error";
      DEBUG_PRINTLN("Failed to parse weather data");
    }
    needsDisplayUpdate = true;
  } else if (httpResponseCode == 201) {
    // New device registered
    String payload = http.getString();
    handleNewDeviceResponse(payload);
  } else {
    dataValid = false;
    lastError = "HTTP " + String(httpResponseCode);
    lastErrorTime = millis();
    DEBUG_PRINTF("HTTP error: %d\n", httpResponseCode);
    needsDisplayUpdate = true;
  }
  
  http.end();
  lastWeatherUpdate = millis();
}

// New region weather response parser for 3-station data
bool parseRegionWeatherResponse(const String& jsonString) {
  DynamicJsonDocument doc(4096); // Larger buffer for 3 stations
  DeserializationError error = deserializeJson(doc, jsonString);
  
  if (error) {
    DEBUG_PRINTF("JSON parse error: %s\n", error.c_str());
    return false;
  }
  
  // Extract region info
  currentRegionId = doc["regionId"].as<String>();
  regionDisplayName = doc["regionName"].as<String>();
  currentDate = doc["timestamp"].as<String>();
  
  // Parse current date to "DD MMM YYYY" format
  if (currentDate.length() >= 10) {
    String year = currentDate.substring(0, 4);
    String month = currentDate.substring(5, 7);
    String day = currentDate.substring(8, 10);
    
    String monthNames[] = {"Jan", "Feb", "Mar", "Apr", "May", "Jun",
                          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"};
    int monthNum = month.toInt() - 1;
    if (monthNum >= 0 && monthNum < 12) {
      currentDate = day + " " + monthNames[monthNum] + " " + year;
    }
  }
  
  // Parse stations array (should be 3 stations)
  JsonArray stationsArray = doc["stations"];
  int stationCount = min((int)stationsArray.size(), 3);
  
  for (int i = 0; i < stationCount; i++) {
    JsonObject station = stationsArray[i];
    
    stations[i].stationName = station["stationId"].as<String>();
    
    // Clean up station names for display
    if (stations[i].stationName == "prarion") stations[i].stationName = "Prarion";
    else if (stations[i].stationName == "planpraz") stations[i].stationName = "Planpraz";
    else if (stations[i].stationName == "tetedebalme") stations[i].stationName = "Tête de Balme";
    else if (stations[i].stationName == "brambles") stations[i].stationName = "Brambles";
    else if (stations[i].stationName == "seaview") stations[i].stationName = "Seaview";
    else if (stations[i].stationName == "lymington") stations[i].stationName = "Lymington";
    
    // Extract weather data with proper null handling for v2.0.0 backend
    JsonObject weatherData = station["data"];
    JsonObject tempData = weatherData["temperature"];
    JsonObject windData = weatherData["wind"];
    
    // Temperature handling - backend v2.0.0 properly returns null for missing data
    if (tempData.isNull() || tempData["air"].isNull()) {
      stations[i].temperature = NAN; // Use NAN to indicate missing data
    } else {
      float temp = tempData["air"].as<float>();
      // Validate temperature range (-60°C to +60°C)
      if (temp >= -60.0 && temp <= 60.0) {
        stations[i].temperature = temp;
      } else {
        stations[i].temperature = NAN; // Invalid temperature
      }
    }
    
    // Wind speed - backend v2.0.0 always provides in m/s, never null (0 = calm)
    stations[i].windSpeed = windData["avg"].as<float>();
    stations[i].windUnit = "m/s"; // Backend v2.0.0 always returns m/s
    
    // Wind gust - backend v2.0.0 returns null for instantaneous-only readings
    if (windData["gust"].isNull()) {
      stations[i].windGust = NAN; // Use NAN to indicate no gust data available
    } else {
      stations[i].windGust = windData["gust"].as<float>();
    }
    
    // Wind direction - always available from backend
    stations[i].windDirection = windData["direction"].as<int>();
    
    // Set regional display units for user-friendly display
    if (currentRegionId == "chamonix") {
      stations[i].displayUnit = "kph"; // Alpine stations: km/h
    } else {
      stations[i].displayUnit = "kts"; // Marine stations: knots
    }
    
    // Format timestamp to time only (HH:MM UTC)
    String timestamp = station["timestamp"].as<String>();
    if (timestamp.length() >= 16) {
      stations[i].lastUpdateTime = timestamp.substring(11, 16) + " UTC";
    } else {
      stations[i].lastUpdateTime = "--:-- UTC";
    }
  }
  
  // Check for identify request
  if (doc["identify"].as<bool>()) {
    identifyRequested = true;
  }
  
  return true;
}

// Legacy single station parser (kept for compatibility)
bool parseWeatherResponse(const String& jsonString) {
  DynamicJsonDocument doc(2048);
  DeserializationError error = deserializeJson(doc, jsonString);
  
  if (error) {
    DEBUG_PRINTF("JSON parse error: %s\n", error.c_str());
    return false;
  }
  
  // For backward compatibility - convert to first station
  stations[0].stationName = doc["stationId"].as<String>();
  stations[0].temperature = doc["data"]["temperature"]["air"].as<float>();
  stations[0].windSpeed = doc["data"]["wind"]["avg"].as<float>();
  stations[0].windGust = doc["data"]["wind"]["gust"].as<float>();
  stations[0].windDirection = doc["data"]["wind"]["direction"].as<int>();
  stations[0].lastUpdateTime = doc["timestamp"].as<String>();
  
  // Check for identify request
  if (doc["identify"].as<bool>()) {
    identifyRequested = true;
  }
  
  return true;
}

void handleNewDeviceResponse(const String& jsonString) {
  DEBUG_PRINTLN("Handling new device registration response...");
  
  DynamicJsonDocument doc(1024);
  DeserializationError error = deserializeJson(doc, jsonString);
  
  if (!error) {
    isRegistered = true;
    
    // For region-based system, extract regionId from device registration
    if (doc["regionId"]) {
      currentRegionId = doc["regionId"].as<String>();
    } else if (doc["stationId"]) {
      // Legacy support - determine region from station
      String stationId = doc["stationId"].as<String>();
      if (stationId == "prarion" || stationId == "planpraz" || stationId == "tetedebalme") {
        currentRegionId = "chamonix";
      } else {
        currentRegionId = "solent";
      }
    }
    
    // Save settings
    saveSettings();
    
    DEBUG_PRINTF("Device registered! Assigned region: %s\n", currentRegionId.c_str());
    
    // Trigger identify sequence for new device
    identifyRequested = true;
    needsDisplayUpdate = true;
  }
}

void sendHeartbeat() {
  Serial.println("Sending heartbeat...");
  DEBUG_PRINTLN("Sending heartbeat...");
  
  HTTPClient http;
  String url = String(BACKEND_URL) + "/api/v1/devices/" + deviceId + "/heartbeat";
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("User-Agent", "WeatherDisplay/1.0 ESP32C3-" + deviceId);
  
  String payload = "{\"deviceId\":\"" + deviceId + "\",\"timestamp\":\"" + 
                   String(millis()) + "\"}";
  
  int httpResponseCode = http.POST(payload);
  
  if (httpResponseCode == 200) {
    DEBUG_PRINTLN("Heartbeat sent successfully");
  } else {
    DEBUG_PRINTF("Heartbeat failed: HTTP %d\n", httpResponseCode);
  }
  
  http.end();
  lastHeartbeat = millis();
}

// ===============================================================================
// SETTINGS PERSISTENCE
// ===============================================================================

void loadSettings() {
  DEBUG_PRINTLN("Loading settings from flash...");
  
  isRegistered = preferences.getBool("registered", false);
  currentRegionId = preferences.getString("regionId", DEFAULT_REGION); // Use config default
  
  // Set default region display name if not registered yet
  if (!isRegistered) {
    if (currentRegionId == "chamonix") {
      regionDisplayName = "Chamonix Valley";
    } else {
      regionDisplayName = "Solent Marine";
    }
  }
  
  DEBUG_PRINTF("Loaded - Registered: %s, Region: %s\n", 
               isRegistered ? "true" : "false", 
               currentRegionId.c_str());
}

void saveSettings() {
  DEBUG_PRINTLN("Saving settings to flash...");
  
  preferences.putBool("registered", isRegistered);
  preferences.putString("regionId", currentRegionId);
  
  DEBUG_PRINTLN("Settings saved");
}

// ===============================================================================
// UTILITY FUNCTIONS
// ===============================================================================

// Wind speed unit conversion for regional display preferences
// Backend v2.0.0 always returns m/s, convert to user-friendly regional units
float convertWindSpeed(float speedMs, String targetUnit) {
  if (targetUnit == "kts") {
    return speedMs * 1.94384; // m/s to knots (marine stations)
  } else if (targetUnit == "kph") {
    return speedMs * 3.6; // m/s to km/h (alpine stations)
  } else if (targetUnit == "mph") {
    return speedMs * 2.237; // m/s to mph (optional)
  }
  return speedMs; // Default: return m/s unchanged
}

void blinkLED(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_BUILTIN, HIGH);
    delay(delayMs);
    digitalWrite(LED_BUILTIN, LOW);
    delay(delayMs);
  }
}
