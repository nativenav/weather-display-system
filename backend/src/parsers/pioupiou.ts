import { WeatherData, ParseResult } from '../types/weather.js';

interface PioupiouLocation {
  latitude: number;
  longitude: number;
  date: string;
  success: boolean;
  hdop: number;
}

interface PioupiouMeasurements {
  date: string;
  pressure?: number | null;
  wind_heading: number;
  wind_speed_avg: number;
  wind_speed_max: number;
  wind_speed_min: number;
}

interface PioupiouStatus {
  date: string;
  snr: number;
  state: string;
}

interface PioupiouMeta {
  name: string;
  description?: string;
  picture?: string | null;
  date: string;
  rating: {
    upvotes: number;
    downvotes: number;
  };
}

interface PioupiouData {
  id: number;
  meta: PioupiouMeta;
  location: PioupiouLocation;
  measurements: PioupiouMeasurements;
  status: PioupiouStatus;
}

interface PioupiouResponse {
  doc: string;
  license: string;
  attribution: string;
  data: PioupiouData;
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
 * Parse Pioupiou API response for station 521 (Prarion, Les Houches)
 */
export function parsePioupiou521(response: PioupiouResponse): ParseResult {
  const parseStart = Date.now();
  console.log('[INFO] Parsing Pioupiou 521 weather data...');
  
  try {
    const { data } = response;
    const { measurements, location, meta, status } = data;

    // Basic validation
    if (!measurements || !location || measurements.wind_speed_avg == null) {
      throw new Error('Invalid Pioupiou data: missing required measurements');
    }

    // Ensure we're getting data from the expected station
    if (data.id !== 521) {
      throw new Error(`Unexpected station ID: ${data.id}, expected 521`);
    }

    // Initialize weather data (all null for missing data)
    const weatherData: WeatherData = {
      temperature: null, // Pioupiou stations only measure wind
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
      location: meta.name || `Pioupiou ${data.id}`,
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
    weatherData.conditions = `Wind ${directionText} ${windSpeedText} m/s (Altitude: 1865m)`;
    
    // Calculate parse time and validity
    const parseTime = Date.now() - parseStart;
    weatherData.parseTime = parseTime;
    weatherData.isValid = ((weatherData.windSpeed !== null && weatherData.windSpeed >= 0) && 
                           (weatherData.windDirection !== null && weatherData.windDirection >= 0));
    
    console.log(`[DEBUG] Pioupiou 521 parse completed in ${parseTime}ms, valid: ${weatherData.isValid}`);
    
    if (!weatherData.isValid) {
      console.warn('[WARNING] No valid wind data found in Pioupiou 521 response');
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
    console.error('[ERROR] Pioupiou 521 parsing failed:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown parsing error',
      parseTime
    };
  }
}
