import { WeatherData, ParseResult, FetchResult } from '../types/weather.js';
import { retryWithBackoff } from '../utils/helpers.js';

// Seaview Navis Live Data API - enhanced implementation with historical data support
const SEAVIEW_IMEI = "083af23b9b89_15_1";
const SEAVIEW_SESSION_URL = "https://www.navis-livedata.com/view.php?u=36371";
const SEAVIEW_LIVE_URL = `https://www.navis-livedata.com/query.php?imei=${SEAVIEW_IMEI}&type=live`;

// Enhanced: Historical data URL for proper gust calculation (1-minute window)
function getSeaviewHistoricalUrl(): string {
  const now = Math.floor(Date.now() / 1000);
  const fromTime = now - 60; // 1 minute ago for memory efficiency
  const toTime = now;
  return `https://www.navis-livedata.com/query.php?imei=${SEAVIEW_IMEI}&type=data&from=${fromTime}&to=${toTime}`;
}

// Headers required for Navis Live Data API
const SEAVIEW_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
  'Accept': '*/*',
  'Accept-Language': 'en-GB,en;q=0.9',
  'Connection': 'keep-alive',
  'Referer': SEAVIEW_SESSION_URL,
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin'
};

/**
 * Parse Navis hex data using documented algorithm
 */
function parseNavisHexData(hexData: string): { windSpeed: number; windDirection: number; temperature: number; } {
  if (hexData.length < 8) {
    throw new Error('Hex data too short');
  }
  
  // Split hex into MSB and LSB as documented
  let MSB = 0;
  let LSB = 0;
  
  if (hexData.length > 8) {
    const msbHex = hexData.substring(0, hexData.length - 8);
    MSB = parseInt(msbHex, 16);
  }
  const lsbHex = hexData.substring(hexData.length - 8);
  LSB = parseInt(lsbHex, 16);
  
  if (isNaN(MSB) || isNaN(LSB)) {
    throw new Error('Invalid hex data');
  }
  
  // Extract values using bit manipulation (from documentation)
  const temp_raw = MSB & 0x7FF;          // bits 0-10 of MSB
  const speed_raw = LSB >>> 16;           // bits 16-31 of LSB (unsigned right shift)
  const direction_raw = (LSB >>> 7) & 0x1FF; // bits 7-15 of LSB (9 bits)
  
  console.log(`[DEBUG] Hex parsing: MSB=0x${MSB.toString(16)} (${MSB}), LSB=0x${LSB.toString(16)} (${LSB})`);
  console.log(`[DEBUG] Extracted: temp_raw=${temp_raw}, speed_raw=${speed_raw}, direction_raw=${direction_raw}`);
  
  // Apply conversions (from documentation)
  const speed_ms = speed_raw / 10.0;
  const windSpeedKnots = speed_ms * 1.94384449;  // Convert to knots
  const windDirection = direction_raw;
  const temperature = (temp_raw - 400) / 10.0;  // Temperature formula
  
  console.log(`[DEBUG] Final values: temp=${temperature}°C, wind=${windSpeedKnots.toFixed(1)} kts, dir=${windDirection}°`);
  
  return {
    windSpeed: windSpeedKnots,
    windDirection,
    temperature
  };
}

/**
 * Calculate wind statistics from historical samples (enhanced gust calculation)
 */
function calculateWindStats(windSpeeds: number[]): { avgSpeed: number; peakSpeed: number; } {
  if (windSpeeds.length === 0) {
    return { avgSpeed: 0, peakSpeed: 0 };
  }
  
  const sum = windSpeeds.reduce((acc, speed) => acc + speed, 0);
  const avgSpeed = sum / windSpeeds.length;
  const peakSpeed = Math.max(...windSpeeds);
  
  console.log(`[DEBUG] Wind stats from ${windSpeeds.length} samples: avg=${avgSpeed.toFixed(1)} kts, peak=${peakSpeed.toFixed(1)} kts`);
  
  return { avgSpeed, peakSpeed };
}

/**
 * Parse historical data response and extract wind readings
 */
function parseHistoricalData(histData: string): { avgWindSpeed: number; gustWindSpeed: number; windDirection: number; temperature: number; sampleCount: number; } {
  console.log(`[DEBUG] Parsing historical data: ${histData.substring(0, 100)}...`);
  
  const windSpeeds: number[] = [];
  const windDirections: number[] = [];
  let temperatures: number[] = [];
  
  // Parse comma-separated readings: "timestamp1:hexdata1,timestamp2:hexdata2,..."
  const rawReadings = histData.split(',').map(r => r.trim()).filter(Boolean);

  // Extract timestamp and hex, clean hex (remove trailing %), and sort by timestamp ascending
  type Sample = { ts: number; hex: string };
  const samples: Sample[] = [];
  for (const reading of rawReadings) {
    const colonIndex = reading.indexOf(':');
    if (colonIndex > 0 && colonIndex < reading.length - 1) {
      const tsStr = reading.substring(0, colonIndex);
      let hexValue = reading.substring(colonIndex + 1).trim();
      // Clean hex artifacts
      hexValue = hexValue.replace(/%$/, '').trim();
      const ts = parseInt(tsStr, 10);
      if (!isNaN(ts) && hexValue.length >= 8) {
        samples.push({ ts, hex: hexValue });
      }
    }
  }

  if (samples.length === 0) {
    throw new Error('No valid historical samples found');
  }

  // Sort by timestamp and take the most recent N samples
  samples.sort((a, b) => a.ts - b.ts);
  const maxSamples = 30; // Limit for efficiency
  const recent = samples.slice(-maxSamples);

  // Parse most recent samples
  for (let i = 0; i < recent.length; i++) {
    try {
      const navisData = parseNavisHexData(recent[i].hex);
      windSpeeds.push(navisData.windSpeed);
      windDirections.push(navisData.windDirection);
      temperatures.push(navisData.temperature);
    } catch (error) {
      console.warn(`[WARN] Failed to parse historical sample ${i}:`, error);
    }
  }
  
  if (windSpeeds.length === 0) {
    throw new Error('No valid historical samples parsed');
  }
  
  // Outlier rejection for temperatures using median (robust against spikes)
  const sortedTemps = [...temperatures].sort((a, b) => a - b);
  const median = sortedTemps.length % 2 === 1
    ? sortedTemps[(sortedTemps.length - 1) / 2]
    : (sortedTemps[sortedTemps.length / 2 - 1] + sortedTemps[sortedTemps.length / 2]) / 2;
  // Filter out readings more than 8°C away from median (site shows ~15°C)
  temperatures = temperatures.filter(t => Math.abs(t - median) <= 8);
  if (temperatures.length === 0) {
    // Fallback to sortedTemps if all filtered (avoid empty set)
    temperatures = sortedTemps;
  }

  // Calculate statistics
  const windStats = calculateWindStats(windSpeeds);
  
  // Calculate average direction (simple average - good enough for short time window)
  const avgDirection = windDirections.reduce((sum, dir) => sum + dir, 0) / windDirections.length;
  const avgTemperature = temperatures.reduce((sum, temp) => sum + temp, 0) / temperatures.length;
  
  return {
    avgWindSpeed: windStats.avgSpeed,
    gustWindSpeed: windStats.peakSpeed,
    windDirection: Math.round(avgDirection),
    temperature: Math.round(avgTemperature * 10) / 10,
    sampleCount: windSpeeds.length
  };
}

/**
 * Establish session with Navis Live Data with improved reliability
 */
async function establishNavisSession(): Promise<string | null> {
  console.log('[INFO] Establishing Navis session...');
  
  try {
    const response = await fetch(SEAVIEW_SESSION_URL, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Session request failed: ${response.status}`);
    }
    
    // Extract session cookie from response headers
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      const sessionMatch = setCookieHeader.match(/PHPSESSID=([^;]+)/);
      if (sessionMatch) {
        const sessionId = sessionMatch[1];
        console.log(`[DEBUG] Session established: PHPSESSID=${sessionId}`);
        return sessionId;
      }
    }
    
    console.warn('[WARNING] No session cookie found in response');
    return null;
  } catch (error) {
    console.error('[ERROR] Failed to establish session:', error);
    return null;
  }
}

/**
 * Fetch Seaview historical weather data for enhanced gust calculation
 */
async function fetchSeaviewHistoricalData(): Promise<FetchResult> {
  const startTime = Date.now();
  
  console.log('[INFO] Fetching Seaview historical data for gust calculation...');
  
  const fetchAttempt = async (attempt: number): Promise<Response> => {
    console.log(`[INFO] Fetching Seaview historical data (attempt ${attempt})...`);
    
    // Establish session
    const sessionId = await establishNavisSession();
    if (!sessionId) {
      throw new Error('Failed to establish session - required for historical API access');
    }
    
    // Small delay to ensure session is properly established
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Prepare headers with session cookie
    const headers: Record<string, string> = {
      ...SEAVIEW_HEADERS,
      'Cookie': `PHPSESSID=${sessionId}`,
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    };
    
    const historicalUrl = getSeaviewHistoricalUrl();
    console.log(`[DEBUG] Making historical API call to: ${historicalUrl}`);
    
    const response = await fetch(historicalUrl, {
      method: 'GET',
      headers
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  };
  
  try {
    const response = await retryWithBackoff(fetchAttempt, 2, 1500); // Fewer retries for historical
    const histData = await response.text();
    const fetchTime = Date.now() - startTime;
    
    console.log(`[DEBUG] Historical data received ${histData.length} bytes in ${fetchTime}ms`);
    
    // Check for error response
    if (histData === "error%" || histData.length < 10) {
      throw new Error(`Historical API returned error: ${histData}`);
    }
    
    return {
      success: true,
      data: histData,
      status: response.status,
      fetchTime,
      attempts: 1
    } as FetchResult & { dataType?: string };
  } catch (error) {
    const fetchTime = Date.now() - startTime;
    console.error('[ERROR] Failed to fetch Seaview historical data:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      fetchTime,
      attempts: 1
    };
  }
}

/**
 * Fetch Seaview live weather data (fallback for historical failures)
 */
async function fetchSeaviewLiveData(): Promise<FetchResult> {
  const startTime = Date.now();
  
  console.log('[INFO] Fetching Seaview live data (fallback mode)...');
  
  const fetchAttempt = async (attempt: number): Promise<Response> => {
    console.log(`[INFO] Fetching Seaview live data (attempt ${attempt})...`);
    
    // First establish session (as per C++ documentation: session.get(sessionURL))
    const sessionId = await establishNavisSession();
    if (!sessionId) {
      throw new Error('Failed to establish session - required for API access');
    }
    
    // Small delay to ensure session is properly established
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Prepare headers with session cookie
    const headers: Record<string, string> = {
      ...SEAVIEW_HEADERS,
      'Cookie': `PHPSESSID=${sessionId}`,
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    };
    
    console.log(`[DEBUG] Using session cookie: PHPSESSID=${sessionId}`);
    console.log(`[DEBUG] Making live API call to: ${SEAVIEW_LIVE_URL}`);
    
    const response = await fetch(SEAVIEW_LIVE_URL, {
      method: 'GET',
      headers
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
    
    console.log(`[DEBUG] Live data received ${hexData.length} bytes in ${fetchTime}ms`);
    console.log(`[DEBUG] Raw live response: ${hexData}`);
    
    // Check for error response
    if (hexData === "error%" || hexData.length < 10) {
      throw new Error(`Live API returned error: ${hexData}`);
    }
    
    return {
      success: true,
      data: hexData,
      status: response.status,
      fetchTime,
      attempts: 1
    } as FetchResult & { dataType?: string };
  } catch (error) {
    const fetchTime = Date.now() - startTime;
    console.error('[ERROR] Failed to fetch Seaview live data:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      fetchTime,
      attempts: 1
    };
  }
}

/**
 * Main fetch function with enhanced historical data support and fallback
 */
export async function fetchSeaviewWeather(): Promise<FetchResult> {
  console.log('[INFO] Fetching Seaview data with enhanced gust calculation...');
  
  // Try historical data first for proper gust calculation
  const historicalResult = await fetchSeaviewHistoricalData();
  if (historicalResult.success) {
    console.log('[INFO] Successfully fetched Seaview historical data');

    // ALSO fetch live in same flow to get temperature from live endpoint
    let liveTempC: number | null = null;
    try {
      const live = await fetchSeaviewLiveData();
      if (live.success && typeof live.data === 'string') {
        // Extract hex and parse temp from live data
        const parts = (live.data as string).trim().split(':');
        if (parts.length >= 3) {
          let hexValue = parts[2].replace(/%$/, '').trim();
          const parsed = parseNavisHexData(hexValue);
          liveTempC = parsed.temperature;
          console.log(`[DEBUG] Live temperature override available: ${liveTempC}°C`);
        }
      }
    } catch (e) {
      console.warn('[WARN] Failed to fetch/parse live temperature for override:', e);
    }

    return {
      ...historicalResult,
      dataType: 'historical', // Add metadata
      tempOverrideC: liveTempC
    } as FetchResult & { dataType: string; tempOverrideC?: number | null };
  }
  
  // Fallback to live data
  console.log('[INFO] Historical data failed, falling back to live data...');
  const liveResult = await fetchSeaviewLiveData();
  if (liveResult.success) {
    console.log('[INFO] Successfully fetched Seaview live data (fallback)');
    return {
      ...liveResult,
      dataType: 'live' // Add metadata
    } as FetchResult & { dataType: string };
  }
  
  // Both failed
  return {
    success: false,
    error: `Both historical and live data fetch failed. Historical: ${historicalResult.error}, Live: ${liveResult.error}`,
    fetchTime: (historicalResult.fetchTime || 0) + (liveResult.fetchTime || 0),
    attempts: 2
  };
}


/**
 * Parse Seaview Navis data with enhanced gust calculation
 */
export function parseSeaviewData(rawData: string, dataType?: string, overrideTemperatureC?: number | null): ParseResult {
  const parseStart = Date.now();
  console.log(`[INFO] Parsing Seaview Navis ${dataType || 'unknown'} data...`);
  
  try {
    // Initialize weather data (all null for missing data)
    const weatherData: WeatherData = {
      temperature: null,
      humidity: null,
      pressure: null,
      windSpeed: null,
      windGust: null,
      windDirection: null,
      visibility: null,
      uvIndex: null,
      precipitation: null,
      conditions: '',
      timestamp: '',
      location: 'Seaview, Isle of Wight',
      isValid: false,
      parseTime: 0
    };
    
    console.log(`[DEBUG] Raw data: ${rawData.substring(0, 100)}${rawData.length > 100 ? '...' : ''}`);
    
    // Handle historical data with gust calculation
    if (dataType === 'historical' && rawData.includes(',')) {
      console.log('[DEBUG] Parsing historical data for enhanced gust calculation');
      
      const histData = parseHistoricalData(rawData);
      
      // Convert knots to m/s for standardized output
      weatherData.windSpeed = histData.avgWindSpeed * 0.514444; // Average wind speed
      weatherData.windGust = histData.gustWindSpeed * 0.514444; // Peak wind speed (true gust!)
      weatherData.windDirection = histData.windDirection;
      weatherData.temperature = histData.temperature;
      weatherData.timestamp = new Date().toISOString();
      
      console.log(`[DEBUG] Historical parsed: avg=${histData.avgWindSpeed.toFixed(1)} kts (${weatherData.windSpeed.toFixed(1)} m/s), gust=${histData.gustWindSpeed.toFixed(1)} kts (${weatherData.windGust.toFixed(1)} m/s), dir=${histData.windDirection}°, samples=${histData.sampleCount}`);
      
    } else {
      // Handle live data (single reading)
      console.log('[DEBUG] Parsing live data (instantaneous reading)');
      
      // Parse colon-delimited format: timestamp:status:hexdata
      const parts = rawData.trim().split(':');
      if (parts.length < 3) {
        throw new Error(`Invalid data format - expected 3 parts, got ${parts.length}: ${rawData}`);
      }
      
      const timestamp = parts[0];
      const status = parts[1];
      let hexValue = parts[2]; // Third part is the hex data
      
      // Clean up hex data - remove URL encoding artifacts like %
      hexValue = hexValue.replace(/%$/, '').trim();
      
      console.log(`[DEBUG] Timestamp: ${timestamp}, Status: ${status}, Hex: ${hexValue}`);
      
      if (hexValue.length < 8) {
        throw new Error(`Hex data too short: ${hexValue} (${hexValue.length} chars)`);
      }
      
      // Use documented parsing algorithm
      const navisData = parseNavisHexData(hexValue);
      
      // Convert knots to m/s for wind speed (standard unit)
      weatherData.windSpeed = navisData.windSpeed * 0.514444; // knots to m/s
      weatherData.windGust = null; // Live data: no gust available (instantaneous only)
      weatherData.windDirection = navisData.windDirection;
      weatherData.temperature = navisData.temperature;
      weatherData.timestamp = new Date().toISOString();
      
      console.log(`[DEBUG] Live parsed: wind=${navisData.windSpeed.toFixed(1)} kts (${weatherData.windSpeed.toFixed(1)} m/s), dir=${navisData.windDirection}°, temp=${navisData.temperature.toFixed(1)}°C`);
      console.log(`[DEBUG] Hex parsing details: hexValue='${hexValue}', length=${hexValue.length}`);
    }
    
    // If a live temperature override is available, apply it (always trust live for temperature)
    if (typeof overrideTemperatureC === 'number' && !isNaN(overrideTemperatureC)) {
      console.log(`[INFO] Applying live temperature override: ${overrideTemperatureC}°C`);
      weatherData.temperature = Math.round(overrideTemperatureC * 10) / 10;
    }

    const parseTime = Date.now() - parseStart;
    weatherData.parseTime = parseTime;
    
    // Enhanced validation with specific UK coastal temperature limits for Seaview
    const tempValid = weatherData.temperature !== null && 
                     weatherData.temperature > -10 && 
                     weatherData.temperature < 50; // UK coastal realistic range
    
    if (!tempValid && weatherData.temperature !== null) {
      console.warn(`[WARN] Seaview temperature ${weatherData.temperature}°C outside realistic range (-10 to 50°C), marking invalid`);
    }
    
    weatherData.isValid = (
      weatherData.windSpeed >= 0 && 
      weatherData.windDirection >= 0 && 
      weatherData.windDirection < 360 &&
      tempValid
    );
    
    // Add metadata about data source type
    weatherData.conditions = dataType === 'historical' ? 
      `Wind ${Math.round(weatherData.windDirection)}° (1-min avg/gust)` : 
      `Wind ${Math.round(weatherData.windDirection)}° (instantaneous)`;
    
    console.log(`[DEBUG] Parse completed in ${parseTime}ms, valid: ${weatherData.isValid}, type: ${dataType || 'unknown'}`);
    
    return {
      success: true,
      data: weatherData,
      parseTime
    };
    
  } catch (error) {
    const parseTime = Date.now() - parseStart;
    console.error('[ERROR] Seaview parsing failed:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown parsing error',
      parseTime
    };
  }
}
