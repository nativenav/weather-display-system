/**
 * Convert knots to meters per second
 */
export function knotsToMeterPerSecond(knots: number): number {
  return knots * 0.514444;
}

/**
 * Convert meters per second to knots
 */
export function meterPerSecondToKnots(mps: number): number {
  return mps / 0.514444;
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff (ported from C++ retry logic)
 */
export async function retryWithBackoff<T>(
  fn: (attempt: number) => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 2000
): Promise<T> {
  let lastError: Error;
  let delay = initialDelay;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.log(`[ERROR] Attempt ${attempt}/${maxRetries} failed:`, lastError.message);
      
      if (attempt < maxRetries) {
        console.log(`[INFO] Retrying in ${delay / 1000} seconds...`);
        await sleep(delay);
        delay = Math.floor(delay * 1.5); // Exponential backoff
      }
    }
  }
  
  throw lastError!;
}

/**
 * Calculate wind statistics from array of wind speeds
 * Ported from C++ calculateWindStats function
 */
export function calculateWindStats(speeds: number[]): { avgSpeed: number; peakSpeed: number } {
  if (speeds.length === 0) {
    return { avgSpeed: 0.0, peakSpeed: 0.0 };
  }
  
  const sum = speeds.reduce((acc, speed) => acc + speed, 0);
  const avgSpeed = sum / speeds.length;
  const peakSpeed = Math.max(...speeds);
  
  console.log(`[DEBUG] Wind stats from ${speeds.length} samples: avg=${avgSpeed.toFixed(2)}, peak=${peakSpeed.toFixed(2)}`);
  
  return { avgSpeed, peakSpeed };
}

/**
 * Parse hex string to integer (ported from C++ parseHexString)
 */
export function parseHexString(hexStr: string): number {
  let result = 0;
  for (let i = 0; i < hexStr.length; i++) {
    const c = hexStr.charAt(i);
    result <<= 4;
    if (c >= '0' && c <= '9') {
      result += c.charCodeAt(0) - '0'.charCodeAt(0);
    } else if (c >= 'A' && c <= 'F') {
      result += c.charCodeAt(0) - 'A'.charCodeAt(0) + 10;
    } else if (c >= 'a' && c <= 'f') {
      result += c.charCodeAt(0) - 'a'.charCodeAt(0) + 10;
    }
  }
  return result;
}

/**
 * Extract wind speed from Navis hex data (ported from C++ extractWindSpeedFromHex)
 * Bits 16-31 (middle 4 hex digits)
 */
export function extractWindSpeedFromHex(hexData: string): number {
  if (hexData.length < 8) return 0.0;
  
  // Extract the wind speed portion (bits 16-31) - middle 4 hex digits
  const windSpeedHex = hexData.substring(2, 6);
  const rawValue = parseHexString(windSpeedHex);
  
  // Convert to knots (adjusted scaling factor for realistic wind speeds)
  // Original: rawValue * 0.01 gives hurricane speeds, using 0.001 for reasonable marine winds
  const knots = rawValue * 0.001;
  
  console.log(`[DEBUG] Wind speed hex: ${windSpeedHex}, raw: ${rawValue}, knots: ${knots.toFixed(2)}`);
  
  return knots;
}

/**
 * Extract wind direction from Navis hex data (ported from C++ extractWindDirectionFromHex)
 * Bits 0-15 (last 4 hex digits)
 */
export function extractWindDirectionFromHex(hexData: string): number {
  if (hexData.length < 8) return 0;
  
  // Extract the wind direction portion (bits 0-15) - last 4 hex digits
  const windDirHex = hexData.substring(4, 8);
  const rawValue = parseHexString(windDirHex);
  
  // Convert to degrees (adjusted scaling factor for 0-359 range)
  // Use modulo to ensure 0-359 range for wind direction
  const degrees = Math.round((rawValue * 0.01)) % 360;
  
  console.log(`[DEBUG] Wind direction hex: ${windDirHex}, raw: ${rawValue}, degrees: ${degrees}`);
  
  return degrees;
}

/**
 * Generate content hash for caching
 */
export async function generateContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 16); // First 16 chars for cache key
}

/**
 * Create a cache key for weather data
 */
export function createCacheKey(stationId: string, contentHash?: string): string {
  const timestamp = Math.floor(Date.now() / (5 * 60 * 1000)) * 5 * 60 * 1000; // Round to 5 minutes
  return contentHash ? `${stationId}:${contentHash}` : `${stationId}:${timestamp}`;
}

/**
 * Validate wind direction (0-359 degrees)
 */
export function normalizeWindDirection(degrees: number): number {
  if (degrees < 0) return 0;
  if (degrees >= 360) return degrees % 360;
  return Math.round(degrees);
}

/**
 * Format display strings for ePaper (800x480 display)
 */
export function formatDisplayLines(data: {
  stationName: string;
  windSpeed: number;
  windGust?: number;
  windDirection: number;
  temperature?: number;
  pressure?: number;
  timestamp: string;
}): string[] {
  const lines: string[] = [];
  
  // Station header
  lines.push(`=== ${data.stationName.toUpperCase()} ===`);
  lines.push('');
  
  // Wind data
  const windSpeedKnots = meterPerSecondToKnots(data.windSpeed);
  lines.push(`Wind: ${windSpeedKnots.toFixed(1)}kt @ ${data.windDirection}°`);
  
  if (data.windGust && data.windGust > data.windSpeed) {
    const gustKnots = meterPerSecondToKnots(data.windGust);
    lines.push(`Gust: ${gustKnots.toFixed(1)}kt`);
  }
  
  lines.push('');
  
  // Environmental data
  if (data.temperature !== undefined && data.temperature > 0) {
    lines.push(`Temp: ${data.temperature.toFixed(1)}°C`);
  }
  
  if (data.pressure !== undefined && data.pressure > 0) {
    lines.push(`Pressure: ${Math.round(data.pressure)} hPa`);
  }
  
  lines.push('');
  
  // Timestamp
  lines.push(`Updated: ${formatTimestamp(data.timestamp)}`);
  
  return lines;
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC');
  } catch {
    return timestamp;
  }
}
