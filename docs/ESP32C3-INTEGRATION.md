# ESP32C3 Weather Display Integration Guide

Complete guide for integrating ESP32C3 devices with the Weather Display System API.

## 🎯 Quick Start for ESP32C3

### Basic HTTP Request
```cpp
#include <WiFi.h>
#include <HTTPClient.h>

void getWeatherData() {
  HTTPClient http;
  String url = "https://weather-backend.nativenav.workers.dev/api/v1/weather/prarion?format=display";
  
  http.begin(url);
  http.addHeader("User-Agent", "WeatherClient/1.0 ESP32C3");
  http.addHeader("Accept", "text/plain");
  
  int httpCode = http.GET();
  
  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    Serial.println("Weather Data:");
    Serial.println(payload);
  } else {
    Serial.printf("HTTP Error: %d\n", httpCode);
  }
  
  http.end();
}
```

## 🌐 Available API Endpoints

### Weather Data
```cpp
// Get JSON format (for parsing)
GET /api/v1/weather/{station_id}

// Get display format (pre-formatted for ePaper)
GET /api/v1/weather/{station_id}?format=display

// Available stations: prarion, tetedebalme, planpraz, brambles, seaview, lymington
```

### System Information
```cpp
// Health check
GET /health

// List all stations
GET /api/v1/stations

// Get system configuration
GET /api/v1/config
```

## 📍 Station IDs for Chamonix Valley

| Station ID | Name | Location | Altitude | Data Source |
|------------|------|----------|----------|-------------|
| `prarion` | Prarion (Les Houches) | 45.9025°N, 6.7867°E | 1,865m | Pioupiou 521 |
| `tetedebalme` | Tête de Balme | 45.9972°N, 6.9619°E | 2,204m | Windbird 1702 |
| `planpraz` | Planpraz | 45.9547°N, 6.8750°E | 1,958m | Windbird 1724 |

## 🔧 Complete ESP32C3 Example

### Weather Display Client
```cpp
#include <WiFi.h>
#include <HTTPClient.h>

// Configuration
const char* ssid = "YourWiFiSSID";
const char* password = "YourPassword";
const char* apiBaseUrl = "https://weather-backend.nativenav.workers.dev";
const char* stationId = "prarion";  // Change to desired station

// Timing
unsigned long lastUpdate = 0;
const unsigned long updateInterval = 5 * 60 * 1000;  // 5 minutes

void setup() {
  Serial.begin(115200);
  delay(2000);
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }
  
  Serial.println();
  Serial.println("WiFi connected!");
  Serial.printf("IP: %s\n", WiFi.localIP().toString().c_str());
  
  // Get initial weather data
  updateWeatherData();
}

void loop() {
  // Update weather data every 5 minutes
  if (millis() - lastUpdate > updateInterval) {
    updateWeatherData();
  }
  
  delay(1000);
}

void updateWeatherData() {
  Serial.println("Fetching weather data...");
  
  HTTPClient http;
  String url = String(apiBaseUrl) + "/api/v1/weather/" + stationId + "?format=display";
  
  http.begin(url);
  http.addHeader("User-Agent", "WeatherDisplay/1.0 ESP32C3");
  http.addHeader("Accept", "text/plain");
  http.setTimeout(10000);  // 10 second timeout
  
  int httpCode = http.GET();
  
  if (httpCode == HTTP_CODE_OK) {
    String weatherData = http.getString();
    
    Serial.println("=== WEATHER UPDATE ===");
    Serial.println(weatherData);
    Serial.println("======================");
    
    // Here you would parse and display on ePaper
    displayWeatherOnEPaper(weatherData);
    
    lastUpdate = millis();
    
  } else if (httpCode > 0) {
    Serial.printf("HTTP Error: %d\n", httpCode);
  } else {
    Serial.printf("Connection Error: %s\n", http.errorToString(httpCode).c_str());
  }
  
  http.end();
}

void displayWeatherOnEPaper(String data) {
  // Parse display data and show on ePaper display
  // Implementation depends on your ePaper library
  
  Serial.println("Updating ePaper display...");
  
  // Split data by lines for display
  int lineCount = 0;
  int startIndex = 0;
  
  while (startIndex < data.length()) {
    int newlineIndex = data.indexOf('\n', startIndex);
    if (newlineIndex == -1) newlineIndex = data.length();
    
    String line = data.substring(startIndex, newlineIndex);
    line.trim();
    
    if (line.length() > 0) {
      Serial.printf("Line %d: %s\n", lineCount++, line.c_str());
      
      // Add your ePaper drawing code here:
      // epaper.drawString(line, x, y + (lineCount * lineHeight));
    }
    
    startIndex = newlineIndex + 1;
  }
  
  // epaper.update();  // Refresh ePaper display
}
```

### JSON Parsing Example
```cpp
#include <ArduinoJson.h>

void parseJSONWeather() {
  HTTPClient http;
  String url = String(apiBaseUrl) + "/api/v1/weather/" + stationId;
  
  http.begin(url);
  http.addHeader("Accept", "application/json");
  
  int httpCode = http.GET();
  
  if (httpCode == HTTP_CODE_OK) {
    String jsonString = http.getString();
    
    // Parse JSON (adjust size based on response)
    DynamicJsonDocument doc(2048);
    DeserializationError error = deserializeJson(doc, jsonString);
    
    if (!error) {
      // Extract weather data
      String stationName = doc["stationId"];
      float windSpeed = doc["data"]["wind"]["avg"];
      float windGust = doc["data"]["wind"]["gust"];
      String windDirection = doc["data"]["wind"]["direction"];
      float temperature = doc["data"]["temperature"]["air"];
      
      Serial.printf("Station: %s\n", stationName.c_str());
      Serial.printf("Wind: %.1f m/s, Gust: %.1f m/s\n", windSpeed, windGust);
      Serial.printf("Direction: %s\n", windDirection.c_str());
      Serial.printf("Temperature: %.1f°C\n", temperature);
      
    } else {
      Serial.println("JSON parsing failed");
    }
  }
  
  http.end();
}
```

## 🔄 Error Handling Best Practices

### Robust HTTP Client
```cpp
bool fetchWeatherWithRetry(int maxRetries = 3) {
  for (int attempt = 0; attempt < maxRetries; attempt++) {
    HTTPClient http;
    String url = String(apiBaseUrl) + "/api/v1/weather/" + stationId + "?format=display";
    
    http.begin(url);
    http.addHeader("User-Agent", "WeatherDisplay/1.0 ESP32C3");
    http.setTimeout(10000);
    
    int httpCode = http.GET();
    
    if (httpCode == HTTP_CODE_OK) {
      String payload = http.getString();
      http.end();
      
      // Process successful response
      displayWeatherOnEPaper(payload);
      return true;
      
    } else {
      Serial.printf("Attempt %d failed: HTTP %d\n", attempt + 1, httpCode);
      http.end();
      
      if (attempt < maxRetries - 1) {
        delay(5000);  // Wait 5 seconds before retry
      }
    }
  }
  
  // All attempts failed - show error on display
  showErrorOnDisplay("Weather data unavailable");
  return false;
}
```

### WiFi Connection Management
```cpp
void ensureWiFiConnection() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected. Reconnecting...");
    
    WiFi.disconnect();
    WiFi.begin(ssid, password);
    
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
      delay(500);
      Serial.print(".");
      attempts++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("WiFi reconnected!");
    } else {
      Serial.println("WiFi connection failed!");
      showErrorOnDisplay("WiFi connection lost");
    }
  }
}
```

## ⚡ Power Management

### Deep Sleep Example
```cpp
#include <esp_sleep.h>

void enterDeepSleep(int minutes) {
  Serial.printf("Entering deep sleep for %d minutes\n", minutes);
  
  // Configure wake up timer
  esp_sleep_enable_timer_wakeup(minutes * 60 * 1000000ULL);  // microseconds
  
  // Enter deep sleep
  esp_deep_sleep_start();
}

void setup() {
  // ... WiFi and initial setup ...
  
  // Update weather data
  updateWeatherData();
  
  // Sleep for 5 minutes to save power
  enterDeepSleep(5);
}
```

## 📊 Memory Optimization

### Efficient String Handling
```cpp
// Use String reserve to prevent fragmentation
void updateWeatherData() {
  String weatherData;
  weatherData.reserve(1024);  // Reserve space
  
  HTTPClient http;
  // ... HTTP request code ...
  
  if (httpCode == HTTP_CODE_OK) {
    weatherData = http.getString();
    processWeatherData(weatherData);
  }
  
  // weatherData automatically freed when out of scope
}

// Use const char* for static strings
const char* getStationName(const char* stationId) {
  if (strcmp(stationId, "prarion") == 0) return "Prarion (Les Houches)";
  if (strcmp(stationId, "tetedebalme") == 0) return "Tête de Balme";
  if (strcmp(stationId, "planpraz") == 0) return "Planpraz";
  return "Unknown Station";
}
```

## 🎛️ Station Switching

### Multi-Station Display
```cpp
const char* stations[] = {"prarion", "tetedebalme", "planpraz"};
const int stationCount = sizeof(stations) / sizeof(stations[0]);
int currentStation = 0;

void cycleStations() {
  currentStation = (currentStation + 1) % stationCount;
  Serial.printf("Switching to station: %s\n", stations[currentStation]);
  
  // Update display with new station data
  updateWeatherData();
}

// Call cycleStations() every 30 seconds or on button press
```

## 🔧 Hardware Setup

### Pin Configuration for XIAO ESP32C3
```cpp
// Status LED (built-in)
#define STATUS_LED 8

// Optional external components
#define BUTTON_PIN 9      // For manual refresh
#define BUZZER_PIN 10     // For alerts

void setup() {
  pinMode(STATUS_LED, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(BUZZER_PIN, OUTPUT);
  
  // ... rest of setup ...
}

void indicateStatus(bool success) {
  if (success) {
    // Quick double blink for success
    digitalWrite(STATUS_LED, HIGH);
    delay(100);
    digitalWrite(STATUS_LED, LOW);
    delay(100);
    digitalWrite(STATUS_LED, HIGH);
    delay(100);
    digitalWrite(STATUS_LED, LOW);
  } else {
    // Slow blink for error
    for (int i = 0; i < 5; i++) {
      digitalWrite(STATUS_LED, HIGH);
      delay(200);
      digitalWrite(STATUS_LED, LOW);
      delay(200);
    }
  }
}
```

## 📋 Response Format Examples

### Display Format Response
```
=== PRARION 1865m ===

Wind: 12.3 m/s @ WSW
Gust: 18.7 m/s
Direction: 247°

Temperature: 8.2°C

Updated: 17:45 UTC
Status: Live Data
Location: Les Houches
```

### JSON Format Response
```json
{
  "schema": "weather.v1",
  "stationId": "prarion",
  "timestamp": "2024-09-02T17:45:00Z",
  "data": {
    "wind": {
      "avg": 12.3,
      "gust": 18.7,
      "direction": 247,
      "unit": "mps"
    },
    "temperature": {
      "air": 8.2,
      "unit": "celsius"
    }
  },
  "ttl": 300
}
```

## ⚠️ Important Notes

1. **Rate Limiting**: The API refreshes every 5 minutes. Requesting more frequently returns cached data.

2. **Timeout Handling**: Always set HTTP timeouts (10-15 seconds recommended).

3. **Error Recovery**: Implement fallback mechanisms for network failures.

4. **Memory Management**: ESP32C3 has limited RAM - manage strings carefully.

5. **Power Consumption**: Use deep sleep for battery-powered applications.

6. **SSL/TLS**: HTTPS is supported but uses more memory and power.

---

*Ready for production deployment with the live backend at https://weather-backend.nativenav.workers.dev*
