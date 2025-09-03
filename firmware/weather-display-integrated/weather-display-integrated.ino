/**
 * Weather Display Integrated - XIAO ESP32C3 + 7.5" ePaper
 * 
 * Combines WiFi connectivity with ePaper display for weather data
 * Auto-registers with backend using MAC address as device ID
 * 
 * Hardware: XIAO ESP32C3 + Seeed 7.5" ePaper Display (UC8179)
 * Backend: Weather Display System (Cloudflare Workers)
 * 
 * Features:
 * - Auto-connect to known WiFi networks
 * - Auto-register with backend on first connection  
 * - Display weather data with anti-ghosting refresh
 * - Show connection status and errors
 * - MAC-based device identification
 * - Identify function for physical device location
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

// Weather data
String currentStationId = "";
String stationName = "";
float temperature = 0.0;
float windSpeed = 0.0;
float windGust = 0.0;
int windDirection = 0;
String lastUpdateTime = "";
bool dataValid = false;

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
  
  DEBUG_PRINTLN("========================================");
  DEBUG_PRINTLN("  Weather Display Integrated v1.0");
  DEBUG_PRINTLN("  XIAO ESP32C3 + 7.5\" ePaper");
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
  
  DEBUG_PRINTF("Device MAC: %s\\n", deviceMAC.c_str());
  DEBUG_PRINTF("Device ID: %s\\n", deviceId.c_str());
  
  // Initialize ePaper display
  initializeDisplay();
  
  // Initialize WiFi
  initializeWiFi();
  
  // Load persisted settings
  loadSettings();
  
  DEBUG_PRINTF("Free heap after setup: %d bytes\\n", ESP.getFreeHeap());
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
    DEBUG_PRINTF("Free heap: %d bytes\\n", ESP.getFreeHeap());
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
  epaper.drawString("Firmware: v1.0", 10, 400);
  epaper.drawString("Backend: Weather Display System", 10, 420);
  epaper.update();
  
  DEBUG_PRINTLN("ePaper display initialized successfully");
#else
  DEBUG_PRINTLN("ePaper not enabled! Check driver.h configuration");
#endif
  
  delay(2000); // Show startup message briefly
}

void refreshDisplay() {
#ifdef EPAPER_ENABLE
  DEBUG_PRINTLN("Refreshing ePaper display...");
  
  // Use full refresh every 10 cycles to prevent ghosting
  bool useFullRefresh = (refreshCycle % 10 == 0) || !dataValid;
  refreshCycle++;
  
  if (useFullRefresh) {
    DEBUG_PRINTLN("Using full refresh (anti-ghosting)");
    // Anti-ghosting sequence
    epaper.fillScreen(TFT_BLACK);
    epaper.update();
    delay(200);
    
    epaper.fillScreen(TFT_WHITE);
    epaper.update(); 
    delay(200);
  }
  
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
  
  DEBUG_PRINTLN("Display refresh complete");
#endif
}

void drawWeatherData() {
#ifdef EPAPER_ENABLE
  // Station name header
  epaper.setTextSize(2);
  epaper.setTextColor(TFT_BLACK);
  epaper.drawString(stationName, 10, 10);
  
  // Temperature (large display)
  epaper.setTextSize(4);
  String tempStr = String(temperature, 1) + "°C";
  epaper.drawString(tempStr, 10, 60);
  
  // Wind information
  epaper.setTextSize(2);
  String windStr = "Wind: " + String(windSpeed, 1) + " m/s";
  epaper.drawString(windStr, 10, 140);
  
  if (windGust > windSpeed) {
    String gustStr = "Gust: " + String(windGust, 1) + " m/s";
    epaper.drawString(gustStr, 10, 170);
  }
  
  String dirStr = "Direction: " + String(windDirection) + "°";
  epaper.drawString(dirStr, 10, 200);
  
  // Last update time
  epaper.setTextSize(1);
  epaper.drawString("Updated: " + lastUpdateTime, 10, 250);
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
  
  // WiFi status
  String wifiStatus = wifiConnected ? "WiFi: Connected" : "WiFi: Disconnected";
  epaper.drawString(wifiStatus, 10, 450);
  
  // Registration status
  String regStatus = isRegistered ? "Registered" : "Not Registered";
  epaper.drawString(regStatus, 200, 450);
  
  // Device info
  epaper.drawString("ID: " + deviceId.substring(0, 8), 400, 450);
  
  // Current time
  epaper.drawString("Heap: " + String(ESP.getFreeHeap()), 600, 450);
#endif
}

void performIdentifySequence() {
#ifdef EPAPER_ENABLE
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
  DEBUG_PRINTF("Found %d networks\\n", numNetworks);
  
  // Try each configured network
  for (int i = 0; i < NUM_WIFI_NETWORKS; i++) {
    for (int j = 0; j < numNetworks; j++) {
      if (WiFi.SSID(j) == WIFI_NETWORKS[i].ssid) {
        DEBUG_PRINTF("Connecting to %s...\\n", WIFI_NETWORKS[i].ssid);
        
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
          DEBUG_PRINTF("\\nConnected! IP: %s\\n", WiFi.localIP().toString().c_str());
          needsDisplayUpdate = true;
          return;
        } else {
          DEBUG_PRINTLN("\\nConnection failed");
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
    DEBUG_PRINTF("WiFi status changed: %s\\n", wifiConnected ? "Connected" : "Disconnected");
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
  DEBUG_PRINTLN("Updating weather data...");
  
  HTTPClient http;
  String url = String(BACKEND_URL) + "/api/v1/weather/" + currentStationId + 
               "?format=json&mac=" + deviceId;
  
  http.begin(url);
  http.addHeader("User-Agent", "WeatherDisplay/1.0 ESP32C3-" + deviceId);
  http.addHeader("X-Device-MAC", deviceMAC);
  
  int httpResponseCode = http.GET();
  
  if (httpResponseCode == 200) {
    String payload = http.getString();
    if (parseWeatherResponse(payload)) {
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
    DEBUG_PRINTF("HTTP error: %d\\n", httpResponseCode);
    needsDisplayUpdate = true;
  }
  
  http.end();
  lastWeatherUpdate = millis();
}

bool parseWeatherResponse(const String& jsonString) {
  DynamicJsonDocument doc(2048);
  DeserializationError error = deserializeJson(doc, jsonString);
  
  if (error) {
    DEBUG_PRINTF("JSON parse error: %s\\n", error.c_str());
    return false;
  }
  
  // Extract weather data
  stationName = doc["stationId"].as<String>();
  
  if (doc["data"]["temperature"]["air"]) {
    temperature = doc["data"]["temperature"]["air"];
  }
  
  if (doc["data"]["wind"]["avg"]) {
    windSpeed = doc["data"]["wind"]["avg"];
  }
  
  if (doc["data"]["wind"]["gust"]) {
    windGust = doc["data"]["wind"]["gust"];  
  }
  
  if (doc["data"]["wind"]["direction"]) {
    windDirection = doc["data"]["wind"]["direction"];
  }
  
  lastUpdateTime = doc["timestamp"].as<String>();
  
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
    currentStationId = doc["stationId"].as<String>();
    
    // Save settings
    saveSettings();
    
    DEBUG_PRINTF("Device registered! Assigned station: %s\\n", currentStationId.c_str());
    
    // Trigger identify sequence for new device
    identifyRequested = true;
    needsDisplayUpdate = true;
  }
}

void sendHeartbeat() {
  DEBUG_PRINTLN("Sending heartbeat...");
  
  HTTPClient http;
  String url = String(BACKEND_URL) + "/api/v1/devices/" + deviceId + "/heartbeat";
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("User-Agent", "WeatherDisplay/1.0 ESP32C3-" + deviceId);
  
  String payload = "{\\"deviceId\\":\\"" + deviceId + "\\",\\"timestamp\\":\\"" + 
                   String(millis()) + "\\"}";
  
  int httpResponseCode = http.POST(payload);
  
  if (httpResponseCode == 200) {
    DEBUG_PRINTLN("Heartbeat sent successfully");
  } else {
    DEBUG_PRINTF("Heartbeat failed: HTTP %d\\n", httpResponseCode);
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
  currentStationId = preferences.getString("stationId", "prarion"); // Default
  
  DEBUG_PRINTF("Loaded - Registered: %s, Station: %s\\n", 
               isRegistered ? "true" : "false", 
               currentStationId.c_str());
}

void saveSettings() {
  DEBUG_PRINTLN("Saving settings to flash...");
  
  preferences.putBool("registered", isRegistered);
  preferences.putString("stationId", currentStationId);
  
  DEBUG_PRINTLN("Settings saved");
}

// ===============================================================================
// UTILITY FUNCTIONS
// ===============================================================================

void blinkLED(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_BUILTIN, HIGH);
    delay(delayMs);
    digitalWrite(LED_BUILTIN, LOW);
    delay(delayMs);
  }
}
