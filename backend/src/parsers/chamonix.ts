import { WeatherData, ParseResult, FetchResult } from '../types/weather.js';
import { retryWithBackoff, formatTimestamp } from '../utils/helpers.js';

// OpenWeatherMap configuration for Chamonix-Mont-Blanc
const CHAMONIX_COORDS = { lat: 45.9237, lon: 6.8694 };
const OWM_BASE_URL = "https://api.openweathermap.org/data/2.5/weather";

// Headers for OpenWeatherMap API
const OWM_HEADERS = {
  'User-Agent': 'WeatherStation/1.0 (Weather Display System)',
  'Accept': 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
  'Connection': 'keep-alive'
};

// OpenWeatherMap Response Interface
interface OWMResponse {
  coord: { lon: number; lat: number; };
  weather: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
  main: {
    temp: number;          // Celsius (with units=metric)
    feels_like: number;    // Celsius
    temp_min: number;      // Celsius
    temp_max: number;      // Celsius
    pressure: number;      // hPa
    humidity: number;      // %
  };
  visibility: number;      // meters
  wind: {
    speed: number;         // m/s (with units=metric)
    deg: number;           // degrees
    gust?: number;         // m/s
  };
  clouds: { all: number; }; // % cloudiness
  dt: number;              // Unix timestamp
  sys: {
    country: string;
    sunrise: number;
    sunset: number;
  };
  name: string;
  cod: number;
}

/**
 * Fetch Chamonix weather data from OpenWeatherMap API
 */
export async function fetchChamonixWeather(apiKey?: string): Promise<FetchResult> {
  const startTime = Date.now();
  
  if (!apiKey) {
    throw new Error('OpenWeatherMap API key is required');
  }
  const url = `${OWM_BASE_URL}?lat=${CHAMONIX_COORDS.lat}&lon=${CHAMONIX_COORDS.lon}&appid=${apiKey}&units=metric`;
  
  const fetchAttempt = async (attempt: number): Promise<Response> => {
    console.log(`[INFO] Fetching Chamonix weather data (attempt ${attempt})...`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: OWM_HEADERS,
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('OpenWeatherMap API key invalid or missing');
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  };
  
  try {
    const response = await retryWithBackoff(fetchAttempt, 3, 2000);
    const jsonContent = await response.text();
    const fetchTime = Date.now() - startTime;
    
    console.log(`[DEBUG] Chamonix OWM response: ${jsonContent.length} bytes in ${fetchTime}ms`);
    
    // Basic validation
    if (jsonContent.length < 50) {
      throw new Error('Response too short, likely not valid weather data');
    }
    
    return {
      success: true,
      data: jsonContent,
      status: response.status,
      fetchTime,
      attempts: 1
    };
  } catch (error) {
    const fetchTime = Date.now() - startTime;
    console.error('[ERROR] Failed to fetch Chamonix data:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      fetchTime,
      attempts: 1
    };
  }
}

/**
 * Parse Chamonix OpenWeatherMap JSON data
 */
export function parseChamonixData(jsonContent: string): ParseResult {
  const parseStart = Date.now();
  console.log('[INFO] Parsing Chamonix weather data...');
  
  try {
    // Initialize weather data
    const data: WeatherData = {
      temperature: 0.0,
      humidity: 0.0,
      pressure: 0.0,
      windSpeed: 0.0,
      windGust: 0.0,
      windDirection: 0,
      visibility: 0.0,
      uvIndex: 0.0,
      precipitation: 0.0,
      conditions: '',
      timestamp: '',
      location: 'Chamonix-Mont-Blanc, France',
      isValid: false,
      parseTime: 0
    };
    
    // Parse JSON response
    const owmData: OWMResponse = JSON.parse(jsonContent);
    
    // Validate response structure
    if (!owmData.main || !owmData.wind || owmData.cod !== 200) {
      throw new Error(`Invalid OWM response structure or error code: ${owmData.cod}`);
    }
    
    // Extract temperature (already in Celsius)
    data.temperature = owmData.main.temp;
    console.log(`[DEBUG] Temperature: ${data.temperature}°C`);
    
    // Extract pressure (already in hPa)
    data.pressure = owmData.main.pressure;
    console.log(`[DEBUG] Pressure: ${data.pressure} hPa`);
    
    // Extract humidity
    data.humidity = owmData.main.humidity;
    console.log(`[DEBUG] Humidity: ${data.humidity}%`);
    
    // Extract wind data (already in m/s with units=metric)
    data.windSpeed = owmData.wind.speed;
    data.windDirection = owmData.wind.deg;
    
    // Handle wind gust (optional field)
    if (owmData.wind.gust !== undefined) {
      data.windGust = owmData.wind.gust;
    } else {
      data.windGust = data.windSpeed; // Use current speed as fallback
    }
    
    console.log(`[DEBUG] Wind: ${data.windSpeed.toFixed(1)} m/s @ ${data.windDirection}°`);
    console.log(`[DEBUG] Gust: ${data.windGust.toFixed(1)} m/s`);
    
    // Extract visibility (meters)
    data.visibility = owmData.visibility / 1000.0; // Convert to kilometers
    console.log(`[DEBUG] Visibility: ${data.visibility.toFixed(1)} km`);
    
    // Extract weather conditions
    if (owmData.weather && owmData.weather.length > 0) {
      data.conditions = `${owmData.weather[0].main}: ${owmData.weather[0].description}`;
      console.log(`[DEBUG] Conditions: ${data.conditions}`);
    }
    
    // Handle precipitation (if present)
    if ('rain' in owmData && owmData.rain && '1h' in owmData.rain) {
      data.precipitation = (owmData.rain as any)['1h'];
      console.log(`[DEBUG] Rain: ${data.precipitation} mm/h`);
    } else if ('snow' in owmData && owmData.snow && '1h' in owmData.snow) {
      data.precipitation = (owmData.snow as any)['1h'];
      console.log(`[DEBUG] Snow: ${data.precipitation} mm/h`);
    }
    
    // Convert timestamp
    data.timestamp = new Date(owmData.dt * 1000).toISOString();
    console.log(`[DEBUG] Timestamp: ${data.timestamp}`);
    
    // Update location with actual returned name
    if (owmData.name && owmData.name.length > 0) {
      data.location = `${owmData.name}, ${owmData.sys.country}`;
    }
    
    const parseTime = Date.now() - parseStart;
    data.parseTime = parseTime;
    
    // Validate that we got useful data
    data.isValid = (
      data.temperature > -50 && data.temperature < 60 && // Reasonable temperature range
      data.pressure > 500 && data.pressure < 1100 &&     // Reasonable pressure range
      data.windSpeed >= 0 && data.windSpeed < 100        // Reasonable wind speed
    );
    
    console.log(`[DEBUG] Chamonix parse completed in ${parseTime}ms, valid: ${data.isValid}`);
    
    return {
      success: true,
      data,
      parseTime
    };
    
  } catch (error) {
    const parseTime = Date.now() - parseStart;
    console.error('[ERROR] Chamonix parsing failed:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown parsing error',
      parseTime
    };
  }
}
