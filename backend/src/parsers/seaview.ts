import { WeatherData, ParseResult, FetchResult } from '../types/weather.js';
import { retryWithBackoff } from '../utils/helpers.js';

// Seaview Navis Live Data API - correct implementation from documentation
const SEAVIEW_IMEI = "083af23b9b89_15_1";
const SEAVIEW_SESSION_URL = "https://www.navis-livedata.com/view.php?u=36371";
const SEAVIEW_LIVE_URL = `https://www.navis-livedata.com/query.php?imei=${SEAVIEW_IMEI}&type=live`;

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
  
  // Apply conversions (from documentation)
  const speed_ms = speed_raw / 10.0;
  const windSpeedKnots = speed_ms * 1.94384449;  // Convert to knots
  const windDirection = direction_raw;
  const temperature = (temp_raw - 400) / 10.0;  // Temperature formula
  
  return {
    windSpeed: windSpeedKnots,
    windDirection,
    temperature
  };
}

/**
 * Establish session with Navis Live Data (as per documentation)
 */
async function establishNavisSession(): Promise<string | null> {
  console.log('[INFO] Establishing Navis session...');
  
  try {
    const response = await fetch(SEAVIEW_SESSION_URL, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.9'
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
 * Fetch Seaview weather data using Navis Live Data API with session management
 */
export async function fetchSeaviewWeather(): Promise<FetchResult> {
  const startTime = Date.now();
  
  console.log('[INFO] Fetching Seaview Navis live data with session management...');
  
  const fetchAttempt = async (attempt: number): Promise<Response> => {
    console.log(`[INFO] Fetching Seaview data (attempt ${attempt})...`);
    
    // First establish session (as per C++ documentation: session.get(sessionURL))
    const sessionId = await establishNavisSession();
    if (!sessionId) {
      console.warn('[WARNING] Failed to establish session, trying without...');
    }
    
    // Prepare headers with session cookie if available
    const headers = {
      ...SEAVIEW_HEADERS
    };
    
    if (sessionId) {
      headers['Cookie'] = `PHPSESSID=${sessionId}`;
      console.log(`[DEBUG] Using session cookie: PHPSESSID=${sessionId}`);
    }
    
    console.log(`[DEBUG] Making API call to: ${SEAVIEW_LIVE_URL}`);
    
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
    
    console.log(`[DEBUG] Received ${hexData.length} bytes in ${fetchTime}ms`);
    console.log(`[DEBUG] Raw response: ${hexData}`);
    
    // Check for error response
    if (hexData === "error%" || hexData.length < 10) {
      throw new Error(`API returned error: ${hexData}`);
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
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      fetchTime,
      attempts: 1
    };
  }
}


/**
 * Parse Seaview Navis hex data using documented algorithm
 */
export function parseSeaviewData(hexData: string): ParseResult {
  const parseStart = Date.now();
  console.log('[INFO] Parsing Seaview Navis hex data...');
  
  try {
    // Initialize weather data
    const weatherData: WeatherData = {
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
    
    console.log(`[DEBUG] Raw hex data: ${hexData}`);
    
    // Parse colon-delimited format: timestamp:status:hexdata
    const parts = hexData.trim().split(':');
    if (parts.length < 3) {
      throw new Error(`Invalid data format - expected 3 parts, got ${parts.length}: ${hexData}`);
    }
    
    const timestamp = parts[0];
    const status = parts[1];
    const hexValue = parts[2]; // Third part is the hex data
    
    console.log(`[DEBUG] Timestamp: ${timestamp}, Status: ${status}, Hex: ${hexValue}`);
    
    if (hexValue.length < 8) {
      throw new Error(`Hex data too short: ${hexValue} (${hexValue.length} chars)`);
    }
    
    // Use documented parsing algorithm
    const navisData = parseNavisHexData(hexValue);
    
    // Convert knots to m/s for wind speed (standard unit)
    weatherData.windSpeed = navisData.windSpeed * 0.514444; // knots to m/s
    weatherData.windGust = weatherData.windSpeed; // Navis provides instantaneous data
    weatherData.windDirection = navisData.windDirection;
    weatherData.temperature = navisData.temperature;
    weatherData.timestamp = new Date().toISOString(); // Current timestamp
    
    console.log(`[DEBUG] Parsed: wind=${navisData.windSpeed.toFixed(1)} kts (${weatherData.windSpeed.toFixed(1)} m/s), dir=${navisData.windDirection}°, temp=${navisData.temperature.toFixed(1)}°C`);
    
    const parseTime = Date.now() - parseStart;
    weatherData.parseTime = parseTime;
    weatherData.isValid = (
      weatherData.windSpeed >= 0 && 
      weatherData.windDirection >= 0 && 
      weatherData.windDirection < 360 &&
      weatherData.temperature > -50 && weatherData.temperature < 60 // Reasonable temperature range
    );
    
    console.log(`[DEBUG] Parse completed in ${parseTime}ms, valid: ${weatherData.isValid}`);
    
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
