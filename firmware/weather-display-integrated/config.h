/**
 * Configuration Constants
 * Weather Display Integrated v2.0.0 - XIAO ESP32C3 + 7.5" ePaper
 * Compatible with Backend API v2.0.0
 */

#pragma once

// Debug mode - set to 1 to enable debug output
#define DEBUG 1

// Backend Configuration - v2.0.0 API
#define BACKEND_URL "https://weather-backend.nativenav.workers.dev"

// Update Intervals (milliseconds)
#define WEATHER_UPDATE_INTERVAL 180000    // 3 minutes (reduced for better UX)
#define HEARTBEAT_INTERVAL 30000          // 30 seconds  
#define WIFI_CHECK_INTERVAL 10000         // 10 seconds

// Display Settings - Aggressive Anti-Ghosting v2.0.0
#define FULL_REFRESH_ALWAYS 1             // Always use full refresh for perfect quality
#define FLASH_CLEAR_CYCLES 3              // Triple flash clearing for zero ghosting
#define ANTI_GHOST_DELAY 400              // 400ms delays for thorough clearing
#define IDENTIFY_FLASH_COUNT 3            // Number of flashes for identify
#define IDENTIFY_FLASH_DELAY 500          // Delay between identify flashes (ms)

// Regional Configuration v2.0.0
#define DEFAULT_REGION "chamonix"          // Default region assignment
#define CHAMONIX_DISPLAY_UNIT "kph"       // Alpine stations: km/h
#define SOLENT_DISPLAY_UNIT "kts"         // Marine stations: knots
#define ENABLE_REGIONAL_UNITS 1           // Enable unit conversion for display

// Network Retry Settings
#define MAX_HTTP_RETRIES 3
#define HTTP_RETRY_DELAY 1000             // 1 second between retries
#define MAX_WIFI_RECONNECT_ATTEMPTS 5     // WiFi reconnection attempts

// Device Settings v2.0.0
#define DEVICE_FIRMWARE_VERSION "2.0.0"
#define DEVICE_USER_AGENT "WeatherDisplay/2.0.0 ESP32C3"

// Memory Management - Enhanced for 3-station parsing
#define ENABLE_HEAP_MONITORING 1
#define HEAP_CHECK_INTERVAL 30000         // 30 seconds
#define JSON_BUFFER_SIZE 4096             // Larger buffer for 3 stations

// v2.0.0 Backend Compatibility
#define API_VERSION "2.0.0"
#define WIND_UNIT_SOURCE "mps"            // Backend always returns m/s
#define ENABLE_NULL_HANDLING 1            // Enhanced null data handling
#define TEMPERATURE_RANGE_MIN -60.0       // Valid temperature range (Celsius)
#define TEMPERATURE_RANGE_MAX 60.0

// Error Recovery
#define ERROR_RECOVERY_TIMEOUT 300000     // 5 minutes before showing error state
#define WIFI_RECOVERY_TIMEOUT 60000       // 1 minute WiFi recovery timeout
