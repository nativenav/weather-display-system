# Weather Display System - Data Flow Design

## Overview
The weather display system should collect data from external weather APIs, normalize it into a common format, apply regional unit preferences, cache it efficiently, and serve it to different types of clients (web, ESP32, testing).

## Core Design Principles

### 1. **Single Source of Truth**
- All weather data flows through one central collection system
- Data is normalized immediately upon collection
- Regional preferences are applied consistently across all endpoints

### 2. **Consistent Backend Units**
- **All backend storage and APIs**: Use meters per second (m/s) consistently
- **Regional context maintained**: For ESP32 display format only
- **Client-side flexibility**: Web frontend handles unit conversion via user selection

### 3. **Client-Specific Formatting**
- **Backend APIs**: Always return m/s with consistent JSON structure
- **Web frontend**: User selects preferred units (kts, km/h, m/s) with client-side conversion
- **ESP32 devices**: Get pre-converted display format based on regional context
- **API consumers**: Receive consistent m/s data for their own processing

---

## Data Flow Architecture

```
External APIs → Collection → Normalization → Cache (m/s) → Endpoints
    ↓              ↓            ↓              ↓              ↓
[Brambles]    [Fetchers]   [Parsers]    [KV Store]    [JSON: m/s]
[Seaview*]                [m/s norm]                  [Display: regional]
[Lymington]                                           [Web: client conv]
[Prarion]                                             
[Tête de Balme]           *Seaview uses enhanced                                            
[Planpraz]                 historical analysis                                           
```

---

## Detailed Components

### 1. **Data Collection Layer**

#### External APIs
- **Southampton VTS** (Brambles) - Marine data in various units
- **Navis Live** (Seaview) - Raw hex data requiring parsing
- **Lymington Harbour** - Marine weather feeds
- **Pioupiou** (Prarion) - Wind sensor data
- **Windbird** (Tête de Balme, Planpraz) - Alpine wind stations

#### Collection Process
```
Every 2-5 minutes (via cron):
1. Fetch raw data from external APIs
2. Parse into common WeatherData structure (m/s)
3. Validate data quality and freshness
4. Store normalized data in cache (always m/s)
5. Unit conversion happens only at serving time
```

### 2. **Normalization & Processing**

#### Common Data Structure (Internal)
```javascript
WeatherData = {
  windSpeed: number | null,     // Always in m/s (null = no data, NOT 0)
  windGust: number | null,      // Always in m/s (null = no data, NOT 0)  
  windDirection: number | null, // Degrees 0-359 (null = no data)
  temperature: number | null,   // Celsius (null = no data)
  pressure: number | null,      // hPa (null = no data)
  timestamp: string,            // ISO 8601
  stationId: string,            // Unique identifier
  isValid: boolean              // Overall data quality flag
}
```

#### Special Data Handling
```javascript
// Seaview Enhanced Processing
processSeaviewData(rawHexData) {
  // Use historical API to get 10-minute wind analysis
  // Extract true average and peak gust values
  // Never return identical avg/gust values
  return {
    windSpeed: calculateRollingAverage(samples),
    windGust: findPeakGust(samples),
    // ... other data
  }
}

// Missing Data Handling (ALL stations)
handleMissingData(value) {
  if (!value || value === '' || value === undefined) {
    return null;  // Will display as "--" in UI
  }
  return parseFloat(value);
}
```

### 3. **Caching Strategy**

#### Cache Structure (All in m/s)
```
KV Store:
├── weather:brambles    → Latest Brambles data (m/s)
├── weather:seaview     → Latest Seaview data (m/s)  
├── weather:lymington   → Latest Lymington data (m/s)
├── weather:prarion     → Latest Prarion data (m/s)
├── weather:tetedebalme → Latest Tête de Balme data (m/s)
└── weather:planpraz    → Latest Planpraz data (m/s)
```

#### Cache Lifecycle
- **TTL**: 5 minutes (300 seconds)
- **Update**: Cron triggers every 2-5 minutes
- **Invalidation**: Automatic via TTL
- **Manual Refresh**: API endpoint for forced collection

### 4. **API Endpoints & Client Serving**

#### Individual Station Endpoints (JSON - always m/s)
```
GET /api/v1/weather/{station}
→ Returns: Single station data in m/s (backend consistent)

Example Response:
{
  "schema": "weather.v1",
  "stationId": "seaview", 
  "data": {
    "wind": {
      "avg": 8.1,         ← Always in m/s
      "gust": 9.4,        ← Always in m/s (never identical for Seaview)
      "direction": 180,
      "unit": "mps"       ← Always "mps" for JSON endpoints
    },
    "temperature": {
      "air": 8.1,
      "unit": "celsius"
    }
  }
}
```

#### Regional Endpoints (JSON - always m/s)
```
GET /api/v1/weather/region/{region}
→ Returns: All stations in region with m/s units

Example Response:
{
  "schema": "weather-region.v1",
  "regionId": "solent",
  "stations": [
    { "stationId": "lymington", "data": {"wind": {..., "unit": "mps"}} },
    { "stationId": "brambles", "data": {"wind": {..., "unit": "mps"}} },  
    { "stationId": "seaview", "data": {"wind": {..., "unit": "mps"}} }
  ]
}
```

#### Display Format - ESP32 Only (Regional Units)
```
GET /api/v1/weather/{station}?format=display
→ Returns: Plain text with regional unit conversion

Solent Example (converts m/s → kts):
=== SEAVIEW ===

Wind: 15.7kts @ 180°
Gust: 18.2kts

Temp: 8.1°C

Updated: 2025-09-04 11:30:15 UTC

Chamonix Example (converts m/s → km/h):
=== PRARION ===

Wind: 29.2km/h @ 068°
Gust: 33.8km/h

Updated: 2025-09-04 11:30:15 UTC
```

---

## Client Integration Patterns

### 1. **Web Frontend**
- **Usage**: Dashboard for monitoring multiple stations
- **Endpoint**: Regional JSON endpoints (`/api/v1/weather/region/solent`)  
- **Data Received**: Always in m/s with `"unit": "mps"`
- **Unit Conversion**: Client-side JavaScript with user dropdown selection
- **Units Available**: m/s, kts, km/h (user choice)
- **Refresh**: Every 2-5 minutes via JavaScript
- **Missing Data**: Display "--" for null values

### 2. **ESP32C3 Devices** 
- **Usage**: E-paper weather displays for specific locations
- **Endpoint**: Display format (`/api/v1/weather/seaview?format=display`)
- **Data Received**: Pre-formatted plain text with regional units
- **Units**: Regional conversion done server-side (kts for Solent, km/h for Chamonix)
- **Refresh**: Every 5-10 minutes to preserve battery
- **Device Registration**: Automatic based on MAC address
- **Missing Data**: Show "--" for unavailable fields

### 3. **API Testing/Development**
- **Usage**: Development and debugging
- **Endpoint**: Any JSON endpoint
- **Data Received**: Always m/s with `"unit": "mps"`
- **Tools**: curl, Postman, browser
- **Validation**: Verify data consistency and null handling

### 4. **Mobile/External Apps**
- **Usage**: Third-party integrations
- **Endpoint**: Individual or regional JSON endpoints
- **Data Received**: Consistent m/s data for processing
- **Unit Conversion**: Client responsibility
- **Authentication**: Optional API keys for rate limiting

---

## Regional Unit Logic

### Why Regional Units?

#### Solent (Marine Environment)
- **Unit**: Knots (kts)
- **Rationale**: Standard maritime navigation unit
- **Users**: Sailors, marine traffic, port operations
- **Context**: Tide tables, shipping forecasts use knots

#### Chamonix (Alpine Environment)  
- **Unit**: Kilometers per hour (km/h)
- **Rationale**: European standard for aviation/paragliding
- **Users**: Paragliders, hikers, mountain rescue
- **Context**: European weather forecasts use km/h

### Unit Conversion Flow
```
Raw Data (various units) 
    ↓
Normalize to m/s (internal storage)
    ↓  
Apply regional conversion:
├── Solent: m/s → knots (× 1.944)
└── Chamonix: m/s → km/h (× 3.6)
    ↓
Serve to clients with appropriate unit labels
```

---

## Error Handling & Resilience

### Data Quality
- **Validation**: Check reasonable ranges for wind/temp/pressure
- **Fallback**: Serve cached data if fresh collection fails
- **Indicators**: Include data age and quality flags in responses

### API Resilience
- **Retry Logic**: Exponential backoff for failed API calls
- **Graceful Degradation**: Partial data better than no data
- **Cache First**: Always try cache before external calls

### Client Handling
- **HTTP Status**: Proper status codes (200, 503, etc.)
- **Error Messages**: Descriptive error responses
- **CORS**: Full cross-origin support for web clients

---

## Expected Behavior Examples

### Steady Wind Conditions (Normal)
```
Seaview: avg=15.7kts, gust=15.7kts
→ This is CORRECT - indicates steady marine conditions
```

### Gusty Wind Conditions  
```
Seaview: avg=12.4kts, gust=22.1kts
→ Enhanced gust algorithm detecting wind variation
```

### Regional Consistency
```
Solent Region:
├── Lymington: 24.1kts
├── Brambles: 21.9kts  
└── Seaview: 15.7kts

Chamonix Region:  
├── Prarion: 43.2km/h
├── Planpraz: 15.8km/h
└── Tête de Balme: 27.0km/h
```

---

## Summary

The system should work as a **regional weather hub** that:

1. **Collects** diverse weather data from external APIs
2. **Normalizes** everything into a common format  
3. **Applies** regional unit preferences consistently
4. **Caches** efficiently for performance
5. **Serves** multiple client types with appropriate formatting
6. **Maintains** data quality and system resilience

The key insight is that **regional context matters** - marine users need knots, alpine users need km/h, and the system should handle this transparently while maintaining a single, reliable data pipeline.
