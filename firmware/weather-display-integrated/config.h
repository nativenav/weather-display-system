/**
 * Configuration Constants
 * Weather Display Integrated - XIAO ESP32C3 + 7.5" ePaper
 */

#pragma once

// Debug mode - set to 1 to enable debug output
#define DEBUG 1

// Backend Configuration
#define BACKEND_URL "https://weather-backend.nativenav.workers.dev"

// Update Intervals (milliseconds)
// Backend cron triggers run every 2-3 minutes, device sync matches this frequency
#define WEATHER_UPDATE_INTERVAL 180000    // 3 minutes (aligned with backend cron schedule)
#define HEARTBEAT_INTERVAL 60000          // 1 minute (device status monitoring)
#define WIFI_CHECK_INTERVAL 30000         // 30 seconds (connection monitoring)

// Display Settings
#define FULL_REFRESH_CYCLES 5             // Full refresh every N cycles (reduced for better anti-ghosting)
#define IDENTIFY_FLASH_COUNT 3            // Number of flashes for identify
#define IDENTIFY_FLASH_DELAY 500          // Delay between identify flashes (ms)
#define ANTI_GHOST_DELAY 300              // Delay between anti-ghosting stages (ms)

// Default Station Settings
#define DEFAULT_STATION_CHAMONIX "prarion"
#define DEFAULT_STATION_SOLENT "brambles"
#define DEFAULT_REGION "chamonix"

// Network Retry Settings
#define MAX_HTTP_RETRIES 3
#define HTTP_RETRY_DELAY 1000             // 1 second between retries

// Device Settings
#define DEVICE_FIRMWARE_VERSION "1.0.0"
#define DEVICE_USER_AGENT "WeatherDisplay/1.0 ESP32C3"

// Memory Management
#define ENABLE_HEAP_MONITORING 1
#define HEAP_CHECK_INTERVAL 30000         // 30 seconds

// Error Recovery
#define ERROR_RECOVERY_TIMEOUT 300000     // 5 minutes before showing error state
#define WIFI_RECOVERY_TIMEOUT 60000       // 1 minute WiFi recovery timeout
