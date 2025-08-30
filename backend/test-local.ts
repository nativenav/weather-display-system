// Local test with mocked environment
// Run with: npx tsx test-local.ts

import { parseBramblesData } from './src/parsers/brambles.js';
import { formatDisplayLines } from './src/utils/helpers.js';

// Mock KV for local testing
const mockKV = new Map<string, string>();

const mockEnv = {
  WEATHER_CACHE: {
    async get(key: string, options?: { type?: string }) {
      const value = mockKV.get(key);
      if (!value) return null;
      
      if (options?.type === 'json') {
        return JSON.parse(value);
      }
      return value;
    },
    
    async put(key: string, value: string, options?: { expirationTtl?: number }) {
      mockKV.set(key, value);
      console.log(`[MOCK KV] Stored data with key: ${key}, TTL: ${options?.expirationTtl || 'none'}`);
    },
    
    async list() {
      return { keys: Array.from(mockKV.keys()).map(name => ({ name })) };
    }
  },
  ENVIRONMENT: 'development'
};

// Sample HTML data (similar to what Brambles API returns)
const sampleBramblesHTML = `
<table>
  <tr><th colspan="2">Brambles Bank - Bramblemet</th></tr>
  <tr><td>Wind Speed</td><td>15.7 Knots</td></tr>
  <tr><td>Max Gust</td><td>18.2 Knots</td></tr>
  <tr><td>Wind Direction</td><td>245 Degree</td></tr>
  <tr><td>Air Temp</td><td>19.3 C</td></tr>
  <tr><td>Pressure</td><td>1018.6 mBar</td></tr>
  <tr><td>Updated</td><td><div>30/08/2025 09:45:00</div></td></tr>
</table>
`;

async function testParsing() {
  console.log('🧪 Testing Brambles Parser with Mock Environment...\n');

  // Test 1: Parse HTML data
  console.log('1️⃣ Testing HTML parsing...');
  const parseResult = parseBramblesData(sampleBramblesHTML);

  if (parseResult.success && parseResult.data) {
    const data = parseResult.data;
    
    console.log('✅ Parsing successful!');
    console.log(`⏱️  Parse time: ${parseResult.parseTime}ms`);
    console.log(`✔️  Data valid: ${data.isValid}\n`);
    
    console.log('📊 Parsed weather data:');
    console.log(`   Location: ${data.location}`);
    console.log(`   Wind: ${(data.windSpeed / 0.514444).toFixed(1)} knots (${data.windSpeed.toFixed(1)} m/s) @ ${data.windDirection}°`);
    console.log(`   Gust: ${(data.windGust / 0.514444).toFixed(1)} knots (${data.windGust.toFixed(1)} m/s)`);
    console.log(`   Temperature: ${data.temperature.toFixed(1)}°C`);
    console.log(`   Pressure: ${data.pressure.toFixed(1)} hPa`);
    console.log(`   Timestamp: ${data.timestamp}\n`);
    
    // Test 2: Create API response format
    console.log('2️⃣ Testing API response format...');
    const apiResponse = {
      schema: "weather.v1" as const,
      stationId: "brambles",
      timestamp: new Date().toISOString(),
      data: {
        wind: {
          avg: data.windSpeed,
          gust: data.windGust > 0 ? data.windGust : undefined,
          direction: data.windDirection,
          unit: "mps" as const
        },
        temperature: {
          air: data.temperature,
          unit: "celsius" as const
        },
        pressure: {
          value: data.pressure,
          unit: "hPa" as const
        }
      },
      ttl: 300
    };
    
    console.log('✅ API Response created:');
    console.log(JSON.stringify(apiResponse, null, 2));
    console.log();
    
    // Test 3: Test caching
    console.log('3️⃣ Testing KV caching...');
    const cacheKey = `brambles:${Math.floor(Date.now() / (5 * 60 * 1000)) * 5 * 60 * 1000}`;
    await mockEnv.WEATHER_CACHE.put(cacheKey, JSON.stringify(apiResponse), {
      expirationTtl: apiResponse.ttl
    });
    
    const cachedData = await mockEnv.WEATHER_CACHE.get(cacheKey, { type: 'json' });
    console.log('✅ Cached data retrieved successfully');
    console.log(`🔑 Cache key: ${cacheKey}`);
    console.log(`📦 Cached station: ${cachedData.stationId}\n`);
    
    // Test 4: Test display formatting
    console.log('4️⃣ Testing display format (for ESP32C3)...');
    const displayLines = formatDisplayLines({
      stationName: 'Brambles Bank',
      windSpeed: data.windSpeed,
      windGust: data.windGust,
      windDirection: data.windDirection,
      temperature: data.temperature,
      pressure: data.pressure,
      timestamp: data.timestamp
    });
    
    console.log('📱 ESP32C3 Display Output:');
    displayLines.forEach((line, index) => console.log(`   ${(index + 1).toString().padStart(2, ' ')}: ${line}`));
    console.log();
    
    console.log('🎉 All tests passed successfully!');
    console.log('Ready for deployment to Cloudflare Workers! 🚀');
    
  } else {
    console.error('❌ Parsing failed:', parseResult.error);
    process.exit(1);
  }
}

// Run the test
testParsing().catch(console.error);
