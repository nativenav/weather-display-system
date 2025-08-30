import { fetchBramblesWeather, parseBramblesData } from './parsers/brambles.js';
import { WeatherResponse, WeatherData, Env } from './types/weather.js';
import { formatDisplayLines, createCacheKey, generateContentHash } from './utils/helpers.js';

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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    try {
      // Route API requests
      if (path.startsWith('/api/v1/weather/')) {
        return await handleWeatherRequest(request, env, ctx, corsHeaders);
      } else if (path === '/api/v1/stations') {
        return await handleStationsRequest(corsHeaders);
      } else if (path === '/api/v1/collect' && request.method === 'POST') {
        return await handleCollectRequest(env, ctx, corsHeaders);
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
    const stations = ['brambles']; // Add 'seaview', 'lymington' when parsers are ready
    
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
  const supportedStations = ['brambles']; // Add others as we implement them
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
    // Try to get cached data first
    const cacheKey = createCacheKey(stationId);
    const cachedData = await env.WEATHER_CACHE.get(cacheKey, { type: 'json' });
    
    let weatherData: WeatherResponse;
    
    if (cachedData) {
      console.log(`[INFO] Serving cached data for ${stationId}`);
      weatherData = cachedData as WeatherResponse;
    } else {
      console.log(`[INFO] No cached data for ${stationId}, fetching fresh`);
      const freshData = await collectStationData(stationId, env);
      if (!freshData) {
        throw new Error('Failed to collect fresh data');
      }
      weatherData = freshData;
    }
    
    // Return display format for ESP32C3 clients
    if (format === 'display') {
      const displayLines = formatDisplayLines({
        stationName: weatherData.stationId,
        windSpeed: weatherData.data.wind.avg,
        windGust: weatherData.data.wind.gust,
        windDirection: weatherData.data.wind.direction,
        temperature: weatherData.data.temperature?.air,
        pressure: weatherData.data.pressure?.value,
        timestamp: weatherData.timestamp
      });
      
      return new Response(displayLines.join('\n'), {
        headers: {
          'Content-Type': 'text/plain',
          'Cache-Control': 'public, max-age=300', // 5 minutes
          ...corsHeaders
        }
      });
    }
    
    // Return JSON format
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
    }
    // Add other stations as we implement them
  ];
  
  return new Response(JSON.stringify({ stations }, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
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
  
  const stations = ['brambles']; // Add others as we implement them
  
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
    }
    // Add other station parsers here as we implement them
    
    if (!weatherData || !weatherData.isValid) {
      console.error(`[ERROR] No valid data collected from ${stationId}`);
      return null;
    }
    
    // Convert to standardized response format (matching our schema v1)
    const response: WeatherResponse = {
      schema: "weather.v1",
      stationId,
      timestamp: new Date().toISOString(),
      data: {
        wind: {
          avg: weatherData.windSpeed,
          gust: weatherData.windGust > 0 ? weatherData.windGust : undefined,
          direction: weatherData.windDirection,
          unit: "mps"
        }
      },
      ttl: 300 // 5 minutes
    };
    
    // Add optional data if available
    if (weatherData.temperature > 0) {
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
