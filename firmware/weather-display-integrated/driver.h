/**
 * Hardware Driver Configuration
 * Weather Display Integrated - XIAO ESP32C3 + 7.5" ePaper
 */

#pragma once

// Target hardware configuration
#define TARGET_BOARD_XIAO_ESP32C3
#define USE_XIAO_EPAPER_DRIVER_BOARD

// ePaper Display Configuration
#define BOARD_SCREEN_COMBO 502 // 7.5 inch monochrome ePaper Screen (UC8179)
#define EPAPER_ENABLE 1

// Include the ePaper library definitions
#ifdef EPAPER_ENABLE
  // Using TFT_eSPI library with custom configuration for ePaper
  // Make sure to install Seeed_GFX library from GitHub:
  // https://github.com/Seeed-Studio/Seeed_GFX
  
  // Display dimensions (UC8179 controller)
  #define DISPLAY_WIDTH  800
  #define DISPLAY_HEIGHT 480
  
  // SPI Pin definitions for XIAO ePaper Driver Board
  #define EPAPER_SCK   8   // D8 - SCLK
  #define EPAPER_MISO  9   // D9 - MISO  
  #define EPAPER_MOSI  10  // D10 - MOSI
  #define EPAPER_CS    1   // D1 - CS
  #define EPAPER_DC    3   // D3 - DC
  #define EPAPER_BUSY  2   // D2 - BUSY
  #define EPAPER_RST   0   // D0 - RST
  
  // Include TFT_eSPI configured for ePaper
  #include <TFT_eSPI.h>
  
  // Create ePaper display object
  typedef TFT_eSPI EPaper;
  
  // Display refresh settings
  #define USE_FULL_REFRESH true
  #define ANTI_GHOSTING_ENABLED true
  
#else
  #warning "ePaper display not enabled! Set EPAPER_ENABLE to 1"
#endif

// LED Configuration
#define LED_BUILTIN 21  // XIAO ESP32C3 built-in LED pin
#define STATUS_LED_PIN LED_BUILTIN

// Debug Configuration
#ifdef DEBUG
  #define DEBUG_PRINTLN(x) Serial.println(x)
  #define DEBUG_PRINTF(fmt, ...) Serial.printf(fmt, ##__VA_ARGS__)
#else
  #define DEBUG_PRINTLN(x)
  #define DEBUG_PRINTF(fmt, ...)
#endif

// Memory Configuration
#define HEAP_WARNING_THRESHOLD 50000  // Warn if heap drops below 50KB
#define JSON_BUFFER_SIZE 2048          // JSON parsing buffer
#define MAX_STRING_LENGTH 256          // Maximum string buffer size

// Network Configuration
#define HTTP_TIMEOUT 10000             // 10 second HTTP timeout
#define WIFI_CONNECT_TIMEOUT 30000     // 30 second WiFi connect timeout
#define MAX_WIFI_RECONNECT_ATTEMPTS 5  // Maximum WiFi reconnection attempts

// Display Configuration
#define MAX_DISPLAY_LINES 10           // Maximum lines on display
#define DISPLAY_LINE_HEIGHT 25         // Pixels per line
#define DISPLAY_MARGIN 10              // Display margin in pixels
