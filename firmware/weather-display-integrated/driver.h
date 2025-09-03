/**
 * Hardware Driver Configuration
 * Weather Display Integrated - XIAO ESP32C3 + 7.5" ePaper
 * 
 * Uses Seeed_GFX library (fork of TFT_eSPI) for ePaper support
 * Setup 502 provides proper configuration for 7.5" ePaper with UC8179 controller
 */

#pragma once

// Required by Seeed_GFX Dynamic_Setup.h
#define BOARD_SCREEN_COMBO 502 // 7.5 inch monochrome ePaper Screen (UC8179)
#define USE_XIAO_EPAPER_DRIVER_BOARD

// Use Seeed_GFX Setup502 for XIAO ESP32C3 + 7.5" ePaper
#define USER_SETUP_ID 502
#define UC8179_DRIVER
#define EPAPER_ENABLE 1  // Enable ePaper display

// Display dimensions (7.5" ePaper - UC8179 controller)
#define TFT_WIDTH 800
#define TFT_HEIGHT 480
#define EPD_WIDTH TFT_WIDTH
#define EPD_HEIGHT TFT_HEIGHT

// Pin definitions for XIAO ePaper Driver Board
#define TFT_SCLK D8   // SCLK
#define TFT_MISO D9   // MISO  
#define TFT_MOSI D10  // MOSI
#define TFT_CS   D1   // CS - Chip select control pin
#define TFT_DC   D3   // DC - Data Command control pin
#define TFT_BUSY D2   // BUSY
#define TFT_RST  D0   // RST - Reset pin

// Font loading
#define LOAD_GLCD   // Font 1. Original Adafruit 8 pixel font
#define LOAD_FONT2  // Font 2. Small 16 pixel high font
#define LOAD_FONT4  // Font 4. Medium 26 pixel high font
#define LOAD_FONT6  // Font 6. Large 48 pixel font
#define LOAD_FONT7  // Font 7. 7 segment 48 pixel font
#define LOAD_FONT8  // Font 8. Large 75 pixel font
#define LOAD_GFXFF  // FreeFonts access
#define SMOOTH_FONT

// SPI frequency for XIAO ESP32C3
#define SPI_FREQUENCY 10000000
#define SPI_READ_FREQUENCY 4000000

// Display refresh settings (Seeed_GFX provides native EPaper class)
#ifdef EPAPER_ENABLE
  #define USE_FULL_REFRESH true
  #define ANTI_GHOSTING_ENABLED true
#endif

// LED Configuration
#define LED_BUILTIN 21  // XIAO ESP32C3 built-in LED pin
#define STATUS_LED_PIN LED_BUILTIN

// Debug Configuration
#if DEBUG
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
