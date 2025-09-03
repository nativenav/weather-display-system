#!/usr/bin/env node

// Test script for weather parsers
import { fetchLymingtonWeather, parseLymingtonData } from './src/parsers/lymington.js';
import { fetchSeaviewWeather, parseSeaviewData } from './src/parsers/seaview.js';

async function testLymington() {
  console.log('=== TESTING LYMINGTON ===');
  try {
    const result = await fetchLymingtonWeather();
    console.log('Fetch result:', result.success ? 'SUCCESS' : 'FAILED');
    
    if (result.success && result.data) {
      const parseResult = parseLymingtonData(result.data);
      console.log('Parse result:', parseResult.success ? 'SUCCESS' : 'FAILED');
      if (parseResult.success) {
        const data = parseResult.data;
        console.log(`Wind: ${data.windSpeed.toFixed(2)} m/s, Gust: ${data.windGust.toFixed(2)} m/s, Direction: ${data.windDirection}°`);
        console.log(`Location: ${data.location}, Valid: ${data.isValid}`);
      }
    }
  } catch (error) {
    console.error('Lymington test failed:', error);
  }
  console.log('');
}

async function testSeaview() {
  console.log('=== TESTING SEAVIEW ===');
  try {
    const result = await fetchSeaviewWeather();
    console.log('Fetch result:', result.success ? 'SUCCESS' : 'FAILED');
    
    if (result.success && result.data) {
      const parseResult = parseSeaviewData(result.data);
      console.log('Parse result:', parseResult.success ? 'SUCCESS' : 'FAILED');
      if (parseResult.success) {
        const data = parseResult.data;
        console.log(`Wind: ${data.windSpeed.toFixed(2)} m/s, Gust: ${data.windGust.toFixed(2)} m/s, Direction: ${data.windDirection}°`);
        console.log(`Temperature: ${data.temperature.toFixed(1)}°C, Location: ${data.location}, Valid: ${data.isValid}`);
      }
    }
  } catch (error) {
    console.error('Seaview test failed:', error);
  }
  console.log('');
}

async function main() {
  console.log('Weather Parser Test Tool\n');
  
  await testLymington();
  await testSeaview();
  
  console.log('Testing completed.');
}

main().catch(console.error);
