import { WeatherData, validateWeatherData } from '../types';

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
 * Parse Pioupiou API response for station 521 (Prarion, Les Houches)
 */
export function parsePioupiou521(response: PioupiouResponse): WeatherData {
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

  // Parse timestamp
  const timestamp = new Date(measurements.date);
  
  // Create raw weather data object (will be validated and sanitized)
  const rawData: Partial<WeatherData> = {
    station_id: `pioupiou-${data.id}`,
    station_name: meta.name || `Pioupiou ${data.id}`,
    location: {
      latitude: location.latitude,
      longitude: location.longitude,
      altitude: 1865 // From station name "Prarion 1865m"
    },
    timestamp: timestamp.toISOString(),
    temperature: null, // Pioupiou stations only measure wind
    humidity: null,
    pressure: measurements.pressure, // Will be validated (null if invalid)
    wind_speed: measurements.wind_speed_avg, // km/h, will be validated
    wind_gust: measurements.wind_speed_max, // km/h, will be validated
    wind_direction: measurements.wind_heading, // Will be validated and normalized
    precipitation: null, // Not provided by Pioupiou
    data_source: 'pioupiou',
    raw_data: {
      station_status: status.state,
      signal_strength: status.snr,
      wind_speed_min_kmh: measurements.wind_speed_min,
      wind_speed_avg_kmh: measurements.wind_speed_avg,
      wind_speed_max_kmh: measurements.wind_speed_max,
      location_accuracy: location.hdop,
      location_success: location.success,
      last_location_update: location.date,
      station_description: meta.description
    }
  };
  
  // Use upstream validation to ensure consistent data handling
  return validateWeatherData(rawData);
}
