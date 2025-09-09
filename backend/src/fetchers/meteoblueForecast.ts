/**
 * Meteoblue Forecast Fetcher
 * Weather Display System - Meteoblue Basic-1H Package Integration
 */

import { FetchResult, Env } from '../types/weather.js';

export interface MeteoblueForecastOptions {
  latitude: number;
  longitude: number;
  altitude?: number;  // meters above sea level
  apiKey?: string;    // Optional API key override
}

/**
 * Fetch hourly forecast data from Meteoblue Basic-1H package
 * API Documentation: https://docs.meteoblue.com/en/weather-apis/packages/basic-1h
 */
export async function fetchMeteoblueForecast(
  options: MeteoblueForecastOptions,
  env: Env
): Promise<FetchResult> {
  const startTime = Date.now();
  let attempts = 0;
  const maxRetries = 3;
  
  const apiKey = options.apiKey || env.METEOBLUE_API_KEY || 'demo';
  const altitude = options.altitude || 0;
  
  // Build Meteoblue API URL
  const baseUrl = 'https://my.meteoblue.com/packages/basic-3h';
  const params = new URLSearchParams({
    apikey: apiKey,
    lat: options.latitude.toString(),
    lon: options.longitude.toString(),
    asl: altitude.toString(),
    format: 'json',
    windspeed: 'ms-1',      // Match existing system units
    forecast_days: '2'       // 48-hour forecast to ensure 9 periods from any starting time
  });
  
  const url = `${baseUrl}?${params.toString()}`;
  
  while (attempts < maxRetries) {
    attempts++;
    
    try {
      console.log(`[INFO] Fetching Meteoblue forecast (attempt ${attempts}): ${url.replace(apiKey, '***')}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'weather-display-system/2.0',
          'Accept': 'application/json'
        },
        // Match timeout used by existing fetchers
        signal: AbortSignal.timeout(15000)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json() as any;
      
      // Check for Meteoblue API errors
      if (data.error === true) {
        throw new Error(`Meteoblue API error: ${data.error_message || 'Unknown error'}`);
      }
      
      const fetchTime = Date.now() - startTime;
      
      console.log(`[SUCCESS] Meteoblue forecast fetched in ${fetchTime}ms (${attempts} attempts)`);
      
      return {
        success: true,
        data,
        status: response.status,
        fetchTime,
        attempts
      };
      
    } catch (error) {
      const fetchTime = Date.now() - startTime;
      
      if (attempts >= maxRetries) {
        console.error(`[ERROR] Meteoblue forecast fetch failed after ${attempts} attempts:`, error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          fetchTime,
          attempts
        };
      }
      
      // Exponential backoff for retry
      const delay = Math.min(1000 * Math.pow(2, attempts - 1), 5000);
      console.warn(`[WARN] Meteoblue fetch attempt ${attempts} failed, retrying in ${delay}ms:`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // This should never be reached, but TypeScript requires it
  return {
    success: false,
    error: 'Maximum retries exceeded',
    fetchTime: Date.now() - startTime,
    attempts
  };
}

/**
 * Validate Meteoblue forecast response structure
 */
export function validateMeteoblueResponse(data: any): boolean {
  if (!data || typeof data !== 'object') {
    return false;
  }
  
  // Check for error response
  if (data.error === true) {
    return false;
  }
  
  // Check for required data structure
  if (!data.data_3h) {
    return false;
  }
  
  const hourlyData = data.data_3h;
  
  // Verify required arrays exist and have data
  if (!Array.isArray(hourlyData.time) || hourlyData.time.length === 0) {
    return false;
  }
  
  if (!Array.isArray(hourlyData.temperature) || hourlyData.temperature.length === 0) {
    return false;
  }
  
  if (!Array.isArray(hourlyData.pictocode) || hourlyData.pictocode.length === 0) {
    return false;
  }
  
  // Verify arrays have same length
  if (hourlyData.time.length !== hourlyData.temperature.length ||
      hourlyData.time.length !== hourlyData.pictocode.length) {
    return false;
  }
  
  return true;
}
