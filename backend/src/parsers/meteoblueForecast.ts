/**
 * Meteoblue Forecast Parser
 * Weather Display System - Meteoblue Basic-1H Package Data Processing
 */

import { ForecastData, ForecastHour, ParseResult, Env } from '../types/weather.js';
import { fetchMeteoblueForecast, validateMeteoblueResponse, MeteoblueForecastOptions } from '../fetchers/meteoblueForecast.js';

/**
 * Parse Meteoblue Basic-3H forecast data into standardized format
 * Extracts 8 periods (24 hours in 3-hour intervals) starting from nearest time before current time
 */
export function parseMeteoblueForecast(rawData: any): ForecastHour[] {
  const parseStart = Date.now();
  
  try {
    console.log('[INFO] Parsing Meteoblue 3-hourly forecast data');
    
    // Validate response structure
    if (!validateMeteoblueResponse(rawData)) {
      throw new Error('Invalid Meteoblue response structure');
    }
    
    const hourlyData = rawData.data_3h;
    
    // Extract arrays from Meteoblue response
    const times: string[] = hourlyData.time || [];
    const temperatures: number[] = hourlyData.temperature || [];
    const weatherCodes: number[] = hourlyData.pictocode || []; // Meteoblue uses 'pictocode' not 'weathercode'
    
    if (times.length === 0) {
      throw new Error('No forecast data available in response');
    }
    
    // Find the starting index - nearest 3-hour interval before or at current time
    const currentTime = new Date();
    let startIndex = 0;
    
    // Find the last forecast period that is <= current time
    for (let i = 0; i < times.length; i++) {
      const forecastTime = new Date(times[i]);
      if (forecastTime <= currentTime) {
        startIndex = i;
      } else {
        break;
      }
    }
    
    // Always return 9 periods starting from the found index
    const periodsToTake = Math.min(9, times.length - startIndex);
    const forecastHours: ForecastHour[] = [];
    
    for (let i = 0; i < periodsToTake; i++) {
      const index = startIndex + i;
      const timestamp = times[index];
      const temperature = temperatures[index];
      const weatherCode = weatherCodes[index];
      
      // Skip invalid data points
      if (!timestamp || temperature === null || temperature === undefined || 
          weatherCode === null || weatherCode === undefined) {
        console.warn(`[WARN] Skipping invalid forecast period ${index}: temp=${temperature}, code=${weatherCode}`);
        continue;
      }
      
      forecastHours.push({
        timestamp,
        temperature: Math.round(temperature * 10) / 10, // Round to 1 decimal place
        weatherCode
      });
    }
    
    if (forecastHours.length === 0) {
      throw new Error('No valid forecast periods found in data');
    }
    
    const parseTime = Date.now() - parseStart;
    console.log(`[SUCCESS] Parsed ${forecastHours.length} forecast periods (3-hourly) starting from index ${startIndex} (${times[startIndex] || 'unknown'}), covering ${forecastHours.length * 3} hours in ${parseTime}ms`);
    
    return forecastHours;
    
  } catch (error) {
    const parseTime = Date.now() - parseStart;
    console.error(`[ERROR] Failed to parse Meteoblue forecast in ${parseTime}ms:`, error);
    throw error;
  }
}

/**
 * Fetch and parse Meteoblue forecast for a specific region
 * Returns standardized ForecastData structure
 */
export async function fetchAndParseMeteoblueForecast(
  regionId: string,
  location: string,
  options: MeteoblueForecastOptions,
  env: Env
): Promise<ForecastData> {
  console.log(`[INFO] Fetching Meteoblue forecast for ${regionId} (${location})`);
  
  // Fetch raw data from Meteoblue API
  const fetchResult = await fetchMeteoblueForecast(options, env);
  
  if (!fetchResult.success || !fetchResult.data) {
    throw new Error(`Failed to fetch Meteoblue data: ${fetchResult.error || 'Unknown error'}`);
  }
  
  // Parse forecast data
  const hours = parseMeteoblueForecast(fetchResult.data);
  
  const forecastData: ForecastData = {
    regionId,
    location,
    hours,
    generated: new Date().toISOString(),
    provider: 'meteoblue'
  };
  
  console.log(`[SUCCESS] Generated forecast for ${regionId}: ${hours.length} hours`);
  
  return forecastData;
}

/**
 * Weather code mapping for Meteoblue codes to common weather conditions
 * Based on Meteoblue weather code documentation
 * 
 * Reference: https://docs.meteoblue.com/en/weather-codes
 */
export function getMeteoblueWeatherDescription(code: number): string {
  const weatherCodes: Record<number, string> = {
    1: 'Clear sky',
    2: 'Fair',
    3: 'Partly cloudy',
    4: 'Cloudy',
    5: 'Rain showers',
    6: 'Rain showers with snow',
    7: 'Snow showers',
    8: 'Rain',
    9: 'Snow',
    10: 'Sleet',
    11: 'Fog',
    12: 'Thunderstorms',
    13: 'Thunderstorms with rain',
    14: 'Thunderstorms with snow',
    15: 'Thunderstorms with hail'
  };
  
  return weatherCodes[code] || `Unknown (${code})`;
}

/**
 * Get weather icon identifier for Meteoblue weather codes
 * Maps to common weather icon naming conventions
 */
export function getMeteoblueWeatherIcon(code: number): string {
  const iconMapping: Record<number, string> = {
    1: 'clear-day',
    2: 'fair-day', 
    3: 'partly-cloudy-day',
    4: 'cloudy',
    5: 'rain',
    6: 'sleet',
    7: 'snow',
    8: 'rain',
    9: 'snow',
    10: 'sleet',
    11: 'fog',
    12: 'thunderstorm',
    13: 'thunderstorm',
    14: 'thunderstorm',
    15: 'thunderstorm'
  };
  
  return iconMapping[code] || 'unknown';
}

/**
 * Validate forecast data structure
 */
export function validateForecastData(data: ForecastData): boolean {
  if (!data || typeof data !== 'object') {
    return false;
  }
  
  if (!data.regionId || !data.location || !data.generated) {
    return false;
  }
  
  if (!Array.isArray(data.hours) || data.hours.length === 0) {
    return false;
  }
  
  // Validate each forecast hour
  for (const hour of data.hours) {
    if (!hour.timestamp || typeof hour.temperature !== 'number' || 
        typeof hour.weatherCode !== 'number') {
      return false;
    }
  }
  
  return true;
}
