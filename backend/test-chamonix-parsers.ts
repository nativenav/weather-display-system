#!/usr/bin/env tsx
/**
 * Test script for Chamonix Valley weather parsers
 * Usage: npx tsx test-chamonix-parsers.ts
 */

import { parseChamonixData } from './src/parsers/chamonix.js';
import { parseAiguilleData } from './src/parsers/aiguilledumidi.js';
import { parseLesHouchesData } from './src/parsers/leshouches.js';
import { formatDisplayLines } from './src/utils/helpers.js';
import { readFileSync } from 'fs';

async function testChamonixParser() {
  console.log('\n🏔️  Testing Chamonix Parser (Valley Floor - 1,037m)...');
  console.log('=========================================================');
  
  try {
    // Load sample data
    const sampleData = readFileSync('/Users/nives/Documents/Arduino/weather-display-system/backend/samples/chamonix.json', 'utf8');
    const result = parseChamonixData(sampleData);
    
    if (result.success && result.data) {
      const data = result.data;
      console.log(`✅ Parse successful in ${result.parseTime}ms`);
      console.log(`   Location: ${data.location}`);
      console.log(`   Temperature: ${data.temperature.toFixed(1)}°C`);
      console.log(`   Pressure: ${data.pressure.toFixed(1)} hPa`);
      console.log(`   Humidity: ${data.humidity}%`);
      console.log(`   Wind: ${data.windSpeed.toFixed(1)} m/s @ ${data.windDirection}°`);
      console.log(`   Gust: ${data.windGust.toFixed(1)} m/s`);
      console.log(`   Visibility: ${data.visibility.toFixed(1)} km`);
      console.log(`   Conditions: ${data.conditions}`);
      console.log(`   Valid: ${data.isValid}`);
      
      // Test display formatting
      const displayLines = formatDisplayLines({
        stationName: 'Chamonix',
        windSpeed: data.windSpeed,
        windGust: data.windGust,
        windDirection: data.windDirection,
        temperature: data.temperature,
        pressure: data.pressure,
        timestamp: data.timestamp
      });
      
      console.log(`\\n📱 ESP32C3 Display Output:`);
      displayLines.forEach((line, index) => console.log(`   ${(index + 1).toString().padStart(2, ' ')}: ${line}`));
      
    } else {
      console.log(`❌ Parse failed: ${result.error}`);
    }
  } catch (error) {
    console.log(`❌ Test failed: ${error}`);
  }
}

async function testAiguilleParser() {
  console.log('\\n⛰️  Testing Aiguille du Midi Parser (High Altitude - 3,842m)...');
  console.log('================================================================');
  
  try {
    // Load sample data
    const sampleData = readFileSync('/Users/nives/Documents/Arduino/weather-display-system/backend/samples/aiguilledumidi.json', 'utf8');
    const result = parseAiguilleData(sampleData);
    
    if (result.success && result.data) {
      const data = result.data;
      console.log(`✅ Parse successful in ${result.parseTime}ms`);
      console.log(`   Location: ${data.location}`);
      console.log(`   Temperature: ${data.temperature.toFixed(1)}°C (high altitude)`);
      console.log(`   Pressure: ${data.pressure.toFixed(1)} hPa (reduced at altitude)`);
      console.log(`   Humidity: ${data.humidity}%`);
      console.log(`   Wind: ${data.windSpeed.toFixed(1)} m/s @ ${data.windDirection}° (alpine winds)`);
      console.log(`   Gust: ${data.windGust.toFixed(1)} m/s`);
      console.log(`   Visibility: ${data.visibility.toFixed(1)} km`);
      console.log(`   Conditions: ${data.conditions}`);
      console.log(`   Valid: ${data.isValid}`);
      
      // Test display formatting
      const displayLines = formatDisplayLines({
        stationName: 'Aiguille du Midi',
        windSpeed: data.windSpeed,
        windGust: data.windGust,
        windDirection: data.windDirection,
        temperature: data.temperature,
        pressure: data.pressure,
        timestamp: data.timestamp
      });
      
      console.log(`\\n📱 ESP32C3 Display Output:`);
      displayLines.forEach((line, index) => console.log(`   ${(index + 1).toString().padStart(2, ' ')}: ${line}`));
      
    } else {
      console.log(`❌ Parse failed: ${result.error}`);
    }
  } catch (error) {
    console.log(`❌ Test failed: ${error}`);
  }
}

async function testLesHouchesParser() {
  console.log('\\n🌲 Testing Les Houches Parser (Mid-Elevation - 1,008m)...');
  console.log('==========================================================');
  
  try {
    // Load sample data
    const sampleData = readFileSync('/Users/nives/Documents/Arduino/weather-display-system/backend/samples/leshouches.json', 'utf8');
    const result = parseLesHouchesData(sampleData);
    
    if (result.success && result.data) {
      const data = result.data;
      console.log(`✅ Parse successful in ${result.parseTime}ms`);
      console.log(`   Location: ${data.location}`);
      console.log(`   Temperature: ${data.temperature.toFixed(1)}°C`);
      console.log(`   Pressure: ${data.pressure.toFixed(1)} hPa (mid-elevation)`);
      console.log(`   Humidity: ${data.humidity}%`);
      console.log(`   Wind: ${data.windSpeed.toFixed(1)} m/s @ ${data.windDirection}°`);
      console.log(`   Gust: ${data.windGust.toFixed(1)} m/s`);
      console.log(`   Visibility: ${data.visibility.toFixed(1)} km`);
      console.log(`   Conditions: ${data.conditions}`);
      console.log(`   Valid: ${data.isValid}`);
      
      // Test display formatting
      const displayLines = formatDisplayLines({
        stationName: 'Les Houches',
        windSpeed: data.windSpeed,
        windGust: data.windGust,
        windDirection: data.windDirection,
        temperature: data.temperature,
        pressure: data.pressure,
        timestamp: data.timestamp
      });
      
      console.log(`\\n📱 ESP32C3 Display Output:`);
      displayLines.forEach((line, index) => console.log(`   ${(index + 1).toString().padStart(2, ' ')}: ${line}`));
      
    } else {
      console.log(`❌ Parse failed: ${result.error}`);
    }
  } catch (error) {
    console.log(`❌ Test failed: ${error}`);
  }
}

async function runAllTests() {
  console.log('🏔️  Chamonix Valley Weather Parsers Test Suite');
  console.log('===============================================');
  
  try {
    await testChamonixParser();
    await testAiguilleParser();
    await testLesHouchesParser();
    
    console.log('\\n✅ All Chamonix parser tests completed successfully!');
    console.log('\\n📊 Summary:');
    console.log('   • Chamonix (1,037m): Valley floor conditions');
    console.log('   • Aiguille du Midi (3,842m): High altitude alpine');
    console.log('   • Les Houches (1,008m): Mid-elevation mountain');
    console.log('\\n🚀 Ready to integrate into Cloudflare Workers!');
    
    console.log('\\n📝 Next steps:');
    console.log('   1. Get OpenWeatherMap API key');
    console.log('   2. Add parsers to index.ts routing');
    console.log('   3. Update cron triggers');
    console.log('   4. Deploy and test');
    
  } catch (error) {
    console.error('\\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests
runAllTests();
