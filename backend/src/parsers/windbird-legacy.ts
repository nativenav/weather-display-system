import { WeatherData as LegacyWeatherData, FetchResult, ParseResult } from '../types/weather.js';
import { fetchWindbird1702Data, fetchWindbird1724Data } from '../fetchers/windbird.js';
import { parseWindbird1702, parseWindbird1724 } from './windbird.js';

/**
 * Convert new format to legacy WeatherData structure
 */
function convertToLegacyFormat(parsedData: any, parseStartTime: number): LegacyWeatherData {
  return {
    temperature: parsedData.temperature || -999, // Use -999 for missing data
    humidity: -1, // Windbird doesn't provide humidity
    pressure: parsedData.pressure || 0,
    windSpeed: (parsedData.wind_speed || 0) / 3.6, // Convert km/h to m/s for legacy format
    windGust: (parsedData.wind_gust || 0) / 3.6, // Convert km/h to m/s for legacy format
    windDirection: parsedData.wind_direction || 0,
    visibility: -1, // Not provided by Windbird
    uvIndex: -1, // Not provided by Windbird
    precipitation: -1, // Not provided by Windbird
    conditions: parsedData.weather_description || 'Wind data',
    timestamp: parsedData.timestamp,
    location: `${parsedData.station_name} (${parsedData.location.altitude}m)`,
    isValid: true,
    parseTime: Date.now() - parseStartTime
  };
}

// === Tête de Balme (Station 1702) ===

/**
 * Fetch Windbird station 1702 (Tête de Balme) data in legacy format
 */
export async function fetchTeteDeBalmeWeather(): Promise<FetchResult> {
  const startTime = Date.now();
  let attempts = 1;
  
  try {
    console.log('[INFO] Fetching Windbird Tête de Balme station data...');
    
    const rawData = await fetchWindbird1702Data();
    const fetchTime = Date.now() - startTime;
    
    return {
      success: true,
      data: JSON.stringify(rawData),
      status: 200,
      fetchTime,
      attempts
    };
    
  } catch (error) {
    const fetchTime = Date.now() - startTime;
    console.error('[ERROR] Windbird Tête de Balme fetch failed:', error);
    
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : 'Unknown error',
      fetchTime,
      attempts
    };
  }
}

/**
 * Parse Windbird station 1702 (Tête de Balme) data in legacy format
 */
export function parseTeteDeBalmeData(rawDataString: string): ParseResult {
  const startTime = Date.now();
  
  try {
    console.log('[INFO] Parsing Windbird Tête de Balme data...');
    
    const rawData = JSON.parse(rawDataString);
    const parsedData = parseWindbird1702(rawData);
    const legacyData = convertToLegacyFormat(parsedData, startTime);
    
    console.log(`[INFO] Successfully parsed Windbird Tête de Balme data in ${legacyData.parseTime}ms`);
    
    return {
      success: true,
      data: legacyData,
      parseTime: legacyData.parseTime
    };
    
  } catch (error) {
    const totalParseTime = Date.now() - startTime;
    console.error('[ERROR] Windbird Tête de Balme parsing failed:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown parsing error',
      parseTime: totalParseTime
    };
  }
}

// === Planpraz (Station 1724) ===

/**
 * Fetch Windbird station 1724 (Planpraz) data in legacy format
 */
export async function fetchPlanprazWeather(): Promise<FetchResult> {
  const startTime = Date.now();
  let attempts = 1;
  
  try {
    console.log('[INFO] Fetching Windbird Planpraz station data...');
    
    const rawData = await fetchWindbird1724Data();
    const fetchTime = Date.now() - startTime;
    
    return {
      success: true,
      data: JSON.stringify(rawData),
      status: 200,
      fetchTime,
      attempts
    };
    
  } catch (error) {
    const fetchTime = Date.now() - startTime;
    console.error('[ERROR] Windbird Planpraz fetch failed:', error);
    
    return {
      success: false,
      status: 500,
      error: error instanceof Error ? error.message : 'Unknown error',
      fetchTime,
      attempts
    };
  }
}

/**
 * Parse Windbird station 1724 (Planpraz) data in legacy format
 */
export function parsePlanprazData(rawDataString: string): ParseResult {
  const startTime = Date.now();
  
  try {
    console.log('[INFO] Parsing Windbird Planpraz data...');
    
    const rawData = JSON.parse(rawDataString);
    const parsedData = parseWindbird1724(rawData);
    const legacyData = convertToLegacyFormat(parsedData, startTime);
    
    console.log(`[INFO] Successfully parsed Windbird Planpraz data in ${legacyData.parseTime}ms`);
    
    return {
      success: true,
      data: legacyData,
      parseTime: legacyData.parseTime
    };
    
  } catch (error) {
    const totalParseTime = Date.now() - startTime;
    console.error('[ERROR] Windbird Planpraz parsing failed:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown parsing error',
      parseTime: totalParseTime
    };
  }
}
