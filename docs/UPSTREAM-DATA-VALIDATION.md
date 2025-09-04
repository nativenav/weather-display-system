# Upstream Data Validation Implementation

## Overview

This document describes the comprehensive upstream data validation system implemented to fix null/blank data handling issues throughout the weather display system. The solution ensures consistent data sanitization at the parser level, eliminating downstream workarounds.

## Problem Statement

Previously, the system had inconsistent data validation and null handling:

- **Temperature Issues**: Zero temperatures (0°C) were treated as missing data instead of valid freezing point temperatures
- **Inconsistent Null Handling**: Some parsers used `0` for missing data, others used `null`, creating confusion
- **Downstream Patches**: Frontend, backend helpers, and firmware all had different logic to work around data issues
- **Missing Data Validation**: No centralized validation of reasonable value ranges

## Solution: Upstream Data Validation

### 1. Standardized Types (`backend/src/types.ts`)

Created a unified `WeatherData` interface with clear null semantics:

```typescript
export interface WeatherData {
  // Core measurements - null indicates missing/unavailable data
  temperature: number | null;  // Celsius, null if not available
  humidity: number | null;     // %, null if not available  
  pressure: number | null;     // hPa/mBar, null if not available
  
  // Wind measurements - 0 indicates calm conditions
  wind_speed: number;          // Never null, 0 = calm
  wind_gust: number | null;    // null if not available
  wind_direction: number;      // Normalized to 0-359 degrees
  // ... other fields
}
```

### 2. Validation Functions

Implemented comprehensive validation with `validateWeatherData()`:

- **Temperature**: Accepts -60°C to +60°C range, null for missing data
- **Pressure**: Validates 800-1200 hPa range
- **Wind Speed**: Non-negative values, capped at 200 (regional units)
- **Wind Direction**: Normalized to 0-359 degrees
- **Null Handling**: Consistent conversion of invalid data to null

### 3. Parser Updates

Updated Pioupiou and Windbird parsers to use upstream validation:

```typescript
// Before: Manual validation and potential inconsistencies
return {
  temperature: null,
  wind_speed: Math.round(windSpeedKmh * 10) / 10,
  // ...
};

// After: Centralized validation
const rawData: Partial<WeatherData> = {
  temperature: null, 
  wind_speed: measurements.wind_speed_avg,
  // ...
};
return validateWeatherData(rawData);
```

### 4. Backend Collection Fixes

Fixed temperature exclusion logic in `collectStationData()`:

```typescript
// Before: Excluded zero/negative temperatures
if (weatherData.temperature > -50) {
  response.data.temperature = { air: weatherData.temperature, unit: "celsius" };
}

// After: Includes all valid temperatures
if (weatherData.temperature !== undefined && 
    weatherData.temperature !== null && 
    !isNaN(weatherData.temperature) &&
    weatherData.temperature >= -60 && 
    weatherData.temperature <= 60) {
  response.data.temperature = { air: weatherData.temperature, unit: "celsius" };
}
```

### 5. Helper Function Improvements

Updated `formatDisplayLines()` to show zero/negative temperatures:

```typescript
// Before: Only positive temperatures
if (data.temperature !== undefined && data.temperature > 0) {
  lines.push(`Temp: ${data.temperature.toFixed(1)}°C`);
}

// After: All valid temperatures
if (data.temperature !== undefined && data.temperature !== null && !isNaN(data.temperature)) {
  lines.push(`Temp: ${data.temperature.toFixed(1)}°C`);
}
```

### 6. Firmware Temperature Fix

Updated ESP32 firmware to display zero/negative temperatures:

```cpp
// Before: Treated 0°C as missing data
if (stations[i].temperature == 0.0 || isnan(stations[i].temperature)) {
  tempDisplay = "AIR TEMP: -- deg C";
}

// After: Only hide truly invalid data
if (isnan(stations[i].temperature) || 
    stations[i].temperature < -60.0 || 
    stations[i].temperature > 60.0) {
  tempDisplay = "AIR TEMP: -- deg C";
}
```

## Testing and Validation

Created comprehensive tests (`backend/test-validation.ts`) covering:

✅ **Zero Temperature (0°C)**: Properly preserved as valid temperature  
✅ **Negative Temperature (-15.5°C)**: Valid for alpine conditions  
✅ **Invalid Temperature (99999°C)**: Correctly sanitized to null  
✅ **Invalid Pressure (0 hPa)**: Correctly sanitized to null  
✅ **Null/Undefined Data**: Properly converted to null  
✅ **Wind Direction**: Normalized (425° → 65°)

## Benefits

### 1. Consistent Data Handling
- All parsers now produce standardized, validated data
- Clear distinction between missing data (null) and zero values
- Eliminates confusion about data validity

### 2. Accurate Temperature Display  
- Zero temperatures now display correctly (0.0°C)
- Negative alpine temperatures show properly (-15.5°C)
- Invalid data properly excluded

### 3. Reduced Complexity
- Eliminated multiple downstream null-handling patches
- Centralized validation logic in one place
- Simplified frontend and firmware code

### 4. Better User Experience
- More accurate weather data display
- Consistent behavior across all interfaces (web, firmware, API)
- Proper handling of edge cases

## Deployment Status

- ✅ **Backend**: Deployed to Cloudflare Workers (Version d6508cdb)  
- ✅ **Repository**: Changes pushed to main branch (commit fef921a)
- ✅ **Documentation**: Updated with validation details
- ✅ **Testing**: Comprehensive validation tests passing

## Future Considerations

1. **Legacy Parser Migration**: Consider migrating remaining legacy parsers (Brambles, Seaview, Lymington) to use the standardized validation system
2. **Extended Validation**: Could add more sophisticated validation rules based on station location/type
3. **Data Quality Metrics**: Could track validation statistics to identify problematic data sources
4. **Historical Data**: Consider applying validation to historical data cleanup

## Files Modified

- `backend/src/types.ts` - New standardized types and validation
- `backend/src/parsers/pioupiou.ts` - Updated to use validation  
- `backend/src/parsers/windbird.ts` - Updated to use validation
- `backend/src/utils/helpers.ts` - Fixed temperature display logic
- `backend/src/index.ts` - Fixed collection temperature handling
- `firmware/weather-display-integrated/weather-display-integrated.ino` - Fixed temperature display

The upstream data validation system ensures reliable, consistent weather data throughout the entire system, eliminating the temperature null/zero handling issues identified in the initial problem report.

## Recent Corrections

### Lymington Parser Wind Units Fix
- **Corrected**: WeatherFile.com API returns wind speeds in **m/s** (as documented)
- **Fixed**: Removed incorrect knots-to-m/s conversion (`* 0.514444`) that was applied unnecessarily
- **Result**: Lymington wind speeds now correctly reported in m/s without false unit conversion
