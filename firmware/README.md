# Firmware (ESP32C3 Minimal Client)

Lightweight client that:
- Performs a single HTTP GET to the backend
- Receives pre-formatted lines for an 800×480 ePaper layout
- Renders text efficiently with anti-ghosting options

## Planned
- Config via config.h (API base URL, station, refreshInterval)
- Offline demo mode (PROGMEM samples)
- OTA update manifest support (Phase 4)

## Next (Phase 3)  
- Fork from XIAO_ePaper_Serial_Display
- Add simple HTTP fetch + draw routine
- Use Arduino CLI for builds: `arduino-cli compile -b esp32:esp32:XIAO_ESP32C3`
- Maintain compatibility with Arduino IDE

