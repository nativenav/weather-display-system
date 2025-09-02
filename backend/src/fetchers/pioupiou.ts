/**
 * Fetch current weather data from Pioupiou station 521 (Prarion, Les Houches)
 * API Documentation: https://developers.pioupiou.fr/api/live/
 * License: https://developers.pioupiou.fr/data-licensing
 */
export async function fetchPioupiou521Data(): Promise<any> {
  const stationId = 521;
  const apiUrl = `http://api.pioupiou.fr/v1/live-with-meta/${stationId}`;
  
  console.log(`Fetching Pioupiou data for station ${stationId} from: ${apiUrl}`);
  
  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Weather-Display-System/1.0 (https://github.com/weather-display-system)',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Pioupiou API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Basic response validation
    if (!data || !data.data) {
      throw new Error('Invalid Pioupiou API response: missing data field');
    }

    if (!data.data.measurements) {
      throw new Error('Invalid Pioupiou API response: missing measurements');
    }

    // Check if station is active
    if (data.data.status?.state !== 'on') {
      console.warn(`Pioupiou station ${stationId} is not active. Status: ${data.data.status?.state}`);
    }

    // Log successful fetch
    const lastMeasurement = new Date(data.data.measurements.date);
    console.log(`Successfully fetched Pioupiou data for ${data.data.meta?.name || `station ${stationId}`} - last measurement: ${lastMeasurement.toISOString()}`);
    
    return data;
    
  } catch (error) {
    console.error(`Error fetching Pioupiou station ${stationId} data:`, error);
    throw error;
  }
}
