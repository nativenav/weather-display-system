import { WeatherData, ParseResult, FetchResult } from '../types/weather.js';
import { retryWithBackoff, formatTimestamp } from '../utils/helpers.js';
import * as cheerio from 'cheerio';

// Lymington weather data URL - assuming similar pattern to UK coastal stations
const LYMINGTON_URL = "https://www.lymingtonharbour.co.uk/weather-data/";

// Headers to mimic browser request
const LYMINGTON_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-GB,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate',
  'DNT': '1',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1'
};

/**
 * Fetch Lymington weather data from website
 */
export async function fetchLymingtonWeather(): Promise<FetchResult> {
  const startTime = Date.now();
  
  const fetchAttempt = async (attempt: number): Promise<Response> => {
    console.log(`[INFO] Fetching Lymington weather data (attempt ${attempt})...`);
    
    const response = await fetch(LYMINGTON_URL, {
      method: 'GET',
      headers: LYMINGTON_HEADERS,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  };
  
  try {
    const response = await retryWithBackoff(fetchAttempt, 3, 2000);
    const htmlContent = await response.text();
    const fetchTime = Date.now() - startTime;
    
    console.log(`[DEBUG] Lymington HTML fetched: ${htmlContent.length} bytes in ${fetchTime}ms`);
    
    // Basic validation
    if (htmlContent.length < 100) {
      throw new Error('Response too short, likely not weather data');
    }
    
    return {
      success: true,
      data: htmlContent,
      status: response.status,
      fetchTime,
      attempts: 1
    };
  } catch (error) {
    const fetchTime = Date.now() - startTime;
    console.error('[ERROR] Failed to fetch Lymington data:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      fetchTime,
      attempts: 1
    };
  }
}

/**
 * Parse Lymington HTML weather data
 */
export function parseLymingtonData(htmlContent: string): ParseResult {
  const parseStart = Date.now();
  console.log('[INFO] Parsing Lymington weather data...');
  
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
      location: 'Lymington, Hampshire',
      isValid: false,
      parseTime: 0
    };
    
    const $ = cheerio.load(htmlContent);
    
    // Look for weather data in various potential formats
    // This is a generic parser - may need adjustment based on actual Lymington site structure
    
    // Try to extract wind data
    const windSpeedText = extractTextValue($, [
      'td:contains("Wind Speed")', 
      '.wind-speed', 
      '#windspeed',
      '[data-field="windspeed"]'
    ]);
    
    const windGustText = extractTextValue($, [
      'td:contains("Wind Gust")', 
      '.wind-gust', 
      '#windgust',
      '[data-field="windgust"]'
    ]);
    
    const windDirText = extractTextValue($, [
      'td:contains("Wind Direction")', 
      '.wind-direction', 
      '#winddirection',
      '[data-field="winddir"]'
    ]);
    
    // Try to extract environmental data
    const temperatureText = extractTextValue($, [
      'td:contains("Temperature")', 
      '.temperature', 
      '#temperature',
      '[data-field="temp"]'
    ]);
    
    const pressureText = extractTextValue($, [
      'td:contains("Pressure")', 
      '.pressure', 
      '#pressure',
      '[data-field="pressure"]'
    ]);
    
    const humidityText = extractTextValue($, [
      'td:contains("Humidity")', 
      '.humidity', 
      '#humidity',
      '[data-field="humidity"]'
    ]);
    
    // Parse wind speed (expecting knots, mph, or m/s)
    if (windSpeedText) {
      const speed = parseWeatherValue(windSpeedText);
      if (speed > 0) {
        // Convert to m/s if needed (assuming knots by default for marine stations)
        data.windSpeed = speed * 0.514444; // knots to m/s conversion
        console.log(`[DEBUG] Parsed wind speed: ${speed} kt -> ${data.windSpeed.toFixed(2)} m/s`);
      }
    }
    
    // Parse wind gust
    if (windGustText) {
      const gust = parseWeatherValue(windGustText);
      if (gust > 0) {
        data.windGust = gust * 0.514444; // knots to m/s conversion
        console.log(`[DEBUG] Parsed wind gust: ${gust} kt -> ${data.windGust.toFixed(2)} m/s`);
      }
    }
    
    // Parse wind direction
    if (windDirText) {
      const direction = parseWindDirection(windDirText);
      if (direction >= 0 && direction < 360) {
        data.windDirection = direction;
        console.log(`[DEBUG] Parsed wind direction: ${direction}°`);
      }
    }
    
    // Parse temperature
    if (temperatureText) {
      const temp = parseWeatherValue(temperatureText);
      if (temp > -50 && temp < 60) { // Reasonable range for UK
        data.temperature = temp;
        console.log(`[DEBUG] Parsed temperature: ${temp}°C`);
      }
    }
    
    // Parse pressure
    if (pressureText) {
      const pressure = parseWeatherValue(pressureText);
      if (pressure > 900 && pressure < 1100) { // Reasonable pressure range
        data.pressure = pressure;
        console.log(`[DEBUG] Parsed pressure: ${pressure} hPa`);
      }
    }
    
    // Parse humidity
    if (humidityText) {
      const humidity = parseWeatherValue(humidityText);
      if (humidity >= 0 && humidity <= 100) {
        data.humidity = humidity;
        console.log(`[DEBUG] Parsed humidity: ${humidity}%`);
      }
    }
    
    // Try to extract timestamp
    const timestampText = extractTextValue($, [
      'td:contains("Updated")', 
      '.timestamp', 
      '#updated',
      '[data-field="timestamp"]',
      'time'
    ]);
    
    if (timestampText) {
      data.timestamp = timestampText;
    } else {
      data.timestamp = new Date().toISOString();
    }
    
    const parseTime = Date.now() - parseStart;
    data.parseTime = parseTime;
    
    // Validate that we got some useful data
    data.isValid = (data.windSpeed > 0 || data.temperature > -50 || data.pressure > 0);
    
    console.log(`[DEBUG] Lymington parse completed in ${parseTime}ms, valid: ${data.isValid}`);
    
    if (!data.isValid) {
      console.warn('[WARNING] No valid weather data found in Lymington HTML');
      console.log('[DEBUG] HTML content preview:', htmlContent.substring(0, 500));
    }
    
    return {
      success: true,
      data,
      parseTime
    };
    
  } catch (error) {
    const parseTime = Date.now() - parseStart;
    console.error('[ERROR] Lymington parsing failed:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown parsing error',
      parseTime
    };
  }
}

/**
 * Extract text value from multiple potential selectors
 */
function extractTextValue($: cheerio.CheerioAPI, selectors: string[]): string | null {
  for (const selector of selectors) {
    const element = $(selector);
    if (element.length > 0) {
      const text = element.first().text().trim();
      if (text && text.length > 0) {
        console.log(`[DEBUG] Found value "${text}" with selector "${selector}"`);
        return text;
      }
    }
  }
  return null;
}

/**
 * Parse numeric weather value from text (handles various units)
 */
function parseWeatherValue(text: string): number {
  // Remove common units and extract number
  const cleanText = text
    .replace(/[°C°F°]/g, '')
    .replace(/\s*(kt|knots?|mph|m\/s|hPa|mb|%)\s*/gi, '')
    .replace(/[^\d.-]/g, '');
  
  const value = parseFloat(cleanText);
  return isNaN(value) ? 0 : value;
}

/**
 * Parse wind direction from text (handles compass directions and degrees)
 */
function parseWindDirection(text: string): number {
  // First try to extract numeric degrees
  const degreeMatch = text.match(/(\d+)°?/);
  if (degreeMatch) {
    const degrees = parseInt(degreeMatch[1]);
    if (degrees >= 0 && degrees < 360) {
      return degrees;
    }
  }
  
  // Handle compass directions
  const direction = text.toUpperCase().trim();
  const compassMap: { [key: string]: number } = {
    'N': 0, 'NORTH': 0,
    'NNE': 22, 'NORTH-NORTHEAST': 22,
    'NE': 45, 'NORTHEAST': 45,
    'ENE': 67, 'EAST-NORTHEAST': 67,
    'E': 90, 'EAST': 90,
    'ESE': 112, 'EAST-SOUTHEAST': 112,
    'SE': 135, 'SOUTHEAST': 135,
    'SSE': 157, 'SOUTH-SOUTHEAST': 157,
    'S': 180, 'SOUTH': 180,
    'SSW': 202, 'SOUTH-SOUTHWEST': 202,
    'SW': 225, 'SOUTHWEST': 225,
    'WSW': 247, 'WEST-SOUTHWEST': 247,
    'W': 270, 'WEST': 270,
    'WNW': 292, 'WEST-NORTHWEST': 292,
    'NW': 315, 'NORTHWEST': 315,
    'NNW': 337, 'NORTH-NORTHWEST': 337
  };
  
  return compassMap[direction] ?? 0;
}
