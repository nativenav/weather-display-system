import { WeatherData, ParseResult, FetchResult } from '../types/weather.js';
import { knotsToMeterPerSecond, retryWithBackoff, extractWindSpeedFromHex, extractWindDirectionFromHex, calculateWindStats } from '../utils/helpers.js';

// Seaview uses historical data API with 1-minute window for memory-efficient processing
const SEAVIEW_BASE_URL = "https://www.navis-livedata.com/query.php";
const SEAVIEW_IMEI = "083af23b9b89_15_1";

const SEAVIEW_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
  'Accept': '*/*',
  'Accept-Language': 'en-GB,en;q=0.9,fr;q=0.8',
  'Connection': 'keep-alive',
  'Referer': 'https://www.navis-livedata.com/view.php?u=36371',
  'Cookie': 'PHPSESSID=temp_session',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin'
};

/**
 * Fetch Seaview weather data with historical data API (1-minute window)
 */
export async function fetchSeaviewWeather(): Promise<FetchResult> {
  const startTime = Date.now();
  
  // Use 1-minute historical window for averaged/peak calculations (memory efficient)
  const now = Math.floor(Date.now() / 1000);
  const fromTime = now - 60; // 1 minute ago
  const toTime = now;
  
  const url = `${SEAVIEW_BASE_URL}?imei=${SEAVIEW_IMEI}&type=data&from=${fromTime}&to=${toTime}`;
  
  console.log(`[INFO] Fetching Seaview historical data from ${fromTime} to ${toTime}`);
  
  const fetchAttempt = async (attempt: number): Promise<Response> => {
    console.log(`[INFO] Fetching Seaview weather data (attempt ${attempt})...`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: SEAVIEW_HEADERS,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  };
  
  try {
    const response = await retryWithBackoff(fetchAttempt, 3, 2000);
    const hexData = await response.text();
    const fetchTime = Date.now() - startTime;
    
    console.log(`[DEBUG] Received ${hexData.length} bytes in ${fetchTime}ms`);
    console.log(`[DEBUG] Raw historical response: ${hexData}`);
    
    // Check for error response
    if (hexData === "error%" || hexData.length < 10) {
      console.log(`[WARNING] Historical API returned error: ${hexData}`);
      console.log(`[INFO] Falling back to live data API...`);
      
      return await fetchSeaviewLiveData();
    }
    
    return {
      success: true,
      data: hexData,
      status: response.status,
      fetchTime,
      attempts: 1
    };
  } catch (error) {
    const fetchTime = Date.now() - startTime;
    console.error('[ERROR] Failed to fetch Seaview data:', error);
    
    // Fallback to live data
    console.log('[INFO] Falling back to live data API...');
    return await fetchSeaviewLiveData();
  }
}

/**
 * Fallback to Seaview live data (instantaneous reading)
 */
async function fetchSeaviewLiveData(): Promise<FetchResult> {
  const startTime = Date.now();
  const url = `${SEAVIEW_BASE_URL}?imei=${SEAVIEW_IMEI}&type=live`;
  
  console.log('[INFO] Fetching Seaview live data (fallback)...');
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Referer': 'https://www.navis-livedata.com/view.php?u=36371'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const hexData = await response.text();
    const fetchTime = Date.now() - startTime;
    
    console.log(`[DEBUG] Live data received ${hexData.length} bytes in ${fetchTime}ms`);
    
    if (hexData === "error%" || hexData.length < 10) {
      throw new Error(`Live data API failed: ${hexData}`);
    }
    
    return {
      success: true,
      data: hexData,
      status: response.status,
      fetchTime,
      attempts: 1
    };
  } catch (error) {
    const fetchTime = Date.now() - startTime;
    console.error('[ERROR] Live data fetch also failed:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      fetchTime,
      attempts: 1
    };
  }
}

/**
 * Parse Seaview historical hex data (ported from C++ parseSeaviewHistoricalData)
 */
export function parseSeaviewHistoricalData(hexData: string): ParseResult {
  const parseStart = Date.now();
  console.log('[INFO] Parsing Seaview historical weather data...');
  
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
      location: 'Seaview, Isle of Wight',
      isValid: false,
      parseTime: 0
    };
    
    // Parse hex data - expect colon-separated hex strings
    // Format: "timestamp1:hexdata1,timestamp2:hexdata2,..."
    
    // Memory-efficient processing: use arrays for wind speed collection
    const MAX_SAMPLES = 20; // Limit for memory constraints
    const windSpeeds: number[] = [];
    const windDirections: number[] = [];
    
    // Split by comma to get individual readings
    const readings = hexData.split(',');
    let sampleCount = 0;
    
    for (const reading of readings) {
      if (sampleCount >= MAX_SAMPLES) break;
      
      // Parse individual reading: "timestamp:hexdata"
      const colonIndex = reading.indexOf(':');
      if (colonIndex === -1 || colonIndex >= reading.length - 1) continue;
      
      const timestamp = reading.substring(0, colonIndex);
      const hexValue = reading.substring(colonIndex + 1);
      
      console.log(`[DEBUG] Processing sample ${sampleCount}: time=${timestamp}, hex=${hexValue}`);
      
      // Extract wind data from hex
      if (hexValue.length >= 8) {
        const windSpeedKnots = extractWindSpeedFromHex(hexValue);
        const windDirDegrees = extractWindDirectionFromHex(hexValue);
        
        windSpeeds.push(windSpeedKnots);
        windDirections.push(windDirDegrees);
        sampleCount++;
      }
    }
    
    if (sampleCount > 0) {
      // Calculate statistics
      const windStats = calculateWindStats(windSpeeds);
      
      // Convert from knots to m/s
      data.windSpeed = knotsToMeterPerSecond(windStats.avgSpeed);
      data.windGust = knotsToMeterPerSecond(windStats.peakSpeed);
      
      // Calculate average direction (simple average - could be improved with circular statistics)
      const totalDirection = windDirections.reduce((sum, dir) => sum + dir, 0);
      data.windDirection = Math.round(totalDirection / sampleCount);
      
      data.timestamp = "Historical average (1 min)";
      
      console.log(`[DEBUG] Calculated from ${sampleCount} samples: avg=${windStats.avgSpeed.toFixed(1)} kts, peak=${windStats.peakSpeed.toFixed(1)} kts, dir=${data.windDirection}°`);
    } else {
      console.error('[ERROR] No valid samples found in historical data');
      data.isValid = false;
    }
    
    const parseTime = Date.now() - parseStart;
    data.parseTime = parseTime;
    data.isValid = (sampleCount > 0 && (data.windSpeed > 0 || data.windDirection > 0));
    
    console.log(`[DEBUG] Historical parse completed in ${parseTime}ms, valid: ${data.isValid}`);
    
    return {
      success: true,
      data,
      parseTime
    };
    
  } catch (error) {
    const parseTime = Date.now() - parseStart;
    console.error('[ERROR] Seaview historical parsing failed:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown parsing error',
      parseTime
    };
  }
}

/**
 * Parse Seaview live hex data (ported from C++ parseSeaviewLiveData)
 */
export function parseSeaviewLiveData(hexData: string): ParseResult {
  const parseStart = Date.now();
  console.log('[INFO] Parsing Seaview live weather data (fallback)...');
  
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
      location: 'Seaview, Isle of Wight',
      isValid: false,
      parseTime: 0
    };
    
    // Parse single hex reading - expect 8 hex characters
    const cleanHex = hexData.trim();
    
    if (cleanHex.length >= 8) {
      // Extract wind speed and direction
      const windSpeedKnots = extractWindSpeedFromHex(cleanHex);
      const windDirection = extractWindDirectionFromHex(cleanHex);
      
      data.windSpeed = knotsToMeterPerSecond(windSpeedKnots);
      data.windGust = data.windSpeed; // Live data: gust = current speed (instantaneous)
      data.windDirection = windDirection;
      data.timestamp = "Live instantaneous data";
      
      console.log(`[DEBUG] Live data: speed=${windSpeedKnots.toFixed(1)} kts, dir=${windDirection}°`);
    } else {
      console.error(`[ERROR] Invalid hex data format: ${cleanHex}`);
      data.isValid = false;
    }
    
    const parseTime = Date.now() - parseStart;
    data.parseTime = parseTime;
    data.isValid = (data.windSpeed >= 0 || data.windDirection >= 0);
    
    console.log(`[DEBUG] Live parse completed in ${parseTime}ms, valid: ${data.isValid}`);
    
    return {
      success: true,
      data,
      parseTime
    };
    
  } catch (error) {
    const parseTime = Date.now() - parseStart;
    console.error('[ERROR] Seaview live parsing failed:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown parsing error',
      parseTime
    };
  }
}

/**
 * Main Seaview parser function - tries historical data first, falls back to live
 */
export function parseSeaviewData(hexData: string): ParseResult {
  // Determine if this is historical data (contains colons and commas) or live data (single hex)
  if (hexData.includes(':') && hexData.includes(',')) {
    return parseSeaviewHistoricalData(hexData);
  } else {
    return parseSeaviewLiveData(hexData);
  }
}
