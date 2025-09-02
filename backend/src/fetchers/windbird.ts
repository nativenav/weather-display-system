/**
 * Fetch current weather data from Windbird stations via Pioupiou API
 * API Documentation: https://developers.pioupiou.fr/api/live/
 * License: https://developers.pioupiou.fr/data-licensing
 */

/**
 * Generic fetch function for Windbird stations
 */
async function fetchWindbirdData(stationId: number, stationName: string): Promise<any> {
  const apiUrl = `http://api.pioupiou.fr/v1/live-with-meta/${stationId}`;
  
  console.log(`Fetching Windbird data for station ${stationId} (${stationName}) from: ${apiUrl}`);
  
  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Weather-Display-System/1.0 (https://github.com/weather-display-system)',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Windbird API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Basic response validation
    if (!data || !data.data) {
      throw new Error('Invalid Windbird API response: missing data field');
    }

    if (!data.data.measurements) {
      throw new Error('Invalid Windbird API response: missing measurements');
    }

    // Check if station is active
    if (data.data.status?.state !== 'on') {
      console.warn(`Windbird station ${stationId} is not active. Status: ${data.data.status?.state}`);
    }

    // Log successful fetch
    const lastMeasurement = new Date(data.data.measurements.date);
    console.log(`Successfully fetched Windbird data for ${data.data.meta?.name || stationName} - last measurement: ${lastMeasurement.toISOString()}`);
    
    return data;
    
  } catch (error) {
    console.error(`Error fetching Windbird station ${stationId} (${stationName}) data:`, error);
    throw error;
  }
}

/**
 * Fetch current weather data from Windbird station 1702 (Tête de Balme)
 */
export async function fetchWindbird1702Data(): Promise<any> {
  return fetchWindbirdData(1702, 'Tête de Balme');
}

/**
 * Fetch current weather data from Windbird station 1724 (Planpraz)
 */
export async function fetchWindbird1724Data(): Promise<any> {
  return fetchWindbirdData(1724, 'Planpraz');
}
