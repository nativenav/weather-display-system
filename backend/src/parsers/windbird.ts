import { WeatherData } from '../types';

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
 * Extract altitude from station name (fallback if not found)
 */
function extractAltitudeFromName(name: string): number {
  const match = name.match(/(\d+)m/);
  return match ? parseInt(match[1]) : 0;
}

/**
 * Parse generic Windbird API response 
 */
export function parseWindbird(response: WindbirdResponse, expectedId: number, fallbackAltitude?: number): WeatherData {
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

  // Convert wind speed from m/s to km/h (Windbird API returns m/s like Pioupiou)
  const windSpeedKmh = measurements.wind_speed_avg * 3.6;
  const windGustKmh = measurements.wind_speed_max * 3.6;
  
  // Extract altitude from name or use fallback
  const altitude = extractAltitudeFromName(meta.name) || fallbackAltitude || 0;
  
  // Parse timestamp
  const timestamp = new Date(measurements.date);
  
  return {
    station_id: `windbird-${data.id}`,
    station_name: meta.name || `Windbird ${data.id}`,
    location: {
      latitude: location.latitude,
      longitude: location.longitude,
      altitude: altitude
    },
    timestamp: timestamp.toISOString(),
    temperature: null, // Windbird stations only measure wind
    humidity: null,
    pressure: measurements.pressure,
    wind_speed: Math.round(windSpeedKmh * 10) / 10, // Round to 1 decimal
    wind_gust: Math.round(windGustKmh * 10) / 10,
    wind_direction: measurements.wind_heading,
    wind_direction_text: degreesToCardinal(measurements.wind_heading),
    precipitation: null, // Not provided by Windbird
    weather_description: `Wind ${degreesToCardinal(measurements.wind_heading)} ${Math.round(windSpeedKmh)} km/h`,
    data_source: 'windbird',
    raw_data: {
      station_status: status.state,
      signal_strength: status.snr,
      wind_speed_min_ms: measurements.wind_speed_min,
      wind_speed_avg_ms: measurements.wind_speed_avg,
      wind_speed_max_ms: measurements.wind_speed_max,
      location_accuracy: location.hdop,
      location_success: location.success,
      last_location_update: location.date,
      station_description: meta.description
    }
  };
}

/**
 * Parse Windbird station 1702 (Tête de Balme)
 */
export function parseWindbird1702(response: WindbirdResponse): WeatherData {
  return parseWindbird(response, 1702, 2204); // Fallback altitude for Tête de Balme
}

/**
 * Parse Windbird station 1724 (Planpraz)
 */
export function parseWindbird1724(response: WindbirdResponse): WeatherData {
  return parseWindbird(response, 1724, 1958); // Fallback altitude for Planpraz (from description)
}
