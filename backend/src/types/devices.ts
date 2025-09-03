/**
 * Device Management Types
 * Weather Display System - Device Registration & Management
 */

export interface DeviceInfo {
  deviceId: string;      // MAC address without colons (lowercase)
  macAddress: string;    // Full MAC address with colons
  nickname: string;      // User-friendly device name
  regionId: string;      // Assigned weather region (chamonix/solent)
  lastSeen: string;      // ISO timestamp of last heartbeat
  status: 'online' | 'offline';
  createdAt: string;     // ISO timestamp of device registration
  requestCount: number;  // Total API requests from device
  firmware?: string;     // Firmware version
  userAgent?: string;    // Device user agent string
  ipAddress?: string;    // Last known IP address
  identifyFlag: boolean; // Trigger identify sequence on next poll
}

export interface DeviceRegistrationRequest {
  macAddress?: string;   // Optional MAC override
  nickname?: string;     // Optional custom nickname
  region?: string;       // Preferred region
  firmware?: string;     // Firmware version
  userAgent?: string;    // Device user agent
}

export interface DeviceRegistrationResponse {
  success: boolean;
  deviceId: string;
  nickname: string;
  regionId: string;
  message?: string;
  isNewDevice: boolean;
}

export interface DeviceUpdateRequest {
  nickname?: string;
  regionId?: string;
}

export interface DeviceHeartbeat {
  deviceId: string;
  timestamp: string;
  firmware?: string;
  ipAddress?: string;
  memoryUsage?: number;
}

export interface RegionConfig {
  name: string;
  displayName: string;
  stations: string[];
  defaultStation: string;
}

export interface IdentifyRequest {
  deviceId: string;
  duration?: number;  // Duration in seconds (default: 10)
}

// Error types
export class DeviceNotFoundError extends Error {
  constructor(deviceId: string) {
    super(`Device not found: ${deviceId}`);
    this.name = 'DeviceNotFoundError';
  }
}

export class InvalidMacAddressError extends Error {
  constructor(mac: string) {
    super(`Invalid MAC address format: ${mac}`);
    this.name = 'InvalidMacAddressError';
  }
}

export class RegionNotFoundError extends Error {
  constructor(region: string) {
    super(`Region not found: ${region}`);
    this.name = 'RegionNotFoundError';
  }
}
