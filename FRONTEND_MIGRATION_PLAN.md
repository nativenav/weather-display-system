# Frontend v2.0.0 Migration Plan

## 🚨 Breaking Changes Overview

The backend v2.0.0 introduces standardized weather data parsing with **breaking changes** that require frontend updates:

1. **All wind speeds now in meters per second (m/s)** - no longer mixed units
2. **Proper null handling** - missing data is `null`, not `0`
3. **Enhanced gust accuracy** - gust values are `null` when only instantaneous data available
4. **Legacy unit detection removed** - backend no longer sends regional units

## 📋 Required Frontend Changes

### 1. **Update Wind Speed Conversion Logic** 🔧 HIGH PRIORITY

**Current Issue:**
```javascript
// Lines 409-422: Legacy unit detection based on station type
let backendUnit = 'ms'; // default fallback
if (wind.unit) {
    // Backend provides the unit it's sending
    backendUnit = wind.unit === 'kt' ? 'kts' : (wind.unit === 'km/h' ? 'kph' : 'ms');
} else {
    // Legacy fallback: determine from station type
    const stationId = station.id;
    if (['prarion', 'tetedebalme', 'planpraz'].includes(stationId)) {
        backendUnit = 'kph'; // Chamonix stations send km/h
    } else if (['brambles', 'seaview', 'lymington'].includes(stationId)) {
        backendUnit = 'kts'; // Solent stations send knots
    }
}
```

**Required Fix:**
```javascript
// All backend data is now in m/s - remove unit detection logic
function generateWeatherCard(result, windUnit) {
    if (!result.success) {
        return `<div class="weather-card error">...</div>`;
    }
    
    const { station, data } = result;
    const wind = data.data.wind || {};
    
    // Backend v2.0.0 always sends wind speeds in m/s
    const windSpeedAvg = wind.avg !== null ? convertWindSpeed(wind.avg, 'ms', windUnit) : null;
    const windSpeedGust = wind.gust !== null ? convertWindSpeed(wind.gust, 'ms', windUnit) : null;
    
    // ... rest of card generation
}
```

### 2. **Enhance Null Value Handling** 🔧 HIGH PRIORITY

**Current Issue:**
```javascript
// Line 425-426: Assumes non-null values
const windSpeedAvg = wind.avg ? convertWindSpeed(wind.avg, backendUnit, windUnit) : null;
const windSpeedGust = wind.gust ? convertWindSpeed(wind.gust, backendUnit, windUnit) : null;
```

**Required Fix:**
```javascript
// Proper null checking for v2.0.0 backend
const windSpeedAvg = (wind.avg !== null && wind.avg !== undefined) ? 
    convertWindSpeed(wind.avg, 'ms', windUnit) : null;
const windSpeedGust = (wind.gust !== null && wind.gust !== undefined) ? 
    convertWindSpeed(wind.gust, 'ms', windUnit) : null;

// Enhanced gust display with "N/A" for null values
<div class="data-item">
    <div class="data-label">Wind Gust</div>
    <div class="data-value">
        ${windSpeedGust !== null ? windSpeedGust.toFixed(1) : 'N/A'}
        <span class="data-unit">${windSpeedGust !== null ? unitLabel : ''}</span>
    </div>
    ${windSpeedGust === null ? '<div class="data-note">Instantaneous only</div>' : ''}
</div>
```

### 3. **Update Temperature and Pressure Handling** 🔧 MEDIUM PRIORITY

**Current Issue:**
```javascript
// Line 456: Limited null checking
${temp.air !== undefined && temp.air !== null && !isNaN(temp.air) ? temp.air.toFixed(1) : '--'}
```

**Required Fix:**
```javascript
// Enhanced null handling for all weather parameters
const temperature = (temp.air !== null && temp.air !== undefined && !isNaN(temp.air)) ? 
    temp.air.toFixed(1) : null;
const pressure = (pressure.value !== null && pressure.value !== undefined) ? 
    pressure.value.toFixed(1) : null;

// Display with proper null indicators
<div class="data-item">
    <div class="data-label">Temperature</div>
    <div class="data-value">
        ${temperature !== null ? temperature : 'N/A'}
        <span class="data-unit">${temperature !== null ? '°C' : ''}</span>
    </div>
</div>
```

### 4. **Add Gust Data Quality Indicators** 🔧 LOW PRIORITY

**Enhancement:**
```javascript
// Add visual indicators for gust data quality
function getGustQualityIndicator(windData) {
    if (windData.gust === null) {
        return '<span class="gust-indicator instantaneous" title="Instantaneous reading only">⚡</span>';
    } else if (windData.avg !== null && windData.gust > windData.avg * 1.3) {
        return '<span class="gust-indicator significant" title="Significant gust detected">💨</span>';
    }
    return '';
}
```

### 5. **Update API Response Structure Handling** 🔧 MEDIUM PRIORITY

**Verify backend response structure:**
```javascript
// Current structure assumption in line 405-407:
const wind = data.data.wind || {};
const temp = data.data.temperature || {};
const pressure = data.data.pressure || {};
```

**May need updates for v2.0.0 structure:**
```javascript
// Check actual v2.0.0 API response format
const weatherData = data.data || data; // Adjust based on actual structure
const windSpeed = weatherData.windSpeed; // Note: camelCase vs snake_case
const windGust = weatherData.windGust;
const windDirection = weatherData.windDirection;
const temperature = weatherData.temperature;
const pressure = weatherData.pressure;
```

## 🧪 Testing Requirements

### 1. **Unit Conversion Testing**
```javascript
// Test cases for m/s conversion
console.assert(convertWindSpeed(10, 'ms', 'kts') === 19.438, 'M/s to knots conversion');
console.assert(convertWindSpeed(10, 'ms', 'kph') === 36, 'M/s to km/h conversion');
console.assert(convertWindSpeed(10, 'ms', 'ms') === 10, 'M/s to m/s identity');
```

### 2. **Null Value Testing**
```javascript
// Test null gust handling
const testData = {
    data: {
        windSpeed: 5.2,
        windGust: null, // Instantaneous only
        windDirection: 180,
        temperature: null
    }
};
```

### 3. **Station-Specific Testing**
- **Seaview**: Test historical vs live data scenarios
- **Lymington**: Test enhanced API vs current API responses  
- **Alpine stations**: Verify altitude and unit handling

## 📅 Implementation Timeline

### Phase 1: Critical Fixes (Day 1)
- [ ] Remove legacy unit detection logic
- [ ] Update wind speed conversion to use m/s source
- [ ] Fix null value handling for gust data

### Phase 2: Enhanced Experience (Day 2)
- [ ] Add gust quality indicators
- [ ] Improve null value display (N/A vs --)
- [ ] Update API response structure handling

### Phase 3: Testing & Polish (Day 3)
- [ ] Comprehensive testing with live backend
- [ ] Browser compatibility testing
- [ ] Performance optimization
- [ ] Documentation updates

## 🚀 Deployment Strategy

### 1. **Development Testing**
```bash
# Test with local development server
cd frontend/
npm run serve

# Test against production backend v2.0.0
# Verify all stations display correctly
```

### 2. **Staging Deployment**
```bash
# Deploy to staging for testing
npm run deploy:staging

# Verify with QA checklist
```

### 3. **Production Deployment**
```bash
# Deploy to production after validation
npm run deploy
```

## ✅ QA Checklist

### Wind Data Display
- [ ] All stations show wind speeds in user-selected units
- [ ] Gust values display "N/A" when only instantaneous data available
- [ ] Proper conversion between m/s, knots, and km/h
- [ ] Wind direction displays correctly (0-359°)

### Data Quality
- [ ] Null temperature values display as "N/A"
- [ ] Null pressure values display appropriately  
- [ ] No false "0" values displayed
- [ ] Proper error handling for failed API calls

### User Experience
- [ ] Unit selector works across all stations
- [ ] Refresh functionality works correctly
- [ ] Real-time data updates properly
- [ ] Mobile responsiveness maintained

### Backend Integration
- [ ] All station APIs respond correctly
- [ ] Cron collection triggers work
- [ ] Health check displays proper status
- [ ] Error messages are helpful

## 📚 Related Documentation

- [`backend/CHANGELOG.md`](../backend/CHANGELOG.md) - Complete backend changes
- [`backend/README.md`](../backend/README.md) - API documentation
- Live API: https://weather-backend.nativenav.workers.dev/api/v1/stations
- Frontend staging: TBD after deployment

---

**Priority**: HIGH  
**Estimated Effort**: 1-2 days  
**Breaking**: Yes - requires immediate frontend updates
