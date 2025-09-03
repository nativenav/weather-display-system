/**
 * Device Management Utilities
 * Weather Display System - Device Registration & Management
 */

import { DeviceInfo, DeviceNotFoundError, InvalidMacAddressError } from '../types/devices.js';
import { generateDefaultNickname, getDefaultStation, DEFAULT_REGION } from '../config/regions.js';
import { Env } from '../types/weather.js';

/**
 * Normalize MAC address to device ID format (lowercase, no colons)
 */
export function normalizeDeviceId(mac: string): string {
  return mac.replace(/[:-]/g, '').toLowerCase();
}

/**
 * Format device ID back to MAC address format
 */
export function formatMacAddress(deviceId: string): string {
  if (deviceId.length !== 12) {
    throw new InvalidMacAddressError(deviceId);
  }
  
  return deviceId.match(/.{1,2}/g)?.join(':').toUpperCase() || deviceId;
}

/**
 * Validate MAC address format
 */
export function validateMacAddress(mac: string): boolean {
  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
  const deviceIdRegex = /^[0-9a-f]{12}$/;
  
  return macRegex.test(mac) || deviceIdRegex.test(mac);
}

/**
 * Generate device cache key
 */
export function createDeviceCacheKey(deviceId: string): string {
  return `device:${deviceId}`;
}

/**
 * Get device from cache
 */
export async function getDevice(deviceId: string, env: Env): Promise<DeviceInfo | null> {
  const cacheKey = createDeviceCacheKey(deviceId);
  const cached = await env.WEATHER_CACHE.get(cacheKey, { type: 'json' });
  return cached as DeviceInfo | null;
}

/**
 * Save device to cache and update device index
 */
export async function saveDevice(device: DeviceInfo, env: Env): Promise<void> {
  const cacheKey = createDeviceCacheKey(device.deviceId);
  await env.WEATHER_CACHE.put(cacheKey, JSON.stringify(device), {
    expirationTtl: 86400 // 24 hours
  });
  
  // Update device index for getAllDevices
  await addToDeviceIndex(device.deviceId, env);
}

/**
 * Create new device registration
 */
export function createNewDevice(
  deviceId: string,
  macAddress: string,
  region: string = DEFAULT_REGION,
  nickname?: string,
  userAgent?: string,
  firmware?: string,
  ipAddress?: string
): DeviceInfo {
  const now = new Date().toISOString();
  
  return {
    deviceId,
    macAddress,
    nickname: nickname || generateDefaultNickname(deviceId, region),
    stationId: getDefaultStation(region),
    region,
    lastSeen: now,
    status: 'online',
    createdAt: now,
    requestCount: 1,
    firmware,
    userAgent,
    ipAddress,
    identifyFlag: false
  };
}

/**
 * Update device last seen and request count
 */
export function updateDeviceActivity(
  device: DeviceInfo,
  ipAddress?: string,
  userAgent?: string
): DeviceInfo {
  return {
    ...device,
    lastSeen: new Date().toISOString(),
    status: 'online',
    requestCount: device.requestCount + 1,
    ipAddress: ipAddress || device.ipAddress,
    userAgent: userAgent || device.userAgent
  };
}

/**
 * Check if device is online (last seen within threshold)
 */
export function isDeviceOnline(device: DeviceInfo, thresholdMinutes: number = 5): boolean {
  const lastSeenTime = new Date(device.lastSeen).getTime();
  const now = Date.now();
  const thresholdMs = thresholdMinutes * 60 * 1000;
  
  return (now - lastSeenTime) < thresholdMs;
}

/**
 * Update device status based on last seen
 */
export function updateDeviceStatus(device: DeviceInfo): DeviceInfo {
  const online = isDeviceOnline(device);
  
  return {
    ...device,
    status: online ? 'online' : 'offline'
  };
}

/**
 * Device index key
 */
const DEVICE_INDEX_KEY = 'registry:device_index';

/**
 * Add device ID to the device index
 */
export async function addToDeviceIndex(deviceId: string, env: Env): Promise<void> {
  try {
    const existingIndex = await env.WEATHER_CACHE.get(DEVICE_INDEX_KEY, { type: 'json' }) as string[] || [];
    
    if (!existingIndex.includes(deviceId)) {
      existingIndex.push(deviceId);
      await env.WEATHER_CACHE.put(DEVICE_INDEX_KEY, JSON.stringify(existingIndex), {
        expirationTtl: 604800 // 7 days (longer than device TTL)
      });
    }
  } catch (error) {
    console.error(`[ERROR] Failed to update device index for ${deviceId}:`, error);
  }
}

/**
 * Remove device ID from the device index
 */
export async function removeFromDeviceIndex(deviceId: string, env: Env): Promise<void> {
  try {
    const existingIndex = await env.WEATHER_CACHE.get(DEVICE_INDEX_KEY, { type: 'json' }) as string[] || [];
    const updatedIndex = existingIndex.filter(id => id !== deviceId);
    
    if (updatedIndex.length !== existingIndex.length) {
      await env.WEATHER_CACHE.put(DEVICE_INDEX_KEY, JSON.stringify(updatedIndex), {
        expirationTtl: 604800 // 7 days
      });
    }
  } catch (error) {
    console.error(`[ERROR] Failed to remove from device index ${deviceId}:`, error);
  }
}

/**
 * Get all devices from cache using the device index
 */
export async function getAllDevices(env: Env): Promise<DeviceInfo[]> {
  try {
    // Get the device index
    const deviceIds = await env.WEATHER_CACHE.get(DEVICE_INDEX_KEY, { type: 'json' }) as string[] || [];
    
    if (deviceIds.length === 0) {
      console.log('[INFO] No devices in index');
      return [];
    }
    
    console.log(`[INFO] Found ${deviceIds.length} devices in index: ${deviceIds.join(', ')}`);
    
    // Fetch all devices in parallel
    const devicePromises = deviceIds.map(async (deviceId) => {
      try {
        const device = await getDevice(deviceId, env);
        if (device) {
          // Update status based on last seen
          return updateDeviceStatus(device);
        }
        return null;
      } catch (error) {
        console.error(`[ERROR] Failed to fetch device ${deviceId}:`, error);
        return null;
      }
    });
    
    const devices = await Promise.all(devicePromises);
    
    // Filter out null values and sort by last seen (most recent first)
    const validDevices = devices
      .filter((device): device is DeviceInfo => device !== null)
      .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
    
    console.log(`[INFO] Returning ${validDevices.length} valid devices`);
    return validDevices;
    
  } catch (error) {
    console.error('[ERROR] Failed to get all devices:', error);
    return [];
  }
}

/**
 * Set identify flag for device
 */
export async function setDeviceIdentifyFlag(deviceId: string, env: Env): Promise<boolean> {
  const device = await getDevice(deviceId, env);
  if (!device) {
    throw new DeviceNotFoundError(deviceId);
  }
  
  const updatedDevice = {
    ...device,
    identifyFlag: true
  };
  
  await saveDevice(updatedDevice, env);
  return true;
}

/**
 * Clear identify flag for device
 */
export async function clearDeviceIdentifyFlag(deviceId: string, env: Env): Promise<boolean> {
  const device = await getDevice(deviceId, env);
  if (!device) {
    return false; // Silently fail if device not found
  }
  
  const updatedDevice = {
    ...device,
    identifyFlag: false
  };
  
  await saveDevice(updatedDevice, env);
  return true;
}

/**
 * Extract client IP address from request
 */
export function getClientIP(request: Request): string {
  // Check Cloudflare headers first
  const cfConnectingIP = request.headers.get('CF-Connecting-IP');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  // Check other common headers
  const xForwardedFor = request.headers.get('X-Forwarded-For');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  
  const xRealIP = request.headers.get('X-Real-IP');
  if (xRealIP) {
    return xRealIP;
  }
  
  return 'unknown';
}

/**
 * Extract device info from request headers
 */
export function extractDeviceInfo(request: Request): {
  userAgent?: string;
  firmware?: string;
  ipAddress: string;
} {
  return {
    userAgent: request.headers.get('User-Agent') || undefined,
    firmware: request.headers.get('X-Firmware-Version') || undefined,
    ipAddress: getClientIP(request)
  };
}
