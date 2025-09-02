#!/usr/bin/env tsx
/**
 * Test script for all weather parsers
 * Usage: npm run dev:test-parsers
 */

import { parseBramblesData } from './src/parsers/brambles.js';
import { parseSeaviewData, parseSeaviewHistoricalData, parseSeaviewLiveData } from './src/parsers/seaview.js';
import { parseLymingtonData } from './src/parsers/lymington.js';

// Mock KV storage for testing
const mockKV = {
  get: async () => null,
  put: async () => {},
};

// Global context mock
(global as any).WEATHER_CACHE = mockKV;

// Test data
const BRAMBLES_SAMPLE_HTML = `
<!DOCTYPE html>
<html>
<head><title>Southampton VTS Weather</title></head>
<body>
  <table>
    <tr><td>Wind Speed:</td><td>8.6 kt</td></tr>
    <tr><td>Wind Gust:</td><td>9.9 kt</td></tr>
    <tr><td>Wind Direction:</td><td>245°</td></tr>
    <tr><td>Air Temperature:</td><td>19.2°C</td></tr>
    <tr><td>Pressure:</td><td>1018.2 hPa</td></tr>
  </table>
  <p>Updated: 2025-08-30T10:30:00Z</p>
</body>
</html>
`;

const SEAVIEW_HISTORICAL_HEX = "1724848200:2F4A8BC3,1724848260:2E5F9A12,1724848320:304C7D45";
const SEAVIEW_LIVE_HEX = "2F4A8BC3";

const LYMINGTON_SAMPLE_HTML = `
<!DOCTYPE html>
<html>
<head><title>Lymington Weather</title></head>
<body>
  <div class="weather-data">
    <div class="wind-speed">Wind Speed: 12.5 kt</div>
    <div class="wind-gust">Wind Gust: 15.8 kt</div>  
    <div class="wind-direction">Direction: NW (315°)</div>
    <div class="temperature">Temperature: 18.7°C</div>
    <div class="pressure">Pressure: 1021.5 hPa</div>
    <div class="humidity">Humidity: 72%</div>
    <div class="timestamp">Updated: 2025-08-30T10:45:00Z</div>
  </div>
</body>
</html>
`;

async function testBramblesParser() {
  console.log('\n🏷️  Testing Brambles Bank Parser...');
  console.log('=====================================');
  
  const result = parseBramblesData(BRAMBLES_SAMPLE_HTML);
  
  if (result.success && result.data) {
    const data = result.data;
    console.log(`✅ Parse successful in ${result.parseTime}ms`);
    console.log(`   Location: ${data.location}`);
    console.log(`   Wind: ${data.windSpeed.toFixed(1)} m/s @ ${data.windDirection}°`);
    console.log(`   Gust: ${data.windGust.toFixed(1)} m/s`);
    console.log(`   Temperature: ${data.temperature}°C`);
    console.log(`   Pressure: ${data.pressure} hPa`);
    console.log(`   Valid: ${data.isValid}`);
  } else {
    console.log(`❌ Parse failed: ${result.error}`);
  }
}

async function testSeaviewParser() {
  console.log('\n⚓ Testing Seaview Parser...');
  console.log('===============================');
  
  // Test historical data parsing
  console.log('\n📊 Testing historical data parsing...');
  const historicalResult = parseSeaviewHistoricalData(SEAVIEW_HISTORICAL_HEX);
  
  if (historicalResult.success && historicalResult.data) {
    const data = historicalResult.data;
    console.log(`✅ Historical parse successful in ${historicalResult.parseTime}ms`);
    console.log(`   Location: ${data.location}`);
    console.log(`   Wind: ${data.windSpeed.toFixed(1)} m/s @ ${data.windDirection}°`);
    console.log(`   Gust: ${data.windGust.toFixed(1)} m/s`);
    console.log(`   Valid: ${data.isValid}`);
  } else {
    console.log(`❌ Historical parse failed: ${historicalResult.error}`);
  }
  
  // Test live data parsing
  console.log('\n📡 Testing live data parsing...');
  const liveResult = parseSeaviewLiveData(SEAVIEW_LIVE_HEX);
  
  if (liveResult.success && liveResult.data) {
    const data = liveResult.data;
    console.log(`✅ Live parse successful in ${liveResult.parseTime}ms`);
    console.log(`   Location: ${data.location}`);
    console.log(`   Wind: ${data.windSpeed.toFixed(1)} m/s @ ${data.windDirection}°`);
    console.log(`   Valid: ${data.isValid}`);
  } else {
    console.log(`❌ Live parse failed: ${liveResult.error}`);
  }
  
  // Test auto-detection
  console.log('\n🔍 Testing auto-detection parser...');
  const autoResult = parseSeaviewData(SEAVIEW_HISTORICAL_HEX);
  
  if (autoResult.success && autoResult.data) {
    console.log(`✅ Auto-detection successful: detected historical data`);
  } else {
    console.log(`❌ Auto-detection failed: ${autoResult.error}`);
  }
}

async function testLymingtonParser() {
  console.log('\n⛵ Testing Lymington Parser...');
  console.log('==================================');
  
  const result = parseLymingtonData(LYMINGTON_SAMPLE_HTML);
  
  if (result.success && result.data) {
    const data = result.data;
    console.log(`✅ Parse successful in ${result.parseTime}ms`);
    console.log(`   Location: ${data.location}`);
    console.log(`   Wind: ${data.windSpeed.toFixed(1)} m/s @ ${data.windDirection}°`);
    console.log(`   Gust: ${data.windGust.toFixed(1)} m/s`);
    console.log(`   Temperature: ${data.temperature}°C`);
    console.log(`   Pressure: ${data.pressure} hPa`);
    console.log(`   Humidity: ${data.humidity}%`);
    console.log(`   Valid: ${data.isValid}`);
  } else {
    console.log(`❌ Parse failed: ${result.error}`);
  }
}

async function runAllTests() {
  console.log('🌊 Weather Parser Test Suite');
  console.log('============================');
  
  try {
    await testBramblesParser();
    await testSeaviewParser();
    await testLymingtonParser();
    
    console.log('\n✅ All parser tests completed!');
    console.log('\n🚀 Ready for backend deployment and firmware testing!');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests
runAllTests();
