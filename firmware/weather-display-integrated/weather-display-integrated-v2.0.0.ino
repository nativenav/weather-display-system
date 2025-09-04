/**
 * Weather Display Integrated v2.0.0 - XIAO ESP32C3 + 7.5" ePaper
 * 
 * Combines WiFi connectivity with ePaper display for weather data
 * Auto-registers with backend using MAC address as device ID
 * Compatible with Weather Display System Backend v2.0.0
 * 
 * Hardware: XIAO ESP32C3 + Seeed 7.5" ePaper Display (UC8179)
 * Backend: Weather Display System (Cloudflare Workers) v2.0.0
 * 
 * Features:
 * - Auto-connect to known WiFi networks
 * - Auto-register with backend on first connection  
 * - Three-column regional weather display (3 stations per region)
 * - Enhanced null data handling (proper "N/A" and "--" display)
 * - Regional unit conversion (m/s to km/h for alpine, knots for marine)
 * - Aggressive anti-ghosting for perfect ePaper display quality
 * - Show connection status and errors
 * - MAC-based device identification
 * - Identify function for physical device location
 * 
 * v2.0.0 Changes:
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
  Serial.println("  Weather Display Integrated v2.0.0");
  Serial.println("  XIAO ESP32C3 + 7.5\" ePaper");
  Serial.println("  Backend API v2.0.0 Compatible");
  Serial.println("  DEBUG OUTPUT ENABLED");
  Serial.println("========================================");
  
  DEBUG_PRINTLN("========================================");
  DEBUG_PRINTLN("  Weather Display Integrated v2.0.0");
  DEBUG_PRINTLN("  XIAO ESP32C3 + 7.5\" ePaper");
  DEBUG_PRINTLN("  Backend API v2.0.0 Compatible");
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
// MAIN LOOP
// ===============================================================================

void loop() {
  unsigned long currentTime = millis();
  
  // Monitor WiFi status
  if (currentTime - lastWiFiCheck > WIFI_CHECK_INTERVAL) {
    monitorWiFiStatus();
    lastWiFiCheck = currentTime;
  }
  
  // Update weather data
  if (wifiConnected && shouldUpdateWeather(currentTime)) {
    updateWeatherData();
  }
  
  // Send heartbeat
  if (wifiConnected && shouldSendHeartbeat(currentTime)) {
    sendHeartbeat();
  }
  
  // Update display if needed
  if (needsDisplayUpdate) {
    refreshDisplay();
    needsDisplayUpdate = false;
  }
  
  // Handle identify request
  if (identifyRequested) {
    performIdentifySequence();
    identifyRequested = false;
  }
  
  // Memory monitoring
  static unsigned long lastHeapCheck = 0;
  if (currentTime - lastHeapCheck > 30000) { // Every 30 seconds
    DEBUG_PRINTF("Free heap: %d bytes\n", ESP.getFreeHeap());
    lastHeapCheck = currentTime;
  }
  
  delay(100); // Small delay to prevent watchdog issues
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
  epaper.drawString("Firmware: v2.0.0", 10, 400);
  epaper.drawString("Backend: Weather Display System v2.0.0", 10, 420);
  epaper.update();
  
  DEBUG_PRINTLN("ePaper display initialized successfully");
#else
  DEBUG_PRINTLN("ePaper not enabled! Check driver.h configuration");
#endif
  
  delay(2000); // Show startup message briefly
}

void refreshDisplay() {
#ifdef EPAPER_ENABLE
  DEBUG_PRINTLN("Refreshing ePaper display with aggressive anti-ghosting...");
  
  // ALWAYS use full refresh with aggressive flashing for zero ghosting
  performAggressiveAntiGhosting();
  
  // Clear and draw content
  epaper.fillScreen(TFT_WHITE);
  
  if (dataValid && wifiConnected) {
    drawWeatherData();
  } else {
    drawErrorState();
  }
  
  // Draw status footer
  drawStatusFooter();
  
  epaper.update();
  
  refreshCycle++;
  DEBUG_PRINTF("Aggressive refresh complete (cycle %d)\n", refreshCycle);
#endif
}

void performAggressiveAntiGhosting() {
#ifdef EPAPER_ENABLE
  DEBUG_PRINTLN("*** AGGRESSIVE ANTI-GHOSTING SEQUENCE ***");
  
  // Multiple flash cycles for maximum ghost elimination
  for (int flash = 0; flash < FLASH_CLEAR_CYCLES; flash++) {
    DEBUG_PRINTF("Flash cycle %d/%d\n", flash + 1, FLASH_CLEAR_CYCLES);
    
    // Flash BLACK
    epaper.fillScreen(TFT_BLACK);
    epaper.update();
    delay(ANTI_GHOST_DELAY);
    
    // Flash WHITE  
    epaper.fillScreen(TFT_WHITE);
    epaper.update();
    delay(ANTI_GHOST_DELAY);
  }
  
  // Final intensive clearing sequence
  DEBUG_PRINTLN("Final intensive clearing...");
  
  // Long BLACK hold
  epaper.fillScreen(TFT_BLACK);
  epaper.update();
  delay(ANTI_GHOST_DELAY * 2);  // Extra long black
  
  // Long WHITE hold
  epaper.fillScreen(TFT_WHITE);
  epaper.update();
  delay(ANTI_GHOST_DELAY * 2);  // Extra long white
  
  // Final BLACK-WHITE-BLACK sequence
  epaper.fillScreen(TFT_BLACK);
  epaper.update();
  delay(ANTI_GHOST_DELAY);
  
  epaper.fillScreen(TFT_WHITE);
  epaper.update();
  delay(ANTI_GHOST_DELAY);
  
  epaper.fillScreen(TFT_BLACK);
  epaper.update();
  delay(ANTI_GHOST_DELAY);
  
  // Final clean white background
  epaper.fillScreen(TFT_WHITE);
  epaper.update();
  delay(ANTI_GHOST_DELAY);
  
  DEBUG_PRINTLN("*** AGGRESSIVE ANTI-GHOSTING COMPLETE ***");
#endif
}

void drawWeatherData() {
#ifdef EPAPER_ENABLE
  // Header bar with region and date (800px width display)
  // Increase header font by 30% (size 2 -> 2.6, approximate with size 3)
  epaper.setTextSize(3);
  epaper.setTextColor(TFT_BLACK);
  
  // Region name on left
  epaper.drawString(regionDisplayName, 10, 10);
  
  // Date on right (approximate positioning for 800px width)
  epaper.drawString(currentDate, 500, 10);
  
  // Draw horizontal line under header
  epaper.drawLine(10, 50, 790, 50, TFT_BLACK);
  
  // Three columns layout (260px each + margins)
  int colWidth = 260;
  int colStartX[3] = {10, 275, 540}; // Column start positions
  
  for (int i = 0; i < 3; i++) {
    if (i >= 3 || stations[i].stationName.isEmpty()) continue;
    
    int x = colStartX[i];
    int y = 70; // Start below header
    
    // Station name - increase by 30% (size 2 -> 2.6, approximate with size 3)
    epaper.setTextSize(3);
    epaper.drawString(stations[i].stationName, x, y);
    y += 45;
    
    // Double size font for data fields (size 1 -> size 2)
    epaper.setTextSize(2);
    
    // Wind direction (no decimals) with label
    epaper.drawString("WIND DIR: " + String(stations[i].windDirection) + " deg", x, y);
    y += 42; // Increased from 35 to 42 (20% more spacing)
    
    // Wind speed with regional unit conversion for user-friendly display
    float displayWindSpeed = convertWindSpeed(stations[i].windSpeed, stations[i].displayUnit);
    epaper.drawString("WIND SPD: " + String(displayWindSpeed, 1) + " " + stations[i].displayUnit, x, y);
    y += 42; // Increased from 35 to 42 (20% more spacing)
    
    // Wind gust with proper null handling for v2.0.0 backend
    String gustDisplay;
    if (isnan(stations[i].windGust)) {
      gustDisplay = "WIND GUST: N/A (inst.)"; // Shorter text for space
    } else {
      float displayWindGust = convertWindSpeed(stations[i].windGust, stations[i].displayUnit);
      gustDisplay = "WIND GUST: " + String(displayWindGust, 1) + " " + stations[i].displayUnit;
    }
    epaper.drawString(gustDisplay, x, y);
    y += 42; // Increased from 35 to 42 (20% more spacing)
    
    // Temperature with proper null handling for v2.0.0 backend
    String tempDisplay;
    if (isnan(stations[i].temperature)) {
      tempDisplay = "AIR TEMP: -- deg C"; // Proper null display
    } else {
      tempDisplay = "AIR TEMP: " + String(stations[i].temperature, 1) + " deg C";
    }
    epaper.drawString(tempDisplay, x, y);
    y += 42; // Increased from 35 to 42 (20% more spacing)
    
    // Last update time with label
    epaper.drawString("UPDATED: " + stations[i].lastUpdateTime, x, y);
    
    // Draw vertical separator line (except after last column)
    if (i < 2) {
      epaper.drawLine(x + colWidth, 60, x + colWidth, 380, TFT_BLACK);
    }
  }
  
  // Draw horizontal line above footer
  epaper.drawLine(10, 400, 790, 400, TFT_BLACK);
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
  epaper.setTextSize(1);
  
  // WiFi signal strength in dBm
  String wifiSignal = wifiConnected ? ("WiFi:" + String(WiFi.RSSI()) + "dBm") : "WiFi:?";
  
  // Memory as percentage (total heap ~300KB for ESP32C3)
  int freeHeap = ESP.getFreeHeap();
  int totalHeap = 300000; // Approximate total heap for ESP32C3
  int memoryPercent = (freeHeap * 100) / totalHeap;
  String memoryStatus = "Mem:" + String(memoryPercent) + "%";
  
  // Device ID (first 6 characters)
  String shortId = "ID:" + deviceId.substring(0, 6);
  
  // Footer layout: WiFi - Memory - ID - Version (removed current time)
  epaper.drawString(wifiSignal, 10, 430);
  epaper.drawString(memoryStatus, 150, 430);
  epaper.drawString(shortId, 250, 430);
  epaper.drawString("v2.0.0", 350, 430);
#endif
}

void performIdentifySequence() {
#ifdef EPAPER_ENABLE
  Serial.println("*** IDENTIFY SEQUENCE STARTING ***");
  DEBUG_PRINTLN("Performing identify sequence...");
  
  // Flash display 3 times
  for (int i = 0; i < 3; i++) {
    epaper.fillScreen(TFT_BLACK);
    epaper.update();
    delay(500);
    
    epaper.fillScreen(TFT_WHITE);
    epaper.update();
    delay(500);
  }
  
  // Restore normal display
  needsDisplayUpdate = true;
  
  Serial.println("*** IDENTIFY SEQUENCE COMPLETE ***");
  DEBUG_PRINTLN("Identify sequence complete");
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
