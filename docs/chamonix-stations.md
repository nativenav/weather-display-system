# Chamonix Valley Weather Stations Research

## Target Stations

We need 3 weather stations in the Chamonix Valley with different elevations:

1. **High Altitude**: Aiguille du Midi (3,842m) - alpine/glacial conditions
2. **Valley Floor**: Chamonix town (~1,030m) - typical valley weather
3. **Mid-Elevation**: Les Houches or Argentière (~1,000-1,900m) - intermediate conditions

## Candidate Data Sources

### 1. Météo France / Infoclimat

**Infoclimat API**: https://www.infoclimat.fr
- **Station**: Chamonix (74009001)
- **URL**: `https://www.infoclimat.fr/public-api/gfs/json?_ll=45.923,6.869&_auth=ARsDFFIsBCZRfFtsD3lSe1Q8ADUPeVRzBHgFZgtuAH1UMQNgUTNcPlU5VClSfVZkUn8AYVxmVW0Eb1I2WylSLgFgA25SNwRuUT1bZw83UnlUeAB9DzFUcwR4BWMLYwB9VCkDb1EzXCBVOVQoUn1WZFJ%2FAGVcZlVtBG9SNls5Ui4BYANuUjEEb1E9W2cPN1J5VDkAeg9pVGkEbwVjC2MAfVQyA2JRMlw5VThUKVJ9VmNSfgBhXGZVbQRvUjZbOVIuAWADblIxBG9RPVtnDzdSeVR5AHoPaVRpBG8FYwthAH1UMgNiUTNcOFVuVCNSe1Z3UnwAZVxkVWEEYlIgWjxSKwFiAy5SZARoUTBbe1I%3D&_c=19f3aa7d766b6ba91191c8be71dd1ab2`
- **Format**: JSON
- **Update**: Every 10 minutes
- **Data**: Temperature, pressure, wind speed, wind direction, humidity

### 2. Open Weather Map

**Station**: Chamonix-Mont-Blanc
- **URL**: `https://api.openweathermap.org/data/2.5/weather?lat=45.9237&lon=6.8694&appid={API_KEY}&units=metric`
- **Format**: JSON
- **Update**: Every 10 minutes
- **Requires**: API key (free tier available)

### 3. Snow-Forecast.com

**Chamonix Valley**: Multiple elevations available
- **URL**: `https://www.snow-forecast.com/resorts/Chamonix/6day/mid`
- **Format**: HTML scraping
- **Update**: Every 3 hours
- **Data**: Temperature, wind speed, wind direction

### 4. Aiguille du Midi Official

**COMPAGNIE DU MONT BLANC**: 
- **URL**: `https://www.compagniedumontblanc.fr/en/weather`
- **Format**: HTML/JSON (needs investigation)
- **Update**: Real-time
- **Data**: High-altitude conditions

### 5. Local Webcam/Weather Stations

**Chamonix-Meteo.com**: 
- **URL**: `http://www.chamonix-meteo.com/meteo_actuelle.php`
- **Format**: HTML
- **Update**: Every 5 minutes
- **Data**: Local weather station data

## Implementation Strategy

### Phase 1: Prototype (Starting Now)
1. Use OpenWeatherMap API for reliable data (free tier: 1000 calls/day)
2. Create 3 virtual stations with different coordinates:
   - `aiguilledumidi`: lat=45.8785, lon=6.8873 (high altitude)
   - `chamonix`: lat=45.9237, lon=6.8694 (town center)  
   - `leshouches`: lat=45.8933, lon=6.7967 (mid-elevation)

### Phase 2: Enhanced Sources
1. Add Infoclimat for more detailed French data
2. Integrate Snow-Forecast for alpine-specific conditions
3. Add local webcam data if available

## Technical Notes

- **Rate Limits**: OWM free tier = 60 calls/min, 1000/day
- **Caching**: 5-10 minute TTL appropriate for weather data
- **Unit Conversions**: km/h → m/s, °C direct, hPa direct
- **French Locale**: Handle comma decimal separators
- **Error Handling**: Fallback between sources if one fails

## Next Steps

1. Get OpenWeatherMap API key
2. Implement OWM-based parsers for all 3 stations
3. Test data quality and freshness
4. Integrate into existing Workers architecture
