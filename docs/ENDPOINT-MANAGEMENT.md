# Endpoint Management System

Comprehensive device tracking and API key management for the Weather Display System.

## 🔐 API Security Overview

The Weather Display System supports two authentication methods:
1. **Open Access** - No authentication required (current production)
2. **API Key Authentication** - Secure access for production deployments

## 🎯 Device Registration

### Automatic Device Detection
The system can automatically detect and track devices based on:
- **User Agent**: Device identification string
- **MAC Address**: Hardware identifier (optional)
- **IP Address**: Network location tracking
- **Request Patterns**: Usage analytics

### Device Registration Examples

#### ESP32C3 Device Registration
```cpp
#include <WiFi.h>
#include <HTTPClient.h>

void registerDevice() {
  HTTPClient http;
  String url = "https://weather-backend.nativenav.workers.dev/api/v1/devices/register";
  
  // Get device information
  String macAddress = WiFi.macAddress();
  String deviceId = "esp32c3-" + macAddress.substring(9); // Last 3 bytes
  
  // Create registration payload
  String payload = "{"
    "\"deviceId\": \"" + deviceId + "\","
    "\"macAddress\": \"" + macAddress + "\","
    "\"deviceType\": \"ESP32C3\","
    "\"firmware\": \"WeatherDisplay/1.0\","
    "\"location\": \"Chamonix Weather Station\""
  "}";
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("User-Agent", "WeatherClient/1.0 ESP32C3-" + deviceId);
  
  int httpCode = http.POST(payload);
  
  if (httpCode == HTTP_CODE_OK || httpCode == HTTP_CODE_CREATED) {
    String response = http.getString();
    Serial.println("Device registered successfully:");
    Serial.println(response);
    
    // Store device credentials (if provided)
    // parseRegistrationResponse(response);
    
  } else {
    Serial.printf("Registration failed: HTTP %d\n", httpCode);
  }
  
  http.end();
}
```

## 🔑 API Key Management

### API Key Structure
```json
{
  "keyId": "ak_1a2b3c4d5e6f",
  "name": "ESP32C3 Weather Display",
  "key": "weather_sk_1234567890abcdef",
  "deviceId": "esp32c3-a1b2c3",
  "createdAt": "2024-09-02T18:00:00Z",
  "lastUsed": "2024-09-02T18:30:00Z",
  "requestCount": 1247,
  "rateLimit": 720,
  "isActive": true
}
```

### Generating API Keys

#### Web Interface Method
1. Visit the [Management Interface](https://0b4669b0.weather-management.pages.dev)
2. Navigate to "Device Management" section
3. Click "Generate API Key"
4. Configure device settings and rate limits
5. Copy the generated key for use in your device

#### Programmatic Method
```bash
# Generate API key via REST API
curl -X POST https://weather-backend.nativenav.workers.dev/api/v1/keys/generate \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Chamonix Weather Display",
    "deviceId": "esp32c3-a1b2c3",
    "rateLimit": 720,
    "description": "Prarion weather station display"
  }'
```

### Using API Keys in ESP32C3

#### Basic Authentication
```cpp
const char* API_KEY = "weather_sk_1234567890abcdef";

void getWeatherWithAuth() {
  HTTPClient http;
  String url = "https://weather-backend.nativenav.workers.dev/api/v1/weather/prarion?format=display";
  
  http.begin(url);
  http.addHeader("Authorization", "Bearer " + String(API_KEY));
  http.addHeader("User-Agent", "WeatherClient/1.0 ESP32C3");
  
  int httpCode = http.GET();
  
  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    Serial.println("Authenticated request successful:");
    Serial.println(payload);
  } else if (httpCode == HTTP_CODE_UNAUTHORIZED) {
    Serial.println("Invalid API key");
  } else if (httpCode == HTTP_CODE_TOO_MANY_REQUESTS) {
    Serial.println("Rate limit exceeded");
  } else {
    Serial.printf("HTTP Error: %d\n", httpCode);
  }
  
  http.end();
}
```

#### Header-based Authentication
```cpp
void authenticatedRequest() {
  HTTPClient http;
  String url = "https://weather-backend.nativenav.workers.dev/api/v1/weather/prarion";
  
  http.begin(url);
  http.addHeader("X-API-Key", API_KEY);
  http.addHeader("X-Device-ID", "esp32c3-a1b2c3");
  http.addHeader("Accept", "application/json");
  
  int httpCode = http.GET();
  // ... handle response
  http.end();
}
```

## 📊 Device Analytics

### Request Tracking
The system automatically tracks:
- **Request Count**: Total API calls per device
- **Last Seen**: Latest activity timestamp
- **Rate Limiting**: Requests per hour monitoring
- **Error Rates**: Failed request tracking
- **Geographic Location**: IP-based location tracking

### Analytics Data Structure
```json
{
  "deviceId": "esp32c3-a1b2c3",
  "analytics": {
    "totalRequests": 15420,
    "successfulRequests": 15180,
    "failedRequests": 240,
    "averageResponseTime": 145,
    "dailyRequestCount": 1440,
    "peakUsageHour": 14,
    "lastError": {
      "timestamp": "2024-09-02T12:30:00Z",
      "errorCode": 503,
      "message": "Service temporarily unavailable"
    },
    "location": {
      "country": "France",
      "region": "Auvergne-Rhône-Alpes",
      "city": "Chamonix-Mont-Blanc"
    }
  }
}
```

## 🚦 Rate Limiting

### Default Rate Limits
- **Public Access**: 100 requests/hour per IP
- **Registered Devices**: 720 requests/hour (12 per minute)
- **Premium Keys**: 1440 requests/hour (24 per minute)
- **Burst Limit**: 10 requests per minute

### Rate Limit Headers
```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 720
X-RateLimit-Remaining: 650
X-RateLimit-Reset: 1693737600
X-RateLimit-Window: 3600
```

### Handling Rate Limits in ESP32C3
```cpp
void handleRateLimits(int httpCode, HTTPClient& http) {
  if (httpCode == HTTP_CODE_TOO_MANY_REQUESTS) {
    // Parse rate limit headers
    String resetHeader = http.header("X-RateLimit-Reset");
    String remainingHeader = http.header("X-RateLimit-Remaining");
    
    long resetTime = resetHeader.toInt();
    long currentTime = WiFi.getTime();
    long waitSeconds = resetTime - currentTime;
    
    Serial.printf("Rate limit exceeded. Reset in %ld seconds\n", waitSeconds);
    
    // Enter deep sleep until rate limit resets
    if (waitSeconds > 0 && waitSeconds < 3600) { // Max 1 hour
      esp_sleep_enable_timer_wakeup(waitSeconds * 1000000);
      esp_deep_sleep_start();
    }
  }
}
```

## 🔒 Security Features

### API Key Security
- **Prefix-based Keys**: `weather_sk_` for easy identification
- **Cryptographically Secure**: Generated using secure random algorithms
- **Rotation Support**: Keys can be rotated without device reconfiguration
- **Scoped Access**: Keys can be limited to specific endpoints or stations

### Device Verification
```cpp
// Enhanced device fingerprinting
String generateDeviceFingerprint() {
  String fingerprint = "";
  
  // Hardware identifiers
  fingerprint += "MAC:" + WiFi.macAddress() + ";";
  fingerprint += "CHIP:" + String(ESP.getChipModel()) + ";";
  fingerprint += "FLASH:" + String(ESP.getFlashChipSize()) + ";";
  fingerprint += "HEAP:" + String(ESP.getFreeHeap()) + ";";
  
  // Software identifiers
  fingerprint += "SDK:" + String(ESP.getSdkVersion()) + ";";
  fingerprint += "FIRMWARE:WeatherDisplay/1.0;";
  
  return fingerprint;
}

void authenticatedRequestWithFingerprint() {
  HTTPClient http;
  String url = "https://weather-backend.nativenav.workers.dev/api/v1/weather/prarion";
  
  http.begin(url);
  http.addHeader("Authorization", "Bearer " + String(API_KEY));
  http.addHeader("X-Device-Fingerprint", generateDeviceFingerprint());
  http.addHeader("X-Firmware-Version", "1.0.0");
  
  int httpCode = http.GET();
  // ... handle response
  http.end();
}
```

## 📋 Device Management API

### List Registered Devices
```bash
GET /api/v1/devices
Authorization: Bearer admin_key_here

Response:
{
  "devices": [
    {
      "deviceId": "esp32c3-a1b2c3",
      "macAddress": "A1:B2:C3:D4:E5:F6",
      "lastSeen": "2024-09-02T18:30:00Z",
      "userAgent": "WeatherClient/1.0 ESP32C3",
      "requestCount": 1247,
      "isActive": true,
      "location": "Chamonix, France"
    }
  ]
}
```

### Update Device Settings
```bash
PUT /api/v1/devices/esp32c3-a1b2c3
Authorization: Bearer admin_key_here
Content-Type: application/json

{
  "name": "Chamonix Weather Display - Updated",
  "rateLimit": 1440,
  "isActive": true,
  "allowedStations": ["prarion", "tetedebalme", "planpraz"]
}
```

### Revoke Device Access
```bash
DELETE /api/v1/devices/esp32c3-a1b2c3/revoke
Authorization: Bearer admin_key_here

Response:
{
  "message": "Device access revoked successfully",
  "deviceId": "esp32c3-a1b2c3",
  "timestamp": "2024-09-02T18:45:00Z"
}
```

## 🔧 Implementation Guide

### Step 1: Enable Authentication (Optional)
```javascript
// In backend configuration
const REQUIRE_AUTHENTICATION = false; // Set to true to enable
const DEFAULT_RATE_LIMIT = 720; // requests per hour
```

### Step 2: Generate Device Credentials
```cpp
// During device setup
void setupDevice() {
  Serial.begin(115200);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  // Wait for connection
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
  }
  
  // Register device (if authentication enabled)
  if (AUTHENTICATION_ENABLED) {
    registerDevice();
  }
  
  // Start weather data collection
  updateWeatherData();
}
```

### Step 3: Monitor Device Performance
Access the management interface at:
https://0b4669b0.weather-management.pages.dev/devices

## 📈 Monitoring and Alerts

### Device Health Monitoring
- **Offline Detection**: Alerts when devices haven't reported in 24 hours
- **Error Rate Monitoring**: Notifications for high error rates
- **Performance Tracking**: Response time and success rate monitoring

### Alert Configuration
```json
{
  "alerts": {
    "deviceOffline": {
      "enabled": true,
      "threshold": "24 hours",
      "webhook": "https://hooks.slack.com/services/your/webhook/url"
    },
    "highErrorRate": {
      "enabled": true,
      "threshold": 0.1,
      "window": "1 hour"
    },
    "rateLimitExceeded": {
      "enabled": true,
      "action": "throttle"
    }
  }
}
```

## 🎛️ Production Recommendations

### Security Best Practices
1. **Enable Authentication**: Use API keys for production deployments
2. **Rotate Keys Regularly**: Implement automatic key rotation
3. **Monitor Usage**: Track device behavior for anomalies
4. **Implement Rate Limiting**: Prevent abuse and ensure fair usage
5. **Use HTTPS Only**: Ensure all communications are encrypted

### Scaling Considerations
- **Database Storage**: Move device data to persistent storage (KV or database)
- **Caching Strategy**: Implement multi-tier caching for high-traffic scenarios
- **Geographic Distribution**: Deploy workers in multiple regions
- **Load Balancing**: Distribute load across multiple worker instances

---

*Ready for secure production deployment with comprehensive device management*
