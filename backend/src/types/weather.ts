// Weather data types based on the original C++ WeatherData structure
export interface WeatherData {
  temperature: number;      // Temperature in Celsius
  humidity: number;         // Relative humidity percentage  
  pressure: number;         // Atmospheric pressure in hPa
  windSpeed: number;        // Wind speed in m/s
  windGust: number;         // Wind gust speed in m/s
  windDirection: number;    // Wind direction in degrees (0-359)
  visibility: number;       // Visibility in kilometers
  uvIndex: number;          // UV index
  precipitation: number;    // Precipitation in mm
  conditions: string;       // Weather conditions description
  timestamp: string;        // ISO 8601 timestamp
  location: string;         // Location name or coordinates
  isValid: boolean;         // Data validity flag
  parseTime: number;        // Time taken to parse in milliseconds
}

// Standardized API response format (matches our JSON schema v1)
export interface WeatherResponse {
  schema: "weather.v1";
  stationId: string;
  timestamp: string;
  data: {
    wind: {
      avg: number;
      gust?: number;
      direction: number;
      unit: "mps" | "kts";
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
  data?: string;
  status?: number;
  error?: string;
  fetchTime: number;
  attempts: number;
}

// Environment bindings for Cloudflare Workers
export interface Env {
  WEATHER_CACHE: KVNamespace;
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
