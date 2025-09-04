import { WeatherData, ParseResult } from '../types/weather.js';

interface WindbirdLocation {
  latitude: number;
  longitude: number;
  date: string;
  success: boolean;
  hdop: number;
}

interface WindbirdMeasurements {
  date: string;
  pressure?: number | null;
  wind_heading: number;
  wind_speed_avg: number;
  wind_speed_max: number;
  wind_speed_min: number;
}

interface WindbirdStatus {
  date: string;
  snr: number;
  state: string;
}

interface WindbirdMeta {
  name: string;
  description?: string;
  picture?: string | null;
  date: string;
  rating: {
    upvotes: number;
    downvotes: number;
  };
}

interface WindbirdData {
  id: number;
  meta: WindbirdMeta;
  location: WindbirdLocation;
  measurements: WindbirdMeasurements;
  status: WindbirdStatus;
}

interface WindbirdResponse {
  doc: string;
  license: string;
  attribution: string;
  data: WindbirdData;
}

/**
 * Convert wind direction from degrees to cardinal direction
 */
function degreesToCardinal(degrees: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 
                     'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

/**
 * Convert km/h to m/s
 */
function kmhToMeterPerSecond(kmh: number): number {
  return kmh / 3.6;
}

/**
 * Extract altitude from station name (fallback if not found)
 */
function extractAltitudeFromName(name: string): number {
  const match = name.match(/(\d+)m/);
  return match ? parseInt(match[1]) : 0;
}

/**
 * Parse generic Windbird API response 
 */
function parseWindbird(response: WindbirdResponse, expectedId: number, fallbackAltitude?: number, stationName?: string): ParseResult {
  const parseStart = Date.now();
  console.log(`[INFO] Parsing Windbird ${expectedId} weather data...`);
  
  try {
    const { data } = response;
    const { measurements, location, meta, status } = data;

    // Basic validation
    if (!measurements || !location || measurements.wind_speed_avg == null) {
      throw new Error('Invalid Windbird data: missing required measurements');
    }

    // Ensure we're getting data from the expected station
    if (data.id !== expectedId) {
      throw new Error(`Unexpected station ID: ${data.id}, expected ${expectedId}`);
    }

    // Extract altitude from name or use fallback
    const altitude = extractAltitudeFromName(meta.name) || fallbackAltitude || 0;

    // Initialize weather data (all null for missing data)
    const weatherData: WeatherData = {
      temperature: null, // Windbird stations only measure wind
      humidity: null,
      pressure: null,
      windSpeed: null,
      windGust: null,
      windDirection: null,
      visibility: null,
      uvIndex: null,
      precipitation: null,
      conditions: '',
      timestamp: '',
      location: stationName || meta.name || `Windbird ${data.id}`,
      isValid: false,
      parseTime: 0
    };

    // Parse timestamp
    weatherData.timestamp = new Date(measurements.date).toISOString();

    // Extract wind data (API provides in km/h, convert to m/s)
    if (typeof measurements.wind_speed_avg === 'number' && measurements.wind_speed_avg >= 0) {
      weatherData.windSpeed = kmhToMeterPerSecond(measurements.wind_speed_avg);
      console.log(`[DEBUG] Average wind speed: ${measurements.wind_speed_avg} km/h = ${weatherData.windSpeed.toFixed(1)} m/s`);
    }
    
    if (typeof measurements.wind_speed_max === 'number' && measurements.wind_speed_max >= 0) {
      weatherData.windGust = kmhToMeterPerSecond(measurements.wind_speed_max);
      console.log(`[DEBUG] Gust wind speed: ${measurements.wind_speed_max} km/h = ${weatherData.windGust.toFixed(1)} m/s`);
    }
    
    if (typeof measurements.wind_heading === 'number' && measurements.wind_heading >= 0 && measurements.wind_heading < 360) {
      weatherData.windDirection = Math.round(measurements.wind_heading);
      console.log(`[DEBUG] Wind direction: ${weatherData.windDirection}°`);
    }
    
    // Handle pressure if available
    if (typeof measurements.pressure === 'number' && measurements.pressure >= 800 && measurements.pressure <= 1200) {
      weatherData.pressure = measurements.pressure;
      console.log(`[DEBUG] Pressure: ${weatherData.pressure} hPa`);
    }
    
    // Set conditions with location info
    const directionText = weatherData.windDirection !== null ? degreesToCardinal(weatherData.windDirection) : 'N/A';
    const windSpeedText = weatherData.windSpeed !== null ? weatherData.windSpeed.toFixed(1) : '0.0';
    weatherData.conditions = `Wind ${directionText} ${windSpeedText} m/s (Altitude: ${altitude}m)`;
    
    // Calculate parse time and validity
    const parseTime = Date.now() - parseStart;
    weatherData.parseTime = parseTime;
    weatherData.isValid = ((weatherData.windSpeed !== null && weatherData.windSpeed >= 0) && 
                           (weatherData.windDirection !== null && weatherData.windDirection >= 0));
    
    console.log(`[DEBUG] Windbird ${expectedId} parse completed in ${parseTime}ms, valid: ${weatherData.isValid}`);
    
    if (!weatherData.isValid) {
      console.warn(`[WARNING] No valid wind data found in Windbird ${expectedId} response`);
    } else {
      const gustStr = weatherData.windGust !== null ? `${weatherData.windGust.toFixed(1)} m/s` : 'n/a';
      console.log(`[SUCCESS] Parsed wind: ${weatherData.windSpeed!.toFixed(1)} m/s, gust: ${gustStr}, dir: ${weatherData.windDirection}°`);
    }
    
    return {
      success: true,
      data: weatherData,
      parseTime
    };
    
  } catch (error) {
    const parseTime = Date.now() - parseStart;
    console.error(`[ERROR] Windbird ${expectedId} parsing failed:`, error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown parsing error',
      parseTime
    };
  }
}

/**
 * Parse Windbird station 1702 (Tête de Balme)
 */
export function parseWindbird1702(response: WindbirdResponse): ParseResult {
  return parseWindbird(response, 1702, 2204, 'Tête de Balme'); // Fallback altitude for Tête de Balme
}

/**
 * Parse Windbird station 1724 (Planpraz)
 */
export function parseWindbird1724(response: WindbirdResponse): ParseResult {
  return parseWindbird(response, 1724, 1958, 'Planpraz'); // Fallback altitude for Planpraz
}
