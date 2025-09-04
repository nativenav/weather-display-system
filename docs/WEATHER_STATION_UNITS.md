# Weather Station Units - Native Data Sources

This document provides definitive information about the native wind speed units returned by each weather API used in the system.

## 🌊 Marine Stations (Solent Region)

### Brambles Bank (Southampton VTS)
- **Data Source**: Southampton VTS HTML scraping
- **Native Unit**: `knots` 
- **Confirmed**: HTML shows "Wind Speed: XX Knots"
- **Parser**: Correctly converts knots → m/s using `knotsToMeterPerSecond()`

### Seaview (Isle of Wight)
- **Data Source**: Navis Live Data hex format
- **Native Unit**: `knots`
- **Confirmed**: Navis documentation shows wind speed converted to knots
- **Parser**: Correctly converts knots → m/s using `* 0.514444`

### Lymington Starting Platform
- **Data Source**: WeatherFile.com V03 API
- **Native Unit**: `knots` (despite documentation claiming m/s)
- **Confirmed**: Live API test shows values consistent with nearby marine stations in knots
- **Parser**: Fixed to convert knots → m/s using `* 0.514444`

## 🏔️ Alpine Stations (Chamonix Region)

### Prarion 1865m (Pioupiou 521)
- **Data Source**: Pioupiou API (`api.pioupiou.fr/v1/live-with-meta/521`)
- **Native Unit**: `km/h` (kilometers per hour)
- **Confirmed**: Official API documentation states "Unit: km/h"
- **Live Test**: `wind_speed_avg: 7.5` (reasonable for light wind in km/h)
- **Parser**: Fixed to use values directly (no conversion needed)

### Tête de Balme 2204m (Windbird 1702)
- **Data Source**: Windbird via Pioupiou API (`api.pioupiou.fr/v1/live-with-meta/1702`)
- **Native Unit**: `km/h` (same API as Pioupiou)
- **Confirmed**: Uses identical API endpoint and format
- **Parser**: Fixed to use values directly (no conversion needed)

### Planpraz 1958m (Windbird 1724)  
- **Data Source**: Windbird via Pioupiou API (`api.pioupiou.fr/v1/live-with-meta/1724`)
- **Native Unit**: `km/h` (same API as Pioupiou)
- **Confirmed**: Uses identical API endpoint and format  
- **Parser**: Fixed to use values directly (no conversion needed)

## 🔧 Parser Fix Summary

### ❌ Previous Issues (Fixed Sept 2025)
1. **Pioupiou/Windbird**: Were incorrectly multiplying km/h by 3.6 (assuming input was m/s)
2. **Lymington**: Was treating knots values as if they were m/s
3. **Result**: Chamonix showed inflated wind speeds (~12.96x too high), Lymington showed deflated speeds

### ✅ Current Implementation
- **All parsers** convert native units to m/s for internal storage
- **Backend unit conversion** handles regional display preferences (knots for Solent, km/h for Chamonix)
- **ESP32 firmware** displays values with correct regional units
- **Web frontend** receives m/s values and converts to user-selected display units

## 📊 Unit Conversion Reference

```javascript
// Standard conversions used in the system
const KNOTS_TO_MPS = 0.514444;
const KMH_TO_MPS = 1 / 3.6;
const MPS_TO_KNOTS = 1 / 0.514444;  // 1.94384
const MPS_TO_KMH = 3.6;
```

## 🌐 Regional Display Preferences

- **Solent Region**: Display in knots (traditional marine unit)
- **Chamonix Region**: Display in km/h (common European unit)
- **Web Interface**: User-selectable units (m/s, knots, km/h)

## 📝 Data Flow

```
Raw Weather API → Native Units → Parser (convert to m/s) → Backend Storage (m/s) → Regional Conversion → Display
```

Example:
- Pioupiou API: `15 km/h` → Parser: `4.17 m/s` → Regional: `15 km/h` → Display: "15 km/h"
- Lymington API: `10 kt` → Parser: `5.14 m/s` → Regional: `10 kt` → Display: "10 kt"

---

**Last Updated**: September 4, 2025  
**Verified**: Live API testing and documentation review
