import * as cheerio from 'cheerio';
import { WeatherData, ParseResult, FetchResult } from '../types/weather.js';
import { knotsToMeterPerSecond, retryWithBackoff } from '../utils/helpers.js';

const BRAMBLES_URL = "https://www.southamptonvts.co.uk/BackgroundSite/Ajax/LoadXmlFileWithTransform?xmlFilePath=D%3A%5Cftp%5Csouthampton%5CBramble.xml&xslFilePath=D%3A%5Cwwwroot%5CCMS_Southampton%5Ccontent%5Cfiles%5Cassets%5CSotonSnapshotmetBramble.xsl&w=51";

const BRAMBLES_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; WeatherStation/1.0)',
  'Accept': 'text/html,*/*',
  'Referer': 'https://www.southamptonvts.co.uk/Live_Information/Tides_and_Weather/'
};

/**
 * Fetch Brambles Bank weather data with retry logic
 */
export async function fetchBramblesWeather(): Promise<FetchResult> {
  const startTime = Date.now();
  
  const fetchAttempt = async (attempt: number): Promise<Response> => {
    console.log(`[INFO] Fetching Brambles weather data (attempt ${attempt})...`);
    
    const response = await fetch(BRAMBLES_URL, {
      method: 'GET',
      headers: BRAMBLES_HEADERS,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  };
  
  try {
    const response = await retryWithBackoff(fetchAttempt, 3, 2000);
    const htmlData = await response.text();
    const fetchTime = Date.now() - startTime;
    
    console.log(`[DEBUG] Received ${htmlData.length} bytes in ${fetchTime}ms`);
    
    return {
      success: true,
      data: htmlData,
      status: response.status,
      fetchTime,
      attempts: 1 // retryWithBackoff handles attempt counting
    };
  } catch (error) {
    const fetchTime = Date.now() - startTime;
    console.error('[ERROR] Failed to fetch Brambles data:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      fetchTime,
      attempts: 3
    };
  }
}

/**
 * Parse Brambles Bank HTML data (ported from C++ parseBramblesData function)
 */
export function parseBramblesData(htmlData: string): ParseResult {
  const parseStart = Date.now();
  console.log('[INFO] Parsing Brambles weather data...');
  
  try {
    // Initialize weather data (all null for missing data)
    const data: WeatherData = {
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
      location: 'Brambles Bank',
      isValid: false,
      parseTime: 0
    };
    
    // Load HTML with Cheerio (equivalent to extractFloatFromTableCell/extractStringFromTableCell)
    const $ = cheerio.load(htmlData);
    
    // Extract wind speed in knots: <td>Wind Speed</td><td>15.7 Knots</td>
    const windSpeedKnots = extractFloatFromTableCell($, 'Wind Speed');
    if (windSpeedKnots > 0) {
      data.windSpeed = knotsToMeterPerSecond(windSpeedKnots);
      console.log(`[DEBUG] Wind Speed: ${windSpeedKnots.toFixed(1)} knots = ${data.windSpeed.toFixed(1)} m/s`);
    } else {
      console.log('[DEBUG] Wind Speed: n/a');
    }
    
    // Extract wind gust in knots: <td>Max Gust</td><td>6.1 Knots</td>
    const windGustKnots = extractFloatFromTableCell($, 'Max Gust');
    if (windGustKnots > 0) {
      data.windGust = knotsToMeterPerSecond(windGustKnots);
      console.log(`[DEBUG] Wind Gust: ${windGustKnots.toFixed(1)} knots = ${data.windGust.toFixed(1)} m/s`);
    } else {
      console.log('[DEBUG] Wind Gust: n/a');
    }
    
    // Extract wind direction in degrees: <td>Wind Direction</td><td>144 Degree</td>
    data.windDirection = Math.round(extractFloatFromTableCell($, 'Wind Direction'));
    console.log(`[DEBUG] Wind Direction: ${data.windDirection} degrees`);
    
    // Extract air temperature: <td>Air Temp</td><td>19.9 C</td>
    const tempValue = extractFloatFromTableCell($, 'Air Temp');
    if (tempValue !== 0.0) {
      data.temperature = tempValue;
      console.log(`[DEBUG] Temperature: ${data.temperature.toFixed(1)}°C`);
    } else {
      console.log('[DEBUG] Temperature: n/a');
    }
    
    // Extract pressure in mBar: <td>Pressure</td><td>1017.6 mBar</td>
    const pressureValue = extractFloatFromTableCell($, 'Pressure');
    if (pressureValue !== 0.0) {
      data.pressure = pressureValue;
      console.log(`[DEBUG] Pressure: ${data.pressure.toFixed(1)} mBar (${data.pressure.toFixed(1)} hPa)`);
    } else {
      console.log('[DEBUG] Pressure: n/a');
    }
    
    // Extract timestamp: <td>Updated</td><td>18/08/2025 18:13:00</td>
    const timestamp = extractStringFromTableCell($, 'Updated');
    if (timestamp.length > 0) {
      data.timestamp = ensureGMTTimestamp(timestamp);
      console.log(`[DEBUG] Timestamp: ${timestamp}`);
    } else {
      console.log('[DEBUG] Timestamp: n/a');
    }
    
    // Calculate parse time and validity (matching C++ logic)
    const parseTime = Date.now() - parseStart;
    data.parseTime = parseTime;
    data.isValid = ((data.windSpeed !== null && data.windSpeed > 0) || 
                    (data.windDirection !== null && data.windDirection >= 0) || 
                    (data.temperature !== null && data.temperature > -50));
    
    console.log(`[DEBUG] Parse completed in ${parseTime}ms, valid: ${data.isValid}`);
    
    return {
      success: true,
      data,
      parseTime
    };
    
  } catch (error) {
    const parseTime = Date.now() - parseStart;
    console.error('[ERROR] Brambles parsing failed:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown parsing error',
      parseTime
    };
  }
}

/**
 * Extract float value from HTML table cell (ported from C++ extractFloatFromTableCell)
 * Finds: <td>Label</td><td>Value Units</td>
 */
function extractFloatFromTableCell($: cheerio.CheerioAPI, label: string): number {
  try {
    // Find the label cell
    const labelCell = $(`td:contains("${label}")`).first();
    if (labelCell.length === 0) {
      console.log(`[DEBUG] Label '${label}' not found in HTML table`);
      return 0.0;
    }
    
    // Find the next td sibling (should contain the value)
    const valueCell = labelCell.next('td');
    if (valueCell.length === 0) {
      console.log(`[DEBUG] Value cell not found after label '${label}'`);
      return 0.0;
    }
    
    const valueText = valueCell.text().trim();
    
    // Extract numeric value (first token before space)
    const spaceIndex = valueText.indexOf(' ');
    const numberStr = spaceIndex > 0 ? valueText.substring(0, spaceIndex) : valueText;
    
    const value = parseFloat(numberStr);
    console.log(`[DEBUG] Extracted float for '${label}': '${numberStr}' from cell '${valueText}'`);
    
    return isNaN(value) ? 0.0 : value;
  } catch (error) {
    console.error(`[ERROR] Error extracting float for '${label}':`, error);
    return 0.0;
  }
}

/**
 * Extract string value from HTML table cell (ported from C++ extractStringFromTableCell)
 */
function extractStringFromTableCell($: cheerio.CheerioAPI, label: string): string {
  try {
    // Find the label cell
    const labelCell = $(`td:contains("${label}")`).first();
    if (labelCell.length === 0) {
      console.log(`[DEBUG] Label '${label}' not found in HTML table`);
      return '';
    }
    
    // Find the next td sibling (should contain the value)
    const valueCell = labelCell.next('td');
    if (valueCell.length === 0) {
      console.log(`[DEBUG] Value cell not found after label '${label}'`);
      return '';
    }
    
    let valueText = valueCell.text().trim();
    
    // Check for embedded div (like timestamp div)
    const divContent = valueCell.find('div').first();
    if (divContent.length > 0) {
      const divText = divContent.text().trim();
      if (divText.length > 0) {
        valueText = divText;
        console.log(`[DEBUG] Extracted string from div for '${label}': '${divText}'`);
      }
    }
    
    console.log(`[DEBUG] Extracted string for '${label}': '${valueText}'`);
    return valueText;
  } catch (error) {
    console.error(`[ERROR] Error extracting string for '${label}':`, error);
    return '';
  }
}

/**
 * Convert timestamp to GMT indication if needed (ported from C++ ensureGMTTimestamp)
 */
function ensureGMTTimestamp(timestamp: string): string {
  if (timestamp.length === 0 || timestamp === 'Live data') {
    return new Date().toISOString();
  }
  
  // If timestamp doesn't end with Z or contain GMT/UTC, assume it needs conversion indication
  if (!timestamp.endsWith('Z') && 
      timestamp.indexOf('GMT') === -1 && 
      timestamp.indexOf('UTC') === -1) {
    return `${timestamp} GMT`;
  }
  
  return timestamp;
}
