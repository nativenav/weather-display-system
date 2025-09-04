import { WeatherData, ParseResult, FetchResult } from '../types/weather.js';
import { retryWithBackoff } from '../utils/helpers.js';

// Lymington WeatherFile.com V03 API - correct implementation from documentation
const LYMINGTON_BASE_URL = "https://weatherfile.com";
const LYMINGTON_LOCATION_ID = "GBR00001";

// Primary endpoint (Enhanced Data with averages)
const LYMINGTON_ENHANCED_URL = `${LYMINGTON_BASE_URL}/V03/loc/${LYMINGTON_LOCATION_ID}/infowindow.ggl`;
// Fallback endpoint (Current Data only)
const LYMINGTON_CURRENT_URL = `${LYMINGTON_BASE_URL}/V03/loc/${LYMINGTON_LOCATION_ID}/latest.json`;

// Headers required for WeatherFile.com V03 API (from documentation)
const LYMINGTON_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; WeatherStation/1.0)',
  'Accept': '*/*',
  'X-Requested-With': 'XMLHttpRequest',
  'Referer': `${LYMINGTON_BASE_URL}/location?loc_id=${LYMINGTON_LOCATION_ID}&wt=KTS`,
  'Origin': LYMINGTON_BASE_URL,
  'Content-Length': '0',
  'wf-tkn': 'PUBLIC'
};

// Enhanced API response structure
interface LymingtonEnhancedResponse {
  status: string;
  data: {
    loc_id: string;
    display_name: string;
    lat: number;
    lng: number;
    lastaverage: {
      wsa: number;  // Wind Speed Average (m/s)
      wsh: number;  // Wind Speed High/Max (m/s) - GUST DATA!
      wsl: number;  // Wind Speed Low (m/s) 
      wda: number;  // Wind Direction Average (degrees)
      ts: string;   // Timestamp
      date: string;
      time: string;
    }
  };
  token: string;
}

// Current API response structure
interface LymingtonCurrentResponse {
  status: string;
  data: {
    wdc: number;      // Wind direction current (degrees)
    wsc: number;      // Wind speed current (m/s)
    ts: string;       // Timestamp
    loc_name: string;
    lat: number;
    lng: number;
    delay: number;    // Data delay (minutes)
    num_params: number;
  };
}

/**
 * Fetch Lymington weather data using WeatherFile V03 API
 */
export async function fetchLymingtonWeather(): Promise<FetchResult> {
  const startTime = Date.now();
  
  console.log('[INFO] Fetching Lymington Starting Platform weather data...');
  
  // Try enhanced endpoint first (with averages and gust data)
  const fetchEnhanced = async (attempt: number): Promise<Response> => {
    console.log(`[INFO] Fetching enhanced data (attempt ${attempt}) from ${LYMINGTON_ENHANCED_URL}...`);
    
    const response = await fetch(LYMINGTON_ENHANCED_URL, {
      method: 'POST',
      headers: LYMINGTON_HEADERS
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  };
  
  try {
    const response = await retryWithBackoff(fetchEnhanced, 3, 2000);
    const jsonData = await response.text();
    const fetchTime = Date.now() - startTime;
    
    console.log(`[DEBUG] Enhanced API response: ${jsonData.length} bytes in ${fetchTime}ms`);
    console.log(`[DEBUG] Response preview: ${jsonData.substring(0, 200)}`);
    
    // Try to parse as JSON
    try {
      const parsedData: LymingtonEnhancedResponse = JSON.parse(jsonData);
      if (parsedData.status === 'ok') {
        return {
          success: true,
          data: parsedData,
          status: response.status,
          fetchTime,
          attempts: 1
        };
      } else {
        throw new Error(`API returned error status: ${parsedData.status}`);
      }
    } catch (parseError) {
      console.warn('[WARNING] Enhanced API JSON parse failed, trying current endpoint...', parseError);
      return await fetchLymingtonCurrent();
    }
  } catch (error) {
    console.error('[ERROR] Enhanced API failed, trying current endpoint...', error);
    return await fetchLymingtonCurrent();
  }
}

/**
 * Fallback to current data endpoint
 */
async function fetchLymingtonCurrent(): Promise<FetchResult> {
  const startTime = Date.now();
  
  console.log('[INFO] Fetching Lymington current data fallback...');
  
  try {
    const response = await fetch(LYMINGTON_CURRENT_URL, {
      method: 'POST',
      headers: LYMINGTON_HEADERS
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const jsonData = await response.text();
    const fetchTime = Date.now() - startTime;
    
    console.log(`[DEBUG] Current API response: ${jsonData.length} bytes in ${fetchTime}ms`);
    
    // Try to parse as JSON
    try {
      const parsedData: LymingtonCurrentResponse = JSON.parse(jsonData);
      if (parsedData.status === 'ok') {
        return {
          success: true,
          data: parsedData,
          status: response.status,
          fetchTime,
          attempts: 1
        };
      } else {
        throw new Error(`Current API returned error status: ${parsedData.status}`);
      }
    } catch (parseError) {
      console.error('[ERROR] Current API JSON parse failed:', parseError);
      return {
        success: false,
        error: 'Failed to parse JSON from current API',
        fetchTime,
        attempts: 1
      };
    }
  } catch (error) {
    const fetchTime = Date.now() - startTime;
    console.error('[ERROR] Lymington current API fallback failed:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      fetchTime,
      attempts: 1
    };
  }
}

/**
 * Parse Lymington V03 API response data
 */
export function parseLymingtonData(data: any): ParseResult {
  const parseStart = Date.now();
  console.log('[INFO] Parsing Lymington weather data...');
  
  try {
    // Initialize weather data (all null for missing data)
    const weatherData: WeatherData = {
      temperature: null, // Lymington is wind-only, no temperature data
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
      location: 'Lymington Starting Platform',
      isValid: false,
      parseTime: 0
    };
    
    // Handle Enhanced API response structure
    if (data && typeof data === 'object' && data.status === 'ok' && data.data && data.data.lastaverage) {
      console.log('[DEBUG] Parsing enhanced API response...');
      const avgData = data.data.lastaverage;
      
      console.log('[DEBUG] Raw avgData:', JSON.stringify(avgData, null, 2));
      
      // Extract wind data (API returns in m/s as per documentation)
      if (typeof avgData.wsa === 'number' && avgData.wsa >= 0) {
        weatherData.windSpeed = avgData.wsa; // Already in m/s
        console.log(`[DEBUG] Average wind speed: ${avgData.wsa} m/s`);
      }
      
      if (typeof avgData.wsh === 'number' && avgData.wsh >= 0) {
        weatherData.windGust = avgData.wsh; // Already in m/s
        console.log(`[DEBUG] Gust speed: ${avgData.wsh} m/s`);
      }
      
      if (typeof avgData.wda === 'number' && avgData.wda >= 0 && avgData.wda < 360) {
        weatherData.windDirection = Math.round(avgData.wda); // Wind Direction Average
        console.log(`[DEBUG] Wind direction: ${avgData.wda}°`);
      }
      
      // Set timestamp and location from response
      weatherData.timestamp = avgData.ts || new Date().toISOString();
      weatherData.location = data.data.display_name || 'Lymington Starting Platform';
      
      console.log(`[DEBUG] Location: ${weatherData.location}, Time: ${weatherData.timestamp}`);
      
      // Mark as valid if we have wind data
      if (weatherData.windSpeed > 0 || weatherData.windDirection >= 0) {
        weatherData.isValid = true;
      }
    }
    // Handle Current API response structure
    else if (data && typeof data === 'object' && data.status === 'ok' && data.data && typeof data.data.wsc === 'number') {
      console.log('[DEBUG] Parsing current API response...');
      
      // Extract current wind data (API returns in m/s as per documentation)
      if (typeof data.data.wsc === 'number' && data.data.wsc >= 0) {
        weatherData.windSpeed = data.data.wsc; // Already in m/s
        weatherData.windGust = null; // Current reading, no gust data available
        console.log(`[DEBUG] Current wind speed: ${data.data.wsc} m/s (no gust data)`);
      }
      
      if (typeof data.data.wdc === 'number' && data.data.wdc >= 0 && data.data.wdc < 360) {
        weatherData.windDirection = Math.round(data.data.wdc); // Wind Direction Current
        console.log(`[DEBUG] Wind direction: ${data.data.wdc}°`);
      }
      
      // Set timestamp and location
      weatherData.timestamp = data.data.ts || new Date().toISOString();
      weatherData.location = data.data.loc_name || 'Lymington Starting Platform';
      
      console.log(`[DEBUG] Location: ${weatherData.location}, Time: ${weatherData.timestamp}`);
      console.log(`[DEBUG] Data delay: ${data.data.delay} minutes`);
    }
    else {
      throw new Error(`Invalid API response structure: ${JSON.stringify(data).substring(0, 100)}`);
    }
    
    const parseTime = Date.now() - parseStart;
    weatherData.parseTime = parseTime;
    
    // Validate that we got some useful wind data (Lymington is wind-focused)
    weatherData.isValid = ((weatherData.windSpeed !== null && weatherData.windSpeed >= 0) && 
                           (weatherData.windDirection !== null && weatherData.windDirection >= 0));
    
    console.log(`[DEBUG] Lymington parse completed in ${parseTime}ms, valid: ${weatherData.isValid}`);
    
    if (!weatherData.isValid) {
      console.warn('[WARNING] No valid wind data found in Lymington response');
      console.log('[DEBUG] Data received:', JSON.stringify(data, null, 2));
    } else {
      const gustStr = weatherData.windGust !== null ? `${weatherData.windGust.toFixed(2)} m/s` : 'n/a';
      console.log(`[SUCCESS] Parsed wind: ${weatherData.windSpeed!.toFixed(2)} m/s, gust: ${gustStr}, dir: ${weatherData.windDirection}°`);
    }
    
    return {
      success: true,
      data: weatherData,
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
