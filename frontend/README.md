# Weather Display System - Frontend

This is the comprehensive management interface for the Weather Display System. It provides a full-featured web-based dashboard for managing weather stations, ESP32C3 devices, and system configuration with automatic device registration and real-time monitoring.

## 🌐 Access URLs

**Live Management Interface:** https://0b4669b0.weather-management.pages.dev  
**Test Interface:** Add `/test.html` to test connectivity and device registration

## 🚀 Features

### 📱 Device Management (NEW!)
- **Auto-registration**: ESP32C3 devices automatically register when they first connect
- **Real-time status**: Live online/offline status monitoring with smart timestamps
- **Device identification**: Send identify signals to make devices flash their displays
- **Nickname editing**: Click-to-edit device names for easy identification
- **Station assignment**: Reassign devices to different weather stations via dropdown
- **Activity tracking**: Monitor last seen times, request counts, and firmware versions
- **Device scanning**: Manual scan for newly connected devices

### System Configuration
- **Collection Frequency**: Change how often weather data is collected from stations (every 5, 10, 15, 30 minutes, or hourly)
- **Backend Status**: Real-time status indicator showing if the backend is online/offline

### Station Management
- **Enable/Disable Stations**: Toggle individual weather stations on/off
- **Station Information**: View details for each station including location and description
- **Individual Data Collection**: Manually trigger data collection from specific stations
- **Bulk Data Collection**: Collect fresh data from all enabled stations at once

### Weather Data Display
- **Live Weather Data**: View current weather information from all active stations
- **Real-time Updates**: Auto-refreshes every minute
- **Manual Refresh**: Instantly refresh weather data display
- **Multi-station View**: See data from UK marine stations (Brambles, Seaview, Lymington) and French alpine stations (Prarion, Tête de Balme, Planpraz)

## 📍 Supported Weather Stations

### UK Marine Stations
- **Brambles Bank**: Solent marine weather (Southampton VTS)
- **Seaview**: Isle of Wight marine data (Navis)
- **Lymington**: Hampshire harbor weather station

### French Alpine Stations  
- **Prarion (Les Houches)**: 1,865m altitude, Pioupiou wind station, paragliding takeoff
- **Tête de Balme**: 2,204m altitude, Windbird station, valley information
- **Planpraz**: 1,958m altitude, Windbird station, paragliding takeoff

## 🔧 Backend API

The frontend connects to the backend API at:
- **Base URL**: https://weather-backend.nativenav.workers.dev
- **Health Check**: `/health`
- **Regions**: `/api/v1/regions`
- **Stations**: `/api/v1/stations`
- **Weather Data**: `/api/v1/weather/{station_id}?mac={mac}&firmware={version}` (with auto-registration)
- **Devices**: `/api/v1/devices` (GET/POST)
- **Device Management**: `/api/v1/devices/{id}` (GET/PATCH/DELETE)
- **Device Identify**: `/api/v1/devices/{id}/identify` (POST)
- **Manual Collection**: `/api/v1/collect` (POST)
- **Configuration**: `/api/v1/config` (GET/POST)

## 🤖 ESP32C3 Device Auto-Registration

### How It Works
1. **ESP32C3 connects**: Device makes first weather API request with MAC address parameter
2. **Backend detects**: New MAC address triggers automatic device registration
3. **Device registered**: Assigned region and station based on request endpoint
4. **Frontend updates**: Device appears in management interface immediately
5. **Full management**: Device can be renamed, reassigned, and identified

### Registration Request Example
```bash
# ESP32C3 device makes this request:
GET /api/v1/weather/chamonix?mac=AA:BB:CC:DD:EE:FF&firmware=1.0.0
User-Agent: ESP32C3-WeatherDisplay/1.0.0
```

### Device Registration Response
```json
{
  "success": true,
  "data": {
    "wind": { "avg": 12.5, "gust": 18.2, "direction": "NW" },
    "temperature": { "air": 15.2 }
  },
  "timestamp": "2024-01-15T14:30:00Z",
  "station": "chamonix",
  "device_registered": true,
  "device_info": {
    "deviceId": "AA-BB-CC-DD-EE-FF",
    "region": "Chamonix", 
    "stationId": "chamonix",
    "nickname": "ESP32C3 Device"
  }
}
```

## 📖 Interface Structure

### Tab Navigation
The interface uses a tabbed layout for organized access to different functions:

#### 📊 Overview Tab
- **Weather Data Display**: Live weather data from all enabled stations
- **Auto-refresh**: Data updates every minute
- **Manual refresh**: "Refresh Data" button for immediate updates
- **Timestamps**: Shows when data was last collected

#### 📱 Devices Tab  
- **Device Cards**: Each registered ESP32C3 device gets its own card
- **Status Indicators**: Real-time online/offline status with colored dots
- **Nickname Editing**: Click device name to edit (saves automatically)
- **Station Assignment**: Dropdown to reassign devices to different stations
- **Device Controls**:
  - 🔍 **Identify**: Makes device display flash for physical identification
  - 🔄 **Refresh**: Updates device information
- **Management Actions**:
  - 🔄 **Refresh Devices**: Reload entire device list
  - 🔍 **Scan for New Devices**: Check for newly connected devices

#### 📍 Stations Tab
- **Station Cards**: Information and controls for each weather station
- **Toggle Switches**: Enable/disable individual stations
- **Individual Collection**: "Collect Data" button per station
- **Bulk Operations**: "Collect All Data" for all enabled stations

#### ⚙️ Configuration Tab
- **Collection Frequency**: Dropdown to set automatic data collection intervals
- **System Settings**: Backend configuration management

## 🧪 Testing & Verification

### Test Page (`test.html`)
Use the comprehensive test page to verify system functionality:

```bash
# Access test page
http://localhost:8080/test.html
# or
https://0b4669b0.weather-management.pages.dev/test.html
```

**Test Features:**
- ✅ Backend connectivity verification
- ✅ API endpoint functionality testing
- ✅ Device registration simulation
- ✅ Error handling validation

### Manual Device Registration Test
```bash
# Simulate ESP32C3 device connecting
curl "https://weather-backend.nativenav.workers.dev/api/v1/weather/chamonix?mac=AA:BB:CC:DD:EE:FF&firmware=1.0.0" \
     -H "User-Agent: ESP32C3-WeatherDisplay/1.0.0"
```

## 💡 Usage Tips

1. **Monitor Backend Status**: The status indicator in the header shows if the backend is responsive
2. **Device Auto-Registration**: New ESP32C3 devices appear automatically when they first connect
3. **Device Identification**: Use the 🔍 Identify button to make devices flash their displays
4. **Station Management**: Use toggle switches to control which stations are actively monitored
5. **Force Data Collection**: Use "Collect All Data" to immediately refresh all station data
6. **Individual Station Control**: Each station card has its own "Collect Data" button for targeted updates
7. **Auto-refresh**: The interface automatically checks backend status and refreshes weather data every minute
8. **Mobile Friendly**: All features work on mobile devices with responsive design

## 🛠 Development

### Local Development
```bash
# Serve locally
npx http-server . -p 8080 -c-1

# Access at: http://localhost:8080
```

### Deployment
```bash
# Deploy to Cloudflare Pages
wrangler pages deploy . --project-name=weather-management
```

## 📱 Mobile Friendly

The interface is responsive and works well on mobile devices for remote monitoring and management of your weather stations.

---
*Weather Display System v0.1.0*
