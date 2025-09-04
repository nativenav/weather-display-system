# Weather Display System - Test URLs

## System Health & Configuration

### Basic Health Check
- **Health**: https://weather-backend.nativenav.workers.dev/health
- **Config**: https://weather-backend.nativenav.workers.dev/api/v1/config

### System Information  
- **Stations List**: https://weather-backend.nativenav.workers.dev/api/v1/stations
- **Regions List**: https://weather-backend.nativenav.workers.dev/api/v1/regions

---

## Individual Station Data (JSON Format)

### Solent Region Stations (Should show "kts")
- **Brambles**: https://weather-backend.nativenav.workers.dev/api/v1/weather/brambles
- **Seaview**: https://weather-backend.nativenav.workers.dev/api/v1/weather/seaview
- **Lymington**: https://weather-backend.nativenav.workers.dev/api/v1/weather/lymington

### Chamonix Region Stations (Should show "km/h") 
- **Prarion**: https://weather-backend.nativenav.workers.dev/api/v1/weather/prarion
- **Tête de Balme**: https://weather-backend.nativenav.workers.dev/api/v1/weather/tetedebalme
- **Planpraz**: https://weather-backend.nativenav.workers.dev/api/v1/weather/planpraz

---

## Regional Data (JSON Format)

### Multi-Station Regional Endpoints
- **Solent Region**: https://weather-backend.nativenav.workers.dev/api/v1/weather/region/solent
- **Chamonix Region**: https://weather-backend.nativenav.workers.dev/api/v1/weather/region/chamonix

---

## Display Format (ESP32C3 Format)

### Individual Stations - Display Format
- **Seaview Display**: https://weather-backend.nativenav.workers.dev/api/v1/weather/seaview?format=display
- **Prarion Display**: https://weather-backend.nativenav.workers.dev/api/v1/weather/prarion?format=display
- **Brambles Display**: https://weather-backend.nativenav.workers.dev/api/v1/weather/brambles?format=display

---

## Device Management (Optional)

### Device Endpoints
- **All Devices**: https://weather-backend.nativenav.workers.dev/api/v1/devices

---

## Data Collection & Management

### Manual Data Collection
- **Trigger Collection**: `curl -X POST https://weather-backend.nativenav.workers.dev/api/v1/collect`

---

## Testing Commands (Copy & Paste)

### Quick Unit Validation
```bash
# Test Solent units (should all be "kts")
curl -s "https://weather-backend.nativenav.workers.dev/api/v1/weather/region/solent" | jq '.stations[] | {station: .stationId, unit: .data.wind.unit, avg: .data.wind.avg}'

# Test Chamonix units (should all be "km/h")  
curl -s "https://weather-backend.nativenav.workers.dev/api/v1/weather/region/chamonix" | jq '.stations[] | {station: .stationId, unit: .data.wind.unit, avg: .data.wind.avg}'
```

### Seaview Gust Analysis
```bash
# Check if Seaview shows gust differentiation
curl -s "https://weather-backend.nativenav.workers.dev/api/v1/weather/seaview" | jq '{station: .stationId, avg: .data.wind.avg, gust: .data.wind.gust, difference: (.data.wind.gust - .data.wind.avg), unit: .data.wind.unit}'
```

### Display Format Testing
```bash
# Test display format for different regions
echo "=== Seaview (Solent) ==="
curl -s "https://weather-backend.nativenav.workers.dev/api/v1/weather/seaview?format=display"

echo -e "\n=== Prarion (Chamonix) ==="
curl -s "https://weather-backend.nativenav.workers.dev/api/v1/weather/prarion?format=display"
```

---

## Expected Results Summary

### Unit Expectations
- **Solent stations**: `"unit": "kts"` (knots for marine)
- **Chamonix stations**: `"unit": "km/h"` (km/h for alpine/paragliding)

### Seaview Gust Behavior
- **Normal**: `avg = gust` when wind conditions are steady
- **Gusty**: `gust > avg` when wind conditions are variable
- **Enhanced algorithm**: Processes 10-minute windows for better gust detection

### Display Format
- **Seaview**: Shows speeds in knots (e.g., "15.7kts @ 180°")
- **Chamonix**: Shows speeds in km/h (e.g., "43.2km/h @ 68°")

---

## Web Interface
- **Frontend**: https://f1de89eb.weather-display-blue.pages.dev

## Troubleshooting
If any endpoint shows unexpected results:
1. Force fresh data collection: `curl -X POST https://weather-backend.nativenav.workers.dev/api/v1/collect`
2. Wait 30 seconds for cache to update
3. Re-test the problematic endpoint
4. Check system health: https://weather-backend.nativenav.workers.dev/health

---

**Current Deployment Version**: 78671107-94c5-4863-8fee-98f51af5996b  
**Last Updated**: 2025-09-04T10:52:29Z
