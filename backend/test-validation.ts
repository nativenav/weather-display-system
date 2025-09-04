// Test file to verify upstream data validation is working correctly
import { validateWeatherData, isWeatherDataValid } from './src/types.js';

console.log('Testing upstream weather data validation...');

// Test case 1: Valid data with zero temperature
const testData1 = {
  station_id: 'test-station',
  station_name: 'Test Station',
  location: { latitude: 50.0, longitude: -1.0 },
  timestamp: new Date().toISOString(),
  temperature: 0.0, // This should be valid (freezing point)
  pressure: 1013.25,
  wind_speed: 5.2,
  wind_direction: 180,
  data_source: 'test'
};

const validated1 = validateWeatherData(testData1);
console.log('\nTest 1 - Zero temperature:');
console.log(`Input temperature: ${testData1.temperature}`);
console.log(`Validated temperature: ${validated1.temperature}`);
console.log(`Is valid: ${isWeatherDataValid(validated1)}`);

// Test case 2: Negative temperature (should be valid for alpine stations)
const testData2 = {
  station_id: 'alpine-station',
  station_name: 'Alpine Station',
  location: { latitude: 45.0, longitude: 6.0 },
  timestamp: new Date().toISOString(),
  temperature: -15.5, // Should be valid (alpine winter)
  pressure: 950.0,
  wind_speed: 12.1,
  wind_direction: 270,
  data_source: 'test'
};

const validated2 = validateWeatherData(testData2);
console.log('\nTest 2 - Negative temperature:');
console.log(`Input temperature: ${testData2.temperature}`);
console.log(`Validated temperature: ${validated2.temperature}`);
console.log(`Is valid: ${isWeatherDataValid(validated2)}`);

// Test case 3: Invalid temperature (should be null)
const testData3 = {
  station_id: 'bad-station',
  station_name: 'Bad Station',
  location: { latitude: 0.0, longitude: 0.0 },
  timestamp: new Date().toISOString(),
  temperature: 99999, // Unrealistic temperature
  pressure: 0, // Invalid pressure (should become null)
  wind_speed: 8.3,
  wind_direction: 90,
  data_source: 'test'
};

const validated3 = validateWeatherData(testData3);
console.log('\nTest 3 - Invalid temperature/pressure:');
console.log(`Input temperature: ${testData3.temperature}, pressure: ${testData3.pressure}`);
console.log(`Validated temperature: ${validated3.temperature}, pressure: ${validated3.pressure}`);
console.log(`Is valid: ${isWeatherDataValid(validated3)}`);

// Test case 4: Missing data (undefined/null handling)
const testData4 = {
  station_id: 'sparse-station',
  station_name: 'Sparse Station',
  location: { latitude: 51.0, longitude: 0.0 },
  timestamp: new Date().toISOString(),
  temperature: null, // Explicitly null (should stay null)
  pressure: undefined, // Undefined (should become null)
  wind_speed: 2.1,
  wind_direction: 45,
  data_source: 'test'
};

const validated4 = validateWeatherData(testData4);
console.log('\nTest 4 - Null/undefined data:');
console.log(`Input temperature: ${testData4.temperature}, pressure: ${testData4.pressure}`);
console.log(`Validated temperature: ${validated4.temperature}, pressure: ${validated4.pressure}`);
console.log(`Is valid: ${isWeatherDataValid(validated4)}`);

// Test case 5: Wind direction normalization
const testData5 = {
  station_id: 'windy-station',
  station_name: 'Windy Station',
  location: { latitude: 52.0, longitude: 1.0 },
  timestamp: new Date().toISOString(),
  temperature: 18.5,
  wind_speed: 15.7,
  wind_direction: 425, // Should normalize to 65 degrees (425 - 360 = 65)
  data_source: 'test'
};

const validated5 = validateWeatherData(testData5);
console.log('\nTest 5 - Wind direction normalization:');
console.log(`Input direction: ${testData5.wind_direction}`);
console.log(`Validated direction: ${validated5.wind_direction}`);
console.log(`Wind direction text: ${validated5.wind_direction_text}`);
console.log(`Is valid: ${isWeatherDataValid(validated5)}`);

console.log('\nValidation tests complete!');
