import { fetchBramblesWeather, parseBramblesData } from './parsers/brambles.js';
import { fetchSeaviewWeather, parseSeaviewData } from './parsers/seaview.js';
import { fetchLymingtonWeather, parseLymingtonData } from './parsers/lymington.js';
import { parsePioupiou521 } from './parsers/pioupiou.js';
import { parseWindbird1702, parseWindbird1724 } from './parsers/windbird.js';
import { WeatherResponse, RegionWeatherResponse, WeatherData, Env } from './types/weather.js';
import { formatDisplayLines, createCacheKey, generateContentHash, convertWindSpeedForRegion } from './utils/helpers.js';

// Device management imports
import { DeviceInfo, DeviceRegistrationResponse, DeviceNotFoundError, InvalidMacAddressError } from './types/devices.js';
import { getAllRegions, getRegion, getDefaultStation, DEFAULT_REGION, getRegionForStation } from './config/regions.js';
import { 
  normalizeDeviceId, 
  formatMacAddress, 
  validateMacAddress, 
  getDevice, 
  saveDevice, 
  createNewDevice, 
  updateDeviceActivity,
  setDeviceIdentifyFlag,
  clearDeviceIdentifyFlag,
  extractDeviceInfo,
  getAllDevices 
} from './utils/devices.js';

// Legacy interfaces (keeping for compatibility)
interface APIKeyInfo {
  keyId: string;
  name: string;
  key: string;
  deviceId?: string;
  createdAt: string;
  lastUsed: string;
  requestCount: number;
  rateLimit: number; // requests per hour
  isActive: boolean;
}

// ===============================================================================
// PARSER COMPATIBILITY WRAPPERS
// ===============================================================================

/**
 * Fetch Prarion weather data (Pioupiou 521)
 */
async function fetchPrarionWeather() {
  const PIOUPIOU_URL = 'https://api.pioupiou.fr/v1/live/521';
  
  try {
    const response = await fetch(PIOUPIOU_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    return {
      success: true,
      data,
      fetchTime: 0
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      fetchTime: 0
    };
  }
}

/**
 * Parse Prarion weather data
 */
function parsePrarionData(data: any) {
  return parsePioupiou521(data);
}

/**
 * Fetch Tête de Balme weather data (Windbird 1702)
 */
async function fetchTeteDeBalmeWeather() {
  const WINDBIRD_URL = 'https://api.windbird.fr/api/v1/stations/1702/data';
  
  try {
    const response = await fetch(WINDBIRD_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    return {
      success: true,
      data,
      fetchTime: 0
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      fetchTime: 0
    };
  }
}

/**
 * Parse Tête de Balme weather data
 */
function parseTeteDeBalmeData(data: any) {
  return parseWindbird1702(data);
}

/**
 * Fetch Planpraz weather data (Windbird 1724)
 */
async function fetchPlanprazWeather() {
  const WINDBIRD_URL = 'https://api.windbird.fr/api/v1/stations/1724/data';
  
  try {
    const response = await fetch(WINDBIRD_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    return {
      success: true,
      data,
      fetchTime: 0
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      fetchTime: 0
    };
  }
}

/**
 * Parse Planpraz weather data
 */
function parsePlanprazData(data: any) {
  return parseWindbird1724(data);
}

/**
 * Main Worker request handler
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // CORS headers for all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Device-MAC, X-Firmware-Version',
    };
    
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    try {
      // Route API requests
      if (path.startsWith('/api/v1/weather/region/')) {
        return await handleRegionWeatherRequest(request, env, ctx, corsHeaders);
      } else if (path.startsWith('/api/v1/weather/')) {
        return await handleWeatherRequest(request, env, ctx, corsHeaders);
      } else if (path === '/api/v1/stations') {
        return await handleStationsRequest(corsHeaders);
      } else if (path === '/api/v1/regions') {
        return await handleRegionsRequest(corsHeaders);
      } else if (path === '/api/v1/devices' && request.method === 'GET') {
        return await handleGetDevicesRequest(env, corsHeaders);
      } else if (path === '/api/v1/devices' && request.method === 'POST') {
        return await handleCreateDeviceRequest(request, env, corsHeaders);
      } else if (path.startsWith('/api/v1/devices/') && request.method === 'GET') {
        return await handleGetDeviceRequest(request, env, corsHeaders);
      } else if (path.startsWith('/api/v1/devices/') && request.method === 'PATCH') {
        return await handleUpdateDeviceRequest(request, env, corsHeaders);
      } else if (path.startsWith('/api/v1/devices/') && path.endsWith('/identify') && request.method === 'POST') {
        return await handleIdentifyDeviceRequest(request, env, corsHeaders);
      } else if (path.startsWith('/api/v1/devices/') && path.endsWith('/heartbeat') && request.method === 'POST') {
        return await handleHeartbeatRequest(request, env, corsHeaders);
      } else if (path === '/api/v1/collect' && request.method === 'POST') {
        return await handleCollectRequest(env, ctx, corsHeaders);
      } else if (path === '/api/v1/config' && request.method === 'GET') {
        return await handleGetConfigRequest(corsHeaders);
      } else if (path === '/api/v1/config' && request.method === 'POST') {
        return await handleUpdateConfigRequest(request, env, corsHeaders);
      } else if (path === '/' || path === '/health') {
        return await handleHealthRequest(corsHeaders);
      } else {
        return new Response('Not Found', { 
          status: 404, 
          headers: corsHeaders 
        });
      }
    } catch (error) {
      console.error('[ERROR] Worker request failed:', error);
      return new Response(JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  },

  /**
   * Cron trigger handler for periodic weather data collection
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('[INFO] Cron trigger executed:', event.cron);
    
    // Collect weather data from all stations
    const stations = ['brambles', 'seaview', 'lymington', 'prarion', 'tetedebalme', 'planpraz']; // All parsers ready
    
    for (const stationId of stations) {
      try {
        console.log(`[INFO] Collecting data for station: ${stationId}`);
        await collectStationData(stationId, env);
      } catch (error) {
        console.error(`[ERROR] Failed to collect data for ${stationId}:`, error);
      }
    }
    
    console.log('[INFO] Cron collection completed');
  },
};

/**
 * Handle weather API requests: GET /api/v1/weather/{station}
 * Also handles automatic device registration when mac parameter is provided
 */
async function handleWeatherRequest(
  request: Request, 
  env: Env, 
  ctx: ExecutionContext,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const stationId = pathParts[4]; // /api/v1/weather/{station}
  const format = url.searchParams.get('format'); // ?format=display
  const macParam = url.searchParams.get('mac'); // ?mac=deviceid for auto-registration
  
  if (!stationId) {
    return new Response(JSON.stringify({
      error: 'Bad Request',
      message: 'Station ID is required'
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
  
  // Check if station is supported
  const supportedStations = ['brambles', 'seaview', 'lymington', 'prarion', 'tetedebalme', 'planpraz']; // All stations supported
  if (!supportedStations.includes(stationId)) {
    return new Response(JSON.stringify({
      error: 'Not Found',
      message: `Station '${stationId}' not found. Supported: ${supportedStations.join(', ')}`
    }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
  
  try {
    // Handle device auto-registration if MAC parameter provided
    let deviceRegistrationResponse: DeviceRegistrationResponse | null = null;
    let device: DeviceInfo | null = null;
    
    if (macParam) {
      const deviceId = normalizeDeviceId(macParam);
      
      // Check if device exists
      device = await getDevice(deviceId, env);
      
      if (!device) {
        // Auto-register new device
        console.log(`[INFO] Auto-registering new device: ${deviceId}`);
        
        const deviceInfo = extractDeviceInfo(request);
        const macAddress = formatMacAddress(deviceId);
        
        // Determine region from station (simplistic approach)
        const region = ['prarion', 'tetedebalme', 'planpraz'].includes(stationId) ? 'chamonix' : 'solent';
        
        device = createNewDevice(
          deviceId,
          macAddress,
          region,
          undefined, // Auto-generated nickname
          deviceInfo.userAgent,
          deviceInfo.firmware,
          deviceInfo.ipAddress
        );
        
        await saveDevice(device, env);
        
        deviceRegistrationResponse = {
          success: true,
          deviceId: device.deviceId,
          nickname: device.nickname,
          regionId: device.regionId,
          message: 'Device auto-registered successfully',
          isNewDevice: true
        };
        
        console.log(`[INFO] New device auto-registered: ${deviceId} -> ${device.regionId}`);
      } else {
        // Update existing device activity
        const deviceInfo = extractDeviceInfo(request);
        const updatedDevice = updateDeviceActivity(
          device,
          deviceInfo.ipAddress,
          deviceInfo.userAgent
        );
        
        await saveDevice(updatedDevice, env);
        device = updatedDevice;
        
        console.log(`[INFO] Device activity updated: ${deviceId}`);
      }
      
      // Note: Since we're now using regions, individual station requests are deprecated
      // This handler maintains backward compatibility but devices should use region endpoints
      console.log(`[INFO] Device ${deviceId} assigned to region ${device.regionId} requesting individual station ${stationId}`);
    }
    
    // Use the requested station (maintaining backward compatibility)
    const targetStationId = stationId;
    
    // Try to get cached data first
    const cacheKey = createCacheKey(targetStationId);
    const cachedData = await env.WEATHER_CACHE.get(cacheKey, { type: 'json' });
    
    let weatherData: WeatherResponse;
    
    if (cachedData) {
      console.log(`[INFO] Serving cached data for ${targetStationId}`);
      weatherData = cachedData as WeatherResponse;
    } else {
      console.log(`[INFO] No cached data for ${targetStationId}, fetching fresh`);
      const freshData = await collectStationData(targetStationId, env);
      if (!freshData) {
        throw new Error('Failed to collect fresh data');
      }
      weatherData = freshData;
    }
    
    // Return display format for ESP32C3 clients
    if (format === 'display') {
      // Detect region from station ID for proper unit conversion
      const region = getRegionForStation(targetStationId);
      
      const displayLines = formatDisplayLines({
        stationName: weatherData.stationId,
        windSpeed: weatherData.data.wind.avg,
        windGust: weatherData.data.wind.gust,
        windDirection: weatherData.data.wind.direction,
        temperature: weatherData.data.temperature?.air,
        pressure: weatherData.data.pressure?.value,
        timestamp: weatherData.timestamp
      }, region || undefined);
      
      return new Response(displayLines.join('\n'), {
        headers: {
          'Content-Type': 'text/plain',
          'Cache-Control': 'public, max-age=300', // 5 minutes
          ...corsHeaders
        }
      });
    }
    
    // For device requests, enhance the response with device-specific data
    if (device) {
      const deviceResponse = {
        ...weatherData,
        // Add device-specific fields
        identify: device.identifyFlag || false,
        deviceRegistration: deviceRegistrationResponse
      };
      
      // Clear the identify flag after sending it
      if (device.identifyFlag) {
        await clearDeviceIdentifyFlag(device.deviceId, env);
      }
      
      // Return device-enhanced response
      const statusCode = deviceRegistrationResponse ? 201 : 200;
      return new Response(JSON.stringify(deviceResponse, null, 2), {
        status: statusCode,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300', // 5 minutes
          ...corsHeaders
        }
      });
    }
    
    // Return standard JSON format for non-device requests
    return new Response(JSON.stringify(weatherData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // 5 minutes
        ...corsHeaders
      }
    });
    
  } catch (error) {
    console.error(`[ERROR] Weather request failed for ${stationId}:`, error);
    return new Response(JSON.stringify({
      error: 'Service Unavailable',
      message: `Unable to fetch weather data for ${stationId}`,
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

/**
 * Handle stations list request: GET /api/v1/stations
 */
async function handleStationsRequest(corsHeaders: Record<string, string>): Promise<Response> {
  const stations = [
    {
      id: 'brambles',
      name: 'Brambles Bank',
      location: 'Solent, UK',
      description: 'Southampton VTS marine weather station',
      refreshInterval: 5, // minutes
      status: 'active'
    },
    {
      id: 'seaview',
      name: 'Seaview',
      location: 'Isle of Wight, UK',
      description: 'Navis live marine weather data with enhanced gust calculation',
      refreshInterval: 2, // minutes (most responsive station)
      status: 'active'
    },
    {
      id: 'lymington',
      name: 'Lymington',
      location: 'Hampshire, UK',
      description: 'Lymington Harbour weather station',
      refreshInterval: 5, // minutes
      status: 'active'
    },
    {
      id: 'prarion',
      name: 'Prarion (Les Houches)',
      location: 'Chamonix Valley, France (1,865m)',
      description: 'Wind station, Pioupiou 521, paragliding takeoff',
      refreshInterval: 5, // minutes
      status: 'active'
    },
    {
      id: 'tetedebalme',
      name: 'Tête de Balme',
      location: 'Chamonix Valley, France (2,204m)',
      description: 'Wind station, Windbird 1702, valley information',
      refreshInterval: 5, // minutes
      status: 'active'
    },
    {
      id: 'planpraz',
      name: 'Planpraz',
      location: 'Chamonix Valley, France (1,958m)',
      description: 'Wind station, Windbird 1724, paragliding takeoff',
      refreshInterval: 5, // minutes
      status: 'active'
    }
  ];
  
  return new Response(JSON.stringify({ stations }, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}

/**
 * Handle region weather API requests: GET /api/v1/weather/region/{region}
 * Returns data for all 3 stations in the region in display order
 */
async function handleRegionWeatherRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const regionId = pathParts[5]; // /api/v1/weather/region/{region}
  const macParam = url.searchParams.get('mac'); // ?mac=deviceid for auto-registration
  
  if (!regionId) {
    return new Response(JSON.stringify({
      error: 'Bad Request',
      message: 'Region ID is required'
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
  
  // Check if region is supported
  const regionConfig = getRegion(regionId);
  if (!regionConfig) {
    const availableRegions = getAllRegions().map(r => r.name);
    return new Response(JSON.stringify({
      error: 'Not Found',
      message: `Region '${regionId}' not found. Available: ${availableRegions.join(', ')}`
    }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
  
  try {
    // Handle device auto-registration if MAC parameter provided
    let deviceRegistrationResponse: DeviceRegistrationResponse | null = null;
    let device: DeviceInfo | null = null;
    
    if (macParam) {
      const deviceId = normalizeDeviceId(macParam);
      
      // Check if device exists
      device = await getDevice(deviceId, env);
      
      if (!device) {
        // Auto-register new device
        console.log(`[INFO] Auto-registering new device: ${deviceId}`);
        
        const deviceInfo = extractDeviceInfo(request);
        const macAddress = formatMacAddress(deviceId);
        
        device = createNewDevice(
          deviceId,
          macAddress,
          regionId,
          undefined, // Auto-generated nickname
          deviceInfo.userAgent,
          deviceInfo.firmware,
          deviceInfo.ipAddress
        );
        
        await saveDevice(device, env);
        
        deviceRegistrationResponse = {
          success: true,
          deviceId: device.deviceId,
          nickname: device.nickname,
          regionId: device.regionId,
          message: 'Device auto-registered successfully',
          isNewDevice: true
        };
        
        console.log(`[INFO] New device auto-registered: ${deviceId} -> ${device.regionId}`);
      } else {
        // Update existing device activity
        const deviceInfo = extractDeviceInfo(request);
        const updatedDevice = updateDeviceActivity(
          device,
          deviceInfo.ipAddress,
          deviceInfo.userAgent
        );
        
        await saveDevice(updatedDevice, env);
        device = updatedDevice;
        
        console.log(`[INFO] Device activity updated: ${deviceId}`);
      }
    }
    
    // Determine which region to get data for (use device's assigned region if available)
    const targetRegionId = device?.regionId || regionId;
    const targetRegionConfig = getRegion(targetRegionId);
    
    if (!targetRegionConfig) {
      throw new Error(`Invalid target region: ${targetRegionId}`);
    }
    
    // Collect data from all stations in the region (in correct display order)
    const stationPromises = targetRegionConfig.stations.map(async (stationId) => {
      // Try cache first
      const cacheKey = createCacheKey(stationId);
      const cachedData = await env.WEATHER_CACHE.get(cacheKey, { type: 'json' });
      
      if (cachedData) {
        console.log(`[INFO] Serving cached data for ${stationId}`);
        return cachedData as WeatherResponse;
      } else {
        console.log(`[INFO] Fetching fresh data for ${stationId}`);
        const freshData = await collectStationData(stationId, env);
        if (!freshData) {
          console.warn(`[WARN] No data available for ${stationId}, using placeholder`);
          // Return placeholder data to maintain 3-station structure
          return {
            schema: "weather.v1" as const,
            stationId,
            timestamp: new Date().toISOString(),
            data: {
              wind: {
                avg: 0,
                gust: 0,
                direction: 0,
                unit: "mps" as const
              }
            },
            ttl: 300,
            error: 'No data available'
          };
        }
        return freshData;
      }
    });
    
    // Wait for all station data to be collected
    const stationData = await Promise.all(stationPromises);
    
    // Create region response
    const regionResponse: RegionWeatherResponse = {
      schema: "weather-region.v1",
      regionId: targetRegionId,
      regionName: targetRegionConfig.displayName,
      timestamp: new Date().toISOString(),
      stations: stationData,
      ttl: 300 // 5 minutes
    };
    
    // For device requests, enhance the response with device-specific data
    if (device) {
      const deviceResponse = {
        ...regionResponse,
        // Add device-specific fields
        identify: device.identifyFlag || false,
        deviceRegistration: deviceRegistrationResponse
      };
      
      // Clear the identify flag after sending it
      if (device.identifyFlag) {
        await clearDeviceIdentifyFlag(device.deviceId, env);
      }
      
      // Return device-enhanced response
      const statusCode = deviceRegistrationResponse ? 201 : 200;
      return new Response(JSON.stringify(deviceResponse, null, 2), {
        status: statusCode,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300', // 5 minutes
          ...corsHeaders
        }
      });
    }
    
    // Return standard region response
    return new Response(JSON.stringify(regionResponse, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // 5 minutes
        ...corsHeaders
      }
    });
    
  } catch (error) {
    console.error(`[ERROR] Region weather request failed for ${regionId}:`, error);
    return new Response(JSON.stringify({
      error: 'Service Unavailable',
      message: `Unable to fetch weather data for region ${regionId}`,
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

/**
 * Handle manual collection request: POST /api/v1/collect
 */
async function handleCollectRequest(
  env: Env,
  ctx: ExecutionContext,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const startTime = Date.now();
  const results: Record<string, any> = {};
  
  const stations = ['brambles', 'seaview', 'lymington', 'prarion', 'tetedebalme', 'planpraz']; // All stations available
  
  for (const stationId of stations) {
    try {
      const data = await collectStationData(stationId, env);
      results[stationId] = {
        success: true,
        timestamp: data?.timestamp || new Date().toISOString()
      };
    } catch (error) {
      results[stationId] = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  const totalTime = Date.now() - startTime;
  
  return new Response(JSON.stringify({
    message: 'Collection completed',
    totalTime: `${totalTime}ms`,
    results
  }, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}

/**
 * Handle configuration get request: GET /api/v1/config
 */
async function handleGetConfigRequest(corsHeaders: Record<string, string>): Promise<Response> {
  const config = {
    cronFrequency: '*/5 * * * *', // Default 5 minutes
    stations: {
      brambles: { enabled: true },
      seaview: { enabled: true },
      lymington: { enabled: true },
      prarion: { enabled: true },
      tetedebalme: { enabled: true },
      planpraz: { enabled: true }
    },
    version: '0.1.0',
    lastUpdated: new Date().toISOString()
  };
  
  return new Response(JSON.stringify(config, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}

/**
 * Handle configuration update request: POST /api/v1/config
 */
async function handleUpdateConfigRequest(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const body = await request.json();
    
    // Validate the request body
    if (typeof body !== 'object' || body === null) {
      return new Response(JSON.stringify({
        error: 'Bad Request',
        message: 'Invalid JSON body'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // For now, we'll just log the configuration update
    // In a real implementation, you'd store this in KV storage
    console.log('[INFO] Configuration update requested:', body);
    
    // Respond with the updated configuration
    const updatedConfig = {
      ...body,
      lastUpdated: new Date().toISOString()
    };
    
    return new Response(JSON.stringify({
      message: 'Configuration updated successfully',
      config: updatedConfig
    }, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
    
  } catch (error) {
    console.error('[ERROR] Configuration update failed:', error);
    return new Response(JSON.stringify({
      error: 'Bad Request',
      message: 'Invalid JSON format'
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

/**
 * Handle health check request: GET /health
 */
async function handleHealthRequest(corsHeaders: Record<string, string>): Promise<Response> {
  return new Response(JSON.stringify({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '0.1.0'
  }), {
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}

/**
 * Collect data from a specific weather station and cache it
 */
async function collectStationData(stationId: string, env: Env): Promise<WeatherResponse | null> {
  console.log(`[INFO] Collecting data from ${stationId} station`);
  const startTime = Date.now();
  
  try {
    let weatherData: WeatherData | null = null;
    
    // Route to appropriate parser based on station ID
    if (stationId === 'brambles') {
      const fetchResult = await fetchBramblesWeather();
      if (fetchResult.success && fetchResult.data) {
        const parseResult = parseBramblesData(fetchResult.data);
        if (parseResult.success && parseResult.data) {
          weatherData = parseResult.data;
        }
      }
    } else if (stationId === 'seaview') {
      const fetchResult = await fetchSeaviewWeather();
      if (fetchResult.success && fetchResult.data) {
        const parseResult = parseSeaviewData(fetchResult.data, (fetchResult as any).dataType);
        if (parseResult.success && parseResult.data) {
          weatherData = parseResult.data;
        }
      }
    } else if (stationId === 'lymington') {
      const fetchResult = await fetchLymingtonWeather();
      if (fetchResult.success && fetchResult.data) {
        const parseResult = parseLymingtonData(fetchResult.data);
        if (parseResult.success && parseResult.data) {
          weatherData = parseResult.data;
        }
      }
    } else if (stationId === 'prarion') {
      const fetchResult = await fetchPrarionWeather();
      if (fetchResult.success && fetchResult.data) {
        const parseResult = parsePrarionData(fetchResult.data);
        if (parseResult.success && parseResult.data) {
          weatherData = parseResult.data;
        }
      }
    } else if (stationId === 'tetedebalme') {
      const fetchResult = await fetchTeteDeBalmeWeather();
      if (fetchResult.success && fetchResult.data) {
        const parseResult = parseTeteDeBalmeData(fetchResult.data);
        if (parseResult.success && parseResult.data) {
          weatherData = parseResult.data;
        }
      }
    } else if (stationId === 'planpraz') {
      const fetchResult = await fetchPlanprazWeather();
      if (fetchResult.success && fetchResult.data) {
        const parseResult = parsePlanprazData(fetchResult.data);
        if (parseResult.success && parseResult.data) {
          weatherData = parseResult.data;
        }
      }
    }
    
    if (!weatherData || !weatherData.isValid) {
      console.error(`[ERROR] No valid data collected from ${stationId}`);
      return null;
    }
    
    // Convert to standardized response format (always m/s for JSON)
    const response: WeatherResponse = {
      schema: "weather.v1",
      stationId,
      timestamp: new Date().toISOString(),
      data: {
        wind: {
          avg: weatherData.windSpeed || 0, // Default to 0 if null (TODO: handle better)
          gust: weatherData.windGust || undefined, // Omit if null
          direction: weatherData.windDirection,
          unit: "mps" // Always m/s for JSON endpoints
        }
      },
      ttl: 300 // 5 minutes
    };
    
    // Add optional data if available - show temperature when valid (including zero/negative)
    if (weatherData.temperature !== undefined && 
        weatherData.temperature !== null && 
        !isNaN(weatherData.temperature) &&
        weatherData.temperature >= -60 && 
        weatherData.temperature <= 60) { // Reasonable temperature range
      response.data.temperature = {
        air: weatherData.temperature,
        unit: "celsius"
      };
    }
    
    if (weatherData.pressure > 0) {
      response.data.pressure = {
        value: weatherData.pressure,
        unit: "hPa"
      };
    }
    
    // Cache the data
    const cacheKey = createCacheKey(stationId);
    await env.WEATHER_CACHE.put(cacheKey, JSON.stringify(response), {
      expirationTtl: response.ttl
    });
    
    const totalTime = Date.now() - startTime;
    console.log(`[INFO] Successfully collected and cached data for ${stationId} in ${totalTime}ms`);
    
    return response;
    
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`[ERROR] Failed to collect data from ${stationId} after ${totalTime}ms:`, error);
    return null;
  }
}

// ===============================================================================
// DEVICE MANAGEMENT API HANDLERS
// ===============================================================================

/**
 * Handle regions list request: GET /api/v1/regions
 */
async function handleRegionsRequest(corsHeaders: Record<string, string>): Promise<Response> {
  const regions = getAllRegions();
  
  return new Response(JSON.stringify({ regions }, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}

/**
 * Handle get all devices request: GET /api/v1/devices
 */
async function handleGetDevicesRequest(env: Env, corsHeaders: Record<string, string>): Promise<Response> {
  try {
    const devices = await getAllDevices(env);
    
    return new Response(JSON.stringify({
      devices,
      count: devices.length,
      message: devices.length === 0 ? 'No devices registered yet' : `Found ${devices.length} device(s)`
    }, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
    
  } catch (error) {
    console.error('[ERROR] Failed to get devices:', error);
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: 'Failed to retrieve devices'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

/**
 * Handle create device request: POST /api/v1/devices
 */
async function handleCreateDeviceRequest(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  try {
    const body = await request.json() as any;
    const deviceInfo = extractDeviceInfo(request);
    
    // Get MAC address from header or body
    const macAddress = request.headers.get('X-Device-MAC') || body.macAddress;
    if (!macAddress || !validateMacAddress(macAddress)) {
      return new Response(JSON.stringify({
        error: 'Bad Request',
        message: 'Valid MAC address is required (X-Device-MAC header or macAddress in body)'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    const deviceId = normalizeDeviceId(macAddress);
    
    // Check if device already exists
    const existingDevice = await getDevice(deviceId, env);
    if (existingDevice) {
      return new Response(JSON.stringify({
        error: 'Conflict',
        message: 'Device already exists',
        deviceId
      }), {
        status: 409,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // Create new device
    const region = body.region || DEFAULT_REGION;
    const device = createNewDevice(
      deviceId,
      formatMacAddress(deviceId),
      region,
      body.nickname,
      deviceInfo.userAgent,
      deviceInfo.firmware,
      deviceInfo.ipAddress
    );
    
    await saveDevice(device, env);
    
    const response: DeviceRegistrationResponse = {
      success: true,
      deviceId: device.deviceId,
      nickname: device.nickname,
      regionId: device.regionId,
      message: 'Device registered successfully',
      isNewDevice: true
    };
    
    console.log(`[INFO] New device registered: ${deviceId} -> ${device.regionId}`);
    
    return new Response(JSON.stringify(response, null, 2), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
    
  } catch (error) {
    console.error('[ERROR] Device creation failed:', error);
    return new Response(JSON.stringify({
      error: 'Bad Request',
      message: 'Invalid request format'
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

/**
 * Handle get device request: GET /api/v1/devices/{deviceId}
 */
async function handleGetDeviceRequest(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const deviceId = pathParts[4]; // /api/v1/devices/{deviceId}
  
  if (!deviceId) {
    return new Response(JSON.stringify({
      error: 'Bad Request',
      message: 'Device ID is required'
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
  
  try {
    const device = await getDevice(deviceId, env);
    if (!device) {
      return new Response(JSON.stringify({
        error: 'Not Found',
        message: `Device not found: ${deviceId}`
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    return new Response(JSON.stringify(device, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
    
  } catch (error) {
    console.error(`[ERROR] Get device failed for ${deviceId}:`, error);
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: 'Failed to retrieve device'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

/**
 * Handle update device request: PATCH /api/v1/devices/{deviceId}
 */
async function handleUpdateDeviceRequest(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const deviceId = pathParts[4]; // /api/v1/devices/{deviceId}
  
  if (!deviceId) {
    return new Response(JSON.stringify({
      error: 'Bad Request',
      message: 'Device ID is required'
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
  
  try {
    const body = await request.json() as any;
    const device = await getDevice(deviceId, env);
    
    if (!device) {
      return new Response(JSON.stringify({
        error: 'Not Found',
        message: `Device not found: ${deviceId}`
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    // Update device fields (using regionId for new region-based system)
    const updatedDevice: DeviceInfo = {
      ...device,
      nickname: body.nickname || device.nickname,
      regionId: body.regionId || device.regionId
    };
    
    await saveDevice(updatedDevice, env);
    
    console.log(`[INFO] Device updated: ${deviceId}`);
    
    return new Response(JSON.stringify(updatedDevice, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
    
  } catch (error) {
    console.error(`[ERROR] Update device failed for ${deviceId}:`, error);
    return new Response(JSON.stringify({
      error: 'Bad Request',
      message: 'Invalid request format'
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

/**
 * Handle identify device request: POST /api/v1/devices/{deviceId}/identify
 */
async function handleIdentifyDeviceRequest(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const deviceId = pathParts[4]; // /api/v1/devices/{deviceId}/identify
  
  if (!deviceId) {
    return new Response(JSON.stringify({
      error: 'Bad Request',
      message: 'Device ID is required'
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
  
  try {
    await setDeviceIdentifyFlag(deviceId, env);
    
    console.log(`[INFO] Identify flag set for device: ${deviceId}`);
    
    return new Response(JSON.stringify({
      message: 'Identify request sent to device',
      deviceId,
      timestamp: new Date().toISOString()
    }, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
    
  } catch (error) {
    if (error instanceof DeviceNotFoundError) {
      return new Response(JSON.stringify({
        error: 'Not Found',
        message: error.message
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    console.error(`[ERROR] Identify request failed for ${deviceId}:`, error);
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: 'Failed to send identify request'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

/**
 * Handle heartbeat request: POST /api/v1/devices/{deviceId}/heartbeat
 */
async function handleHeartbeatRequest(
  request: Request,
  env: Env,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const deviceId = pathParts[4]; // /api/v1/devices/{deviceId}/heartbeat
  
  if (!deviceId) {
    return new Response(JSON.stringify({
      error: 'Bad Request',
      message: 'Device ID is required'
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
  
  try {
    const device = await getDevice(deviceId, env);
    if (!device) {
      return new Response(JSON.stringify({
        error: 'Not Found',
        message: `Device not found: ${deviceId}`
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    const deviceInfo = extractDeviceInfo(request);
    const updatedDevice = updateDeviceActivity(
      device,
      deviceInfo.ipAddress,
      deviceInfo.userAgent
    );
    
    await saveDevice(updatedDevice, env);
    
    return new Response(JSON.stringify({
      message: 'Heartbeat received',
      deviceId,
      timestamp: updatedDevice.lastSeen
    }, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
    
  } catch (error) {
    console.error(`[ERROR] Heartbeat failed for ${deviceId}:`, error);
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: 'Failed to process heartbeat'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}
