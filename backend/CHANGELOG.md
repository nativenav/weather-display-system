# Backend Changelog

## [2.0.0] - 2025-09-04

### 🚨 BREAKING CHANGES

This release standardizes the weather data parsing system with significant improvements to data consistency and unit handling.

#### **Parser System Overhaul**
- **All parsers now return wind speeds in meters per second (m/s)** instead of mixed units
- **Proper null handling** for missing data instead of using `0` values  
- **Consistent field names** using the current `WeatherData` interface
- **Enhanced gust calculation logic** - gust values are `null` when only instantaneous readings available

### ✨ New Features

#### **Standardized Wind Speed Units**
All weather station parsers now internally convert to m/s:
- **Seaview**: Knots → m/s (`* 0.514444`) 
- **Brambles**: Knots → m/s (via `knotsToMeterPerSecond()`)
- **Lymington**: Already m/s (per WeatherFile API spec)
- **Pioupiou**: km/h → m/s (`/ 3.6`)
- **Windbird**: km/h → m/s (`/ 3.6`)

#### **Improved Gust Data Accuracy**
- **Seaview**: Returns `null` for gust when only live data available, proper average vs peak calculation for historical data
- **Lymington**: Returns `null` for gust on current API fallback, proper gust data from enhanced API
- **All stations**: No more false gust values from duplicating instantaneous wind speed

#### **Enhanced Null Data Handling**
- All parsers initialize with `null` for missing data fields
- Proper validation logic handles null values throughout the system
- Temperature, pressure, humidity, and optional fields use `null` when unavailable

### 🔧 Technical Improvements

#### **Parser Modernization**
- **Pioupiou & Windbird**: Migrated from deprecated `types.ts` to current `types/weather.ts` system
- **All parsers**: Enhanced error handling and logging
- **Consistent return types**: All parsers return `ParseResult` with proper structure

#### **Code Quality**
- Removed all legacy parser files and adapters
- Deprecated old type system with clear migration path
- Enhanced validation logic for edge cases
- Better error messages and debugging information

### 🗑️ Removed

- `src/parsers/pioupiou-legacy.ts` - Use `parsers/pioupiou.ts` instead
- `src/parsers/windbird-legacy.ts` - Use `parsers/windbird.ts` instead  
- `src/types.ts` - Use `types/weather.ts` instead
- `src/utils/legacy-adapter.ts` - No longer needed

### 🔄 Migration Guide

#### **For Frontend/Client Applications:**
Wind speed units are now **always meters per second (m/s)** from the API. Update display logic to convert to desired units:

```javascript
// Convert m/s to other units for display
const windSpeedKmh = windSpeedMs * 3.6;      // m/s to km/h  
const windSpeedKnots = windSpeedMs * 1.94384; // m/s to knots
const windSpeedMph = windSpeedMs * 2.237;     // m/s to mph
```

#### **For Weather Data Consumers:**
- Check for `null` values in gust data - indicates no gust data available
- All temperature, humidity, pressure fields may be `null` (not `0`) when unavailable
- Wind direction is always a number (0-359 degrees), never `null`
- Wind speed is always a number in m/s, never `null` (0 = calm conditions)

### 🚀 Performance Improvements

- Eliminated double unit conversions in legacy adapters
- Streamlined parser execution with consistent return structures  
- Reduced memory allocation through proper null handling
- Faster validation with optimized null checking logic

### 🧪 Testing & Quality

All parsers tested with:
- ✅ Live API data validation
- ✅ Null value handling  
- ✅ Unit conversion accuracy
- ✅ Edge case scenarios
- ✅ Error condition handling

### 📊 Station-Specific Improvements

#### **Seaview (Isle of Wight)**
- Enhanced historical data processing for true 1-minute average vs peak gust calculation
- Proper fallback to live data when historical unavailable  
- Accurate hex data parsing with documented algorithm

#### **Brambles Bank (Southampton)**
- Improved HTML table parsing with better error handling
- Proper knots to m/s conversion using helper functions
- Enhanced timestamp processing

#### **Lymington Starting Platform**
- Better handling of WeatherFile V03 API responses
- Proper distinction between enhanced (avg/gust) and current (instantaneous) data
- Improved API fallback logic

#### **Pioupiou 521 (Prarion, Les Houches)**
- Complete migration to current type system
- Enhanced altitude extraction and station metadata
- Improved km/h to m/s conversion accuracy

#### **Windbird (Tête de Balme & Planpraz)**
- Support for both stations 1702 and 1724
- Proper altitude extraction from station names
- Enhanced error handling and logging

---

## [1.x.x] - Previous Versions

Legacy versions with mixed unit systems and inconsistent null handling. See Git history for details.

---

**For complete API documentation, see:** `docs/API.md`  
**For migration assistance, see:** `docs/MIGRATION.md`
