// Standardized weather data types for all parsers
// This ensures consistent data validation and null handling across all parsers

export interface WeatherData {
  station_id: string;
  station_name: string;
  location: {
    latitude: number;
    longitude: number;
    altitude?: number;
  };
  timestamp: string; // ISO 8601 format
  
  // Core weather measurements - null indicates missing/unavailable data
  temperature: number | null; // Celsius, null if not available
  humidity: number | null;    // Relative humidity %, null if not available
  pressure: number | null;    // hPa/mBar, null if not available
  
  // Wind measurements - never null, 0 indicates calm conditions
  wind_speed: number;         // Regional units (km/h, knots, m/s)
  wind_gust: number | null;   // Regional units, null if not available
  wind_direction: number;     // Degrees 0-359, 0 indicates North
  wind_direction_text: string; // Cardinal direction (N, NE, etc.)
  
  // Optional measurements
  precipitation: number | null; // mm, null if not available
  weather_description: string;  // Human-readable description
  
  // Metadata
  data_source: string;         // Parser identifier
  raw_data?: any;             // Original API response for debugging
}

/**
 * Validates and sanitizes raw weather data to ensure consistency
 * This function should be used by all parsers to standardize data
 */
export function validateWeatherData(rawData: Partial<WeatherData>): WeatherData {
  // Required fields with defaults
  const station_id = rawData.station_id || 'unknown';
  const station_name = rawData.station_name || 'Unknown Station';
  const timestamp = rawData.timestamp || new Date().toISOString();
  const data_source = rawData.data_source || 'unknown';
  
  // Location with validation
  const location = {
    latitude: isValidNumber(rawData.location?.latitude) ? rawData.location!.latitude : 0,
    longitude: isValidNumber(rawData.location?.longitude) ? rawData.location!.longitude : 0,
    altitude: isValidNumber(rawData.location?.altitude) ? rawData.location!.altitude : undefined
  };
  
  // Core measurements - use null for truly missing data
  const temperature = sanitizeTemperature(rawData.temperature);
  const humidity = sanitizePercentage(rawData.humidity);
  const pressure = sanitizePressure(rawData.pressure);
  
  // Wind measurements - wind_speed is required, others can be null
  const wind_speed = sanitizeWindSpeed(rawData.wind_speed);
  const wind_gust = sanitizeWindSpeed(rawData.wind_gust, true); // Allow null
  const wind_direction = sanitizeWindDirection(rawData.wind_direction);
  const wind_direction_text = rawData.wind_direction_text || degreesToCardinal(wind_direction);
  
  // Optional measurements
  const precipitation = sanitizePositiveValue(rawData.precipitation);
  const weather_description = rawData.weather_description || `Wind ${wind_direction_text} ${wind_speed.toFixed(1)}`;
  
  return {
    station_id,
    station_name,
    location,
    timestamp,
    temperature,
    humidity,
    pressure,
    wind_speed,
    wind_gust,
    wind_direction,
    wind_direction_text,
    precipitation,
    weather_description,
    data_source,
    raw_data: rawData.raw_data
  };
}

/**
 * Validation helper functions
 */

function isValidNumber(value: any): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

function sanitizeTemperature(temp: any): number | null {
  if (!isValidNumber(temp)) return null;
  // Accept any reasonable temperature range (-60°C to +60°C)
  if (temp < -60 || temp > 60) return null;
  return Math.round(temp * 10) / 10; // Round to 1 decimal
}

function sanitizePercentage(value: any): number | null {
  if (!isValidNumber(value)) return null;
  if (value < 0 || value > 100) return null;
  return Math.round(value * 10) / 10;
}

function sanitizePressure(pressure: any): number | null {
  if (!isValidNumber(pressure)) return null;
  // Accept reasonable atmospheric pressure range (800-1200 hPa)
  if (pressure < 800 || pressure > 1200) return null;
  return Math.round(pressure * 10) / 10;
}

function sanitizeWindSpeed(speed: any, allowNull: boolean = false): number | null {
  if (!isValidNumber(speed)) {
    return allowNull ? null : 0;
  }
  if (speed < 0) return allowNull ? null : 0;
  if (speed > 200) return allowNull ? null : 200; // Cap at 200 (units vary by region)
  return Math.round(speed * 10) / 10;
}

function sanitizeWindDirection(direction: any): number {
  if (!isValidNumber(direction)) return 0;
  // Normalize to 0-359 degrees
  let normalized = direction % 360;
  if (normalized < 0) normalized += 360;
  return Math.round(normalized);
}

function sanitizePositiveValue(value: any): number | null {
  if (!isValidNumber(value)) return null;
  if (value < 0) return null;
  return Math.round(value * 100) / 100; // Round to 2 decimals
}

/**
 * Convert wind direction degrees to cardinal direction
 */
function degreesToCardinal(degrees: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 
                     'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

/**
 * Check if weather data is valid for display
 * Data is considered valid if it has at least wind information
 */
export function isWeatherDataValid(data: WeatherData): boolean {
  // Must have basic station info and at least some wind data
  return !!(
    data.station_id && 
    data.timestamp && 
    (data.wind_speed > 0 || data.wind_direction >= 0)
  );
}
