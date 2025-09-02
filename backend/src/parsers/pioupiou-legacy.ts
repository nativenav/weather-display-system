import { WeatherData as LegacyWeatherData, FetchResult, ParseResult } from '../types/weather.js';
import { fetchPioupiou521Data } from '../fetchers/pioupiou.js';
import { parsePioupiou521 } from './pioupiou.js';

/**
 * Fetch Pioupiou station 521 data in legacy format
 * This function adapts the new API to the existing system structure
 */
export async function fetchPrarionWeather(): Promise<FetchResult> {
  const startTime = Date.now();
  let attempts = 1;
  
  try {
    console.log('[INFO] Fetching Pioupiou Prarion station data...');
    
    const rawData = await fetchPioupiou521Data();
    const fetchTime = Date.now() - startTime;
    
    return {
      success: true,
      data: JSON.stringify(rawData), // Convert to string as expected by legacy system
      status: 200,
      fetchTime,
      attempts
    };
    
  } catch (error) {
    const fetchTime = Date.now() - startTime;
    console.error('[ERROR] Pioupiou fetch failed:', error);
    
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
 * Parse Pioupiou station 521 data in legacy format
 * Converts new format to legacy WeatherData structure
 */
export function parsePrarionData(rawDataString: string): ParseResult {
  const startTime = Date.now();
  
  try {
    console.log('[INFO] Parsing Pioupiou Prarion data...');
    
    // Parse the JSON string back to object
    const rawData = JSON.parse(rawDataString);
    
    // Use our new parser to get structured data
    const parsedData = parsePioupiou521(rawData);
    
    // Convert to legacy WeatherData format
    const legacyData: LegacyWeatherData = {
      temperature: parsedData.temperature || -999, // Use -999 for missing data
      humidity: -1, // Pioupiou doesn't provide humidity
      pressure: parsedData.pressure || 0,
      windSpeed: (parsedData.wind_speed || 0) / 3.6, // Convert km/h to m/s for legacy format
      windGust: (parsedData.wind_gust || 0) / 3.6, // Convert km/h to m/s for legacy format
      windDirection: parsedData.wind_direction || 0,
      visibility: -1, // Not provided by Pioupiou
      uvIndex: -1, // Not provided by Pioupiou
      precipitation: -1, // Not provided by Pioupiou
      conditions: parsedData.weather_description || 'Wind data',
      timestamp: parsedData.timestamp,
      location: `${parsedData.station_name} (${parsedData.location.altitude}m)`,
      isValid: true,
      parseTime: Date.now() - startTime
    };
    
    const totalParseTime = Date.now() - startTime;
    console.log(`[INFO] Successfully parsed Pioupiou data in ${totalParseTime}ms`);
    
    return {
      success: true,
      data: legacyData,
      parseTime: totalParseTime
    };
    
  } catch (error) {
    const totalParseTime = Date.now() - startTime;
    console.error('[ERROR] Pioupiou parsing failed:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown parsing error',
      parseTime: totalParseTime
    };
  }
}
