/**
 * Region and Station Configuration
 * Weather Display System - Device Assignment Logic
 */

import { RegionConfig } from '../types/devices.js';

export const REGIONS: Record<string, RegionConfig> = {
  chamonix: {
    name: 'chamonix',
    displayName: 'Chamonix Valley, France',
    stations: ['planpraz', 'prarion', 'tetedebalme'], // Alphabetical order
    defaultStation: 'planpraz' // First alphabetically
  },
  solent: {
    name: 'solent', 
    displayName: 'Solent, UK',
    stations: ['brambles', 'lymington', 'seaview'], // Alphabetical order
    defaultStation: 'brambles' // First alphabetically
  }
};

export const DEFAULT_REGION = 'chamonix';

/**
 * Get region configuration by name
 */
export function getRegion(regionName: string): RegionConfig | null {
  return REGIONS[regionName.toLowerCase()] || null;
}

/**
 * Get all available regions
 */
export function getAllRegions(): RegionConfig[] {
  return Object.values(REGIONS);
}

/**
 * Get default station for a region
 */
export function getDefaultStation(regionName: string): string {
  const region = getRegion(regionName);
  return region?.defaultStation || REGIONS[DEFAULT_REGION].defaultStation;
}

/**
 * Validate if a station belongs to a region
 */
export function validateStationInRegion(stationId: string, regionName: string): boolean {
  const region = getRegion(regionName);
  return region?.stations.includes(stationId) || false;
}

/**
 * Get region for a given station
 */
export function getRegionForStation(stationId: string): string | null {
  for (const [regionName, config] of Object.entries(REGIONS)) {
    if (config.stations.includes(stationId)) {
      return regionName;
    }
  }
  return null;
}

/**
 * Generate a default nickname for a device
 */
export function generateDefaultNickname(deviceId: string, region: string): string {
  const regionConfig = getRegion(region);
  const regionDisplay = regionConfig?.displayName.split(',')[0] || region;
  const deviceShort = deviceId.substring(0, 8);
  
  return `${regionDisplay} Display ${deviceShort}`;
}

/**
 * Get all available stations across regions
 */
export function getAllStations(): { stationId: string; region: string; regionName: string }[] {
  const stations: { stationId: string; region: string; regionName: string }[] = [];
  
  for (const [regionName, config] of Object.entries(REGIONS)) {
    for (const stationId of config.stations) {
      stations.push({
        stationId,
        region: regionName,
        regionName: config.displayName
      });
    }
  }
  
  return stations.sort((a, b) => a.stationId.localeCompare(b.stationId));
}
