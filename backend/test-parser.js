// Simple test script to verify parser functionality
// Run with: node test-parser.js

import { parseBramblesData } from './src/parsers/brambles.js';
import { formatDisplayLines } from './src/utils/helpers.js';

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

console.log('🧪 Testing Brambles Parser...\n');

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
  
  console.log('📱 Display format (for ESP32C3):');
  const displayLines = formatDisplayLines({
    stationName: 'Brambles Bank',
    windSpeed: data.windSpeed,
    windGust: data.windGust,
    windDirection: data.windDirection,
    temperature: data.temperature,
    pressure: data.pressure,
    timestamp: data.timestamp
  });
  
  displayLines.forEach(line => console.log(`   ${line}`));
  
  console.log('\n🎉 Test completed successfully!');
} else {
  console.error('❌ Parsing failed:', parseResult.error);
  process.exit(1);
}
