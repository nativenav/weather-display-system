# Weather Display System - Management Interface

A web-based management interface for the Weather Display System backend.

## 🌐 Access URL

**Live Management Interface:** https://0b4669b0.weather-management.pages.dev

## 🚀 Features

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
- **Stations**: `/api/v1/stations`
- **Weather Data**: `/api/v1/weather/{station_id}`
- **Manual Collection**: `/api/v1/collect` (POST)
- **Configuration**: `/api/v1/config` (GET/POST)

## 💡 Usage Tips

1. **Monitor Backend Status**: The status indicator in the header shows if the backend is responsive
2. **Enable/Disable Stations**: Use the toggle switches to control which stations are actively monitored
3. **Force Data Collection**: Use "Collect All Data" to immediately refresh all station data
4. **Individual Station Control**: Each station card has its own "Collect Data" button for targeted updates
5. **Auto-refresh**: The interface automatically checks backend status and refreshes weather data every minute

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
