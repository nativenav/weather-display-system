// Weather data types based on the original C++ WeatherData structure
export interface WeatherData {
  temperature: number | null;      // Temperature in Celsius (null = no data)
  humidity: number | null;         // Relative humidity percentage (null = no data)
  pressure: number | null;         // Atmospheric pressure in hPa (null = no data)
  windSpeed: number | null;        // Wind speed in m/s (null = no data)
  windGust: number | null;         // Wind gust speed in m/s (null = no data)
  windDirection: number | null;    // Wind direction in degrees 0-359 (null = no data)
  visibility: number | null;       // Visibility in kilometers (null = no data)
  uvIndex: number | null;          // UV index (null = no data)
  precipitation: number | null;    // Precipitation in mm (null = no data)
  conditions: string;              // Weather conditions description
  timestamp: string;               // ISO 8601 timestamp
  location: string;                // Location name or coordinates
  isValid: boolean;                // Data validity flag
  parseTime: number;               // Time taken to parse in milliseconds
}

// Standardized API response format (matches our JSON schema v1)
// All JSON endpoints return data in m/s ("mps" unit)
export interface WeatherResponse {
  schema: "weather.v1";
  stationId: string;
  timestamp: string;
  data: {
    wind: {
      avg: number;
      gust?: number;  // Omitted if null/unavailable
      direction: number | null;  // Null if no direction data
      unit: "mps";  // Always "mps" for JSON endpoints
    };
    temperature?: {
      air: number;
      unit: "celsius";
    };
    pressure?: {
      value: number;
      unit: "hPa";
    };
  };
  display?: {
    formatted: string[];
  };
  ttl: number;
}

// Multi-station region response for ESP32C3 display
export interface RegionWeatherResponse {
  schema: "weather-region.v1";
  regionId: string;
  regionName: string;
  timestamp: string;
  stations: WeatherResponse[];
  ttl: number;
}

// Station configuration
export interface StationConfig {
  id: string;
  name: string;
  url: string;
  parser: "brambles" | "seaview" | "lymington";
  refreshInterval: number; // minutes
  headers?: Record<string, string>;
  method?: "GET" | "POST";
  body?: string;
}

// Parser result
export interface ParseResult {
  success: boolean;
  data?: WeatherData;
  error?: string;
  parseTime: number;
}

// HTTP fetch result with retry info
export interface FetchResult {
  success: boolean;
  data?: any; // Can be string, object, or other types depending on API
  status?: number;
  error?: string;
  fetchTime: number;
  attempts: number;
}

// Forecast data types for Meteoblue integration
export interface ForecastHour {
  timestamp: string;      // ISO 8601 timestamp
  temperature: number;    // Temperature in Celsius
  weatherCode: number;    // Meteoblue weather code
}

export interface ForecastData {
  regionId: string;
  location: string;
  hours: ForecastHour[];  // Up to 10 hours (current + next 9)
  generated: string;      // ISO timestamp when forecast was generated
  provider: 'meteoblue';
}

export interface ForecastResponse {
  schema: "forecast-region.v1";
  regionId: string;
  location: string;
  forecast: ForecastHour[];
  generated: string;
  ttl: number;
}

// Environment bindings for Cloudflare Workers
export interface Env {
  WEATHER_CACHE: KVNamespace;
  METEOBLUE_API_KEY?: string;  // Optional Meteoblue API key
  ENVIRONMENT: string;
}

// Utility type for hex data parsing (Seaview station)
export interface HexDataSample {
  timestamp: number;
  windSpeed: number; // in knots
  windDirection: number; // in degrees
}

export interface WindStats {
  avgSpeed: number;
  peakSpeed: number;
}

// Station-specific types
export interface BramblesData {
  windSpeed: number;    // knots
  windGust: number;     // knots  
  windDirection: number; // degrees
  temperature: number;   // celsius
  pressure: number;      // mBar
  timestamp: string;
}
