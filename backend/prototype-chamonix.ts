#!/usr/bin/env tsx
/**
 * Prototype script to test OpenWeatherMap API for Chamonix stations
 * Usage: npx tsx prototype-chamonix.ts
 */

// Note: In real deployment, this would be a Cloudflare Workers secret
const OWM_API_KEY = 'demo_key_here'; // Replace with actual API key

// Chamonix Valley stations with different elevations
const STATIONS = {
  aiguilledumidi: {
    name: 'Aiguille du Midi',
    lat: 45.8785,
    lon: 6.8873,
    elevation: 3842, // meters
    description: 'High altitude glacial conditions'
  },
  chamonix: {
    name: 'Chamonix-Mont-Blanc',
    lat: 45.9237,
    lon: 6.8694,
    elevation: 1037, // meters
    description: 'Valley floor weather station'
  },
  leshouches: {
    name: 'Les Houches',
    lat: 45.8933,
    lon: 6.7967,
    elevation: 1008, // meters
    description: 'Mid-elevation alpine station'
  }
};

interface OWMResponse {
  coord: { lon: number; lat: number; };
  weather: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
  base: string;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
  };
  visibility: number;
  wind: {
    speed: number; // m/s
    deg: number;   // degrees
    gust?: number; // m/s
  };
  clouds: { all: number; };
  dt: number; // unix timestamp
  sys: {
    type: number;
    id: number;
    country: string;
    sunrise: number;
    sunset: number;
  };
  timezone: number;
  id: number;
  name: string;
  cod: number;
}

async function fetchOWMData(stationId: string, station: any): Promise<void> {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${station.lat}&lon=${station.lon}&appid=${OWM_API_KEY}&units=metric`;
  
  console.log(`\\n📍 Fetching ${station.name} (${station.elevation}m)`);
  console.log(`   Coordinates: ${station.lat}, ${station.lon}`);
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data: OWMResponse = await response.json();
    
    console.log(`✅ Success! API returned data for "${data.name}"`);
    console.log(`   Temperature: ${data.main.temp}°C (feels like ${data.main.feels_like}°C)`);
    console.log(`   Pressure: ${data.main.pressure} hPa`);
    console.log(`   Humidity: ${data.main.humidity}%`);
    console.log(`   Wind: ${data.wind.speed} m/s @ ${data.wind.deg}°`);
    
    if (data.wind.gust) {
      console.log(`   Gust: ${data.wind.gust} m/s`);
    }
    
    console.log(`   Visibility: ${data.visibility} m`);
    console.log(`   Conditions: ${data.weather[0].main} (${data.weather[0].description})`);
    console.log(`   Updated: ${new Date(data.dt * 1000).toISOString()}`);
    
    // Save sample data
    const samplePath = `/Users/nives/Documents/Arduino/weather-display-system/backend/samples/${stationId}.json`;
    console.log(`💾 Saving sample to ${samplePath}`);
    
    // Create samples directory if it doesn't exist
    await import('fs').then(fs => {
      if (!fs.existsSync('/Users/nives/Documents/Arduino/weather-display-system/backend/samples')) {
        fs.mkdirSync('/Users/nives/Documents/Arduino/weather-display-system/backend/samples', { recursive: true });
      }
      fs.writeFileSync(samplePath, JSON.stringify(data, null, 2));
    });
    
  } catch (error) {
    console.log(`❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    if (error instanceof Error && error.message.includes('401')) {
      console.log(`💡 Hint: You need a valid OpenWeatherMap API key. Get one free at:`);
      console.log(`   https://openweathermap.org/api`);
    }
  }
}

async function testAllStations() {
  console.log('🏔️  Testing Chamonix Valley Weather Stations');
  console.log('==============================================');
  
  if (OWM_API_KEY === 'demo_key_here') {
    console.log('⚠️  Warning: Using demo API key. Replace with real key for actual data.');
    console.log('   Get free key at: https://openweathermap.org/api\\n');
  }
  
  for (const [stationId, station] of Object.entries(STATIONS)) {
    await fetchOWMData(stationId, station);
    
    // Respect API rate limits (60 calls/min)
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\\n✅ Prototype testing complete!');
  console.log('\\n📋 Next steps:');
  console.log('1. Get OpenWeatherMap API key');
  console.log('2. Test with real API key');
  console.log('3. Implement proper parsers based on sample data');
  console.log('4. Integrate into Cloudflare Workers');
}

// Run the test
testAllStations().catch(console.error);
