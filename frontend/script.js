// Configuration
const API_BASE_URL = 'https://weather-backend.nativenav.workers.dev'; // Deployed Cloudflare Worker URL
let currentConfig = {
    stations: {},
    cronFrequency: '*/5 * * * *'
};

// State
let regions = [];
let stations = [];
let devices = [];
let editingDeviceNickname = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('Weather Management Interface loaded');
    
    // Bind event listeners
    bindEventListeners();
    
    // Initial load
    checkBackendStatus();
    loadRegions();
    loadWeatherData();
});

function bindEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => switchTab(button.dataset.tab));
    });
    
    // System configuration
    document.getElementById('update-cron').addEventListener('click', updateCronFrequency);
    
    // Station management
    document.getElementById('refresh-stations').addEventListener('click', loadStations);
    document.getElementById('collect-all').addEventListener('click', collectAllData);
    
    // Device management
    document.getElementById('refresh-devices').addEventListener('click', loadDevices);
    document.getElementById('scan-devices').addEventListener('click', scanForDevices);
    
    // Weather data
    document.getElementById('refresh-data').addEventListener('click', loadWeatherData);
    
    // Device nickname editing - use event delegation
    document.addEventListener('blur', function(e) {
        if (e.target.matches('.device-name.editing')) {
            const deviceId = e.target.dataset.deviceId;
            const newNickname = e.target.value.trim();
            if (deviceId && newNickname) {
                saveDeviceNickname(deviceId, newNickname);
            }
        }
    }, true);
    
    document.addEventListener('keydown', function(e) {
        if (e.target.matches('.device-name.editing') && e.key === 'Enter') {
            e.target.blur();
        }
    });
}

// Backend Status Check
async function checkBackendStatus() {
    const statusElement = document.getElementById('backend-status');
    
    try {
        statusElement.textContent = 'Checking...';
        statusElement.className = 'status offline';
        
        const response = await fetch(`${API_BASE_URL}/health`);
        
        if (response.ok) {
            statusElement.textContent = 'Online';
            statusElement.className = 'status online';
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        console.error('Backend status check failed:', error);
        statusElement.textContent = 'Offline';
        statusElement.className = 'status offline';
    }
}

// Station Management
async function loadStations() {
    const container = document.getElementById('stations-container');
    container.innerHTML = '<div class="loading">Loading stations</div>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/stations`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        displayStations(data.stations);
        
    } catch (error) {
        console.error('Failed to load stations:', error);
        container.innerHTML = `<div class="error">Failed to load stations: ${error.message}</div>`;
    }
}

function displayStations(stations) {
    const container = document.getElementById('stations-container');
    
    if (!stations || stations.length === 0) {
        container.innerHTML = '<div class="error">No stations configured</div>';
        return;
    }
    
    const stationsHTML = stations.map(station => {
        const isEnabled = currentConfig.stations[station.id] !== false;
        
        return `
            <div class="station-card">
                <div class="station-header">
                    <div>
                        <div class="station-name">${station.name}</div>
                        <div class="station-location">${station.location}</div>
                    </div>
                    <div class="station-status ${isEnabled ? 'enabled' : 'disabled'}">
                        ${isEnabled ? 'Enabled' : 'Disabled'}
                    </div>
                </div>
                <div class="station-description">${station.description}</div>
                <div class="station-controls">
                    <label class="toggle-switch">
                        <input type="checkbox" ${isEnabled ? 'checked' : ''} 
                               onchange="toggleStation('${station.id}', this.checked)">
                        <span class="slider"></span>
                    </label>
                    <button class="btn btn-secondary" onclick="collectStationData('${station.id}')">
                        📊 Collect Data
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = `<div class="stations-grid">${stationsHTML}</div>`;
}

async function toggleStation(stationId, enabled) {
    try {
        // Update local state
        currentConfig.stations[stationId] = enabled;
        
        // Note: In a real implementation, you'd send this to the backend
        // For now, we'll just update the UI
        console.log(`Station ${stationId} ${enabled ? 'enabled' : 'disabled'}`);
        
        // Show feedback
        showNotification(`Station ${stationId} ${enabled ? 'enabled' : 'disabled'}`, 'success');
        
        // Refresh the display
        loadStations();
        
    } catch (error) {
        console.error('Failed to toggle station:', error);
        showNotification(`Failed to toggle station: ${error.message}`, 'error');
    }
}

async function collectStationData(stationId) {
    try {
        showNotification(`Collecting data from ${stationId}...`, 'info');
        
        // Try to fetch fresh data
        const response = await fetch(`${API_BASE_URL}/api/v1/weather/${stationId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        showNotification(`Successfully collected data from ${stationId}`, 'success');
        
        // Refresh weather data display
        loadWeatherData();
        
    } catch (error) {
        console.error(`Failed to collect data from ${stationId}:`, error);
        showNotification(`Failed to collect data from ${stationId}: ${error.message}`, 'error');
    }
}

async function collectAllData() {
    const button = document.getElementById('collect-all');
    const originalText = button.innerHTML;
    
    button.disabled = true;
    button.innerHTML = '⏳ Collecting...';
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/collect`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('Collection result:', result);
        
        showNotification('Successfully collected data from all stations', 'success');
        
        // Refresh weather data display
        loadWeatherData();
        
    } catch (error) {
        console.error('Failed to collect all data:', error);
        showNotification(`Failed to collect all data: ${error.message}`, 'error');
    } finally {
        button.disabled = false;
        button.innerHTML = originalText;
    }
}

// Cron Management
async function updateCronFrequency() {
    const select = document.getElementById('cron-frequency');
    const button = document.getElementById('update-cron');
    const newFrequency = select.value;
    
    button.disabled = true;
    button.textContent = 'Updating...';
    
    try {
        // Note: In a real implementation, you'd update the Cloudflare Worker's cron schedule
        // This would require using the Cloudflare API or updating wrangler.toml
        currentConfig.cronFrequency = newFrequency;
        
        showNotification(`Cron frequency updated to: ${getCronDescription(newFrequency)}`, 'success');
        console.log('Updated cron frequency:', newFrequency);
        
    } catch (error) {
        console.error('Failed to update cron frequency:', error);
        showNotification(`Failed to update cron frequency: ${error.message}`, 'error');
    } finally {
        button.disabled = false;
        button.textContent = 'Update';
    }
}

function getCronDescription(cron) {
    const descriptions = {
        '*/5 * * * *': 'Every 5 minutes',
        '*/10 * * * *': 'Every 10 minutes',
        '*/15 * * * *': 'Every 15 minutes',
        '*/30 * * * *': 'Every 30 minutes',
        '0 * * * *': 'Every hour'
    };
    return descriptions[cron] || cron;
}

// Weather Data Display
async function loadWeatherData() {
    const container = document.getElementById('weather-data-container');
    const timestamp = document.getElementById('last-refresh');
    
    container.innerHTML = '<div class="loading">Loading weather data</div>';
    
    try {
        // Get list of stations first
        const stationsResponse = await fetch(`${API_BASE_URL}/api/v1/stations`);
        if (!stationsResponse.ok) throw new Error('Failed to fetch stations');
        
        const stationsData = await stationsResponse.json();
        const stations = stationsData.stations;
        
        // Fetch weather data for each enabled station
        const weatherPromises = stations
            .filter(station => currentConfig.stations[station.id] !== false)
            .map(async (station) => {
                try {
                    const response = await fetch(`${API_BASE_URL}/api/v1/weather/${station.id}`);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    
                    const data = await response.json();
                    return { station, data, success: true };
                } catch (error) {
                    return { station, error: error.message, success: false };
                }
            });
        
        const results = await Promise.all(weatherPromises);
        displayWeatherData(results);
        
        timestamp.textContent = `Last updated: ${new Date().toLocaleString()}`;
        
    } catch (error) {
        console.error('Failed to load weather data:', error);
        container.innerHTML = `<div class="error">Failed to load weather data: ${error.message}</div>`;
    }
}

function displayWeatherData(results) {
    const container = document.getElementById('weather-data-container');
    
    if (!results || results.length === 0) {
        container.innerHTML = '<div class="error">No weather data available</div>';
        return;
    }
    
    const weatherHTML = results.map(result => {
        if (!result.success) {
            return `
                <div class="weather-card">
                    <div class="weather-station">${result.station.name}</div>
                    <div class="error">Failed to load: ${result.error}</div>
                </div>
            `;
        }
        
        const { station, data } = result;
        const wind = data.data.wind || {};
        const temp = data.data.temperature || {};
        const pressure = data.data.pressure || {};
        
        return `
            <div class="weather-card">
                <div class="weather-station">${station.name}</div>
                <div class="weather-data">
                    <div class="data-item">
                        <div class="data-label">Wind Speed</div>
                        <div class="data-value">
                            ${wind.avg ? wind.avg.toFixed(1) : '--'}
                            <span class="data-unit">m/s</span>
                        </div>
                    </div>
                    <div class="data-item">
                        <div class="data-label">Wind Gust</div>
                        <div class="data-value">
                            ${wind.gust ? wind.gust.toFixed(1) : '--'}
                            <span class="data-unit">m/s</span>
                        </div>
                    </div>
                    <div class="data-item">
                        <div class="data-label">Direction</div>
                        <div class="data-value">
                            ${wind.direction || '--'}
                        </div>
                    </div>
                    <div class="data-item">
                        <div class="data-label">Temperature</div>
                        <div class="data-value">
                            ${temp.air !== undefined ? temp.air.toFixed(1) : '--'}
                            <span class="data-unit">°C</span>
                        </div>
                    </div>
                </div>
                <div class="timestamp" style="margin-top: 1rem; text-align: center;">
                    Updated: ${new Date(data.timestamp).toLocaleTimeString()}
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = `<div class="weather-grid">${weatherHTML}</div>`;
}

// Utility Functions
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Style the notification
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '12px 20px',
        borderRadius: '8px',
        color: 'white',
        fontWeight: '500',
        zIndex: '1000',
        maxWidth: '400px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        transition: 'all 0.3s ease'
    });
    
    // Set background color based on type
    const colors = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    notification.style.backgroundColor = colors[type] || colors.info;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 5000);
}

// ===============================================================================
// TAB MANAGEMENT
// ===============================================================================

function switchTab(tabName) {
    // Remove active class from all tabs and content
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Add active class to selected tab and content
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Load data for specific tabs when they become active
    if (tabName === 'stations' && stations.length === 0) {
        loadStations();
    } else if (tabName === 'devices') {
        loadDevices();
    }
}

// ===============================================================================
// DEVICE MANAGEMENT
// ===============================================================================

async function loadRegions() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/regions`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        regions = data.regions || [];
        
        console.log('Loaded regions:', regions);
    } catch (error) {
        console.error('Failed to load regions:', error);
        regions = [];
    }
}

async function loadDevices() {
    const container = document.getElementById('devices-container');
    container.innerHTML = '<div class="loading">Loading devices</div>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/devices`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        devices = data.devices || [];
        displayDevices();
        
    } catch (error) {
        console.error('Failed to load devices:', error);
        container.innerHTML = `<div class="error">Failed to load devices: ${error.message}<br><small>Note: Devices auto-register when they first connect.</small></div>`;
    }
}

function displayDevices() {
    const container = document.getElementById('devices-container');
    
    if (!devices || devices.length === 0) {
        container.innerHTML = `
            <div class="error" style="background: #f3f4f6; border: 1px solid #d1d5db; color: #374151;">
                <h3>No devices found</h3>
                <p>Devices will auto-register here when they connect for the first time.</p>
                <p>Make sure your ESP32C3 firmware is running and connected to WiFi.</p>
            </div>
        `;
        return;
    }
    
    const devicesHTML = devices.map(device => {
        const isOnline = device.status === 'online';
        const lastSeenTime = new Date(device.lastSeen);
        const timeDiff = Date.now() - lastSeenTime.getTime();
        const minutesAgo = Math.floor(timeDiff / 60000);
        
        let lastSeenText;
        if (minutesAgo < 1) {
            lastSeenText = 'Just now';
        } else if (minutesAgo < 60) {
            lastSeenText = `${minutesAgo} min ago`;
        } else {
            lastSeenText = lastSeenTime.toLocaleString();
        }
        
        // Build station selector options
        const stationOptions = regions.flatMap(region => 
            region.stations.map(stationId => 
                `<option value="${stationId}" ${device.stationId === stationId ? 'selected' : ''}>
                    ${stationId} (${region.displayName})
                </option>`
            )
        ).join('');
        
        const isEditing = editingDeviceNickname === device.deviceId;
        
        return `
            <div class="device-card">
                <div class="device-header">
                    <div>
                        <div class="device-name-container">
                            <input type="text" 
                                   class="device-name ${isEditing ? 'editing' : ''}" 
                                   value="${device.nickname.replace(/"/g, '&quot;')}" 
                                   data-device-id="${device.deviceId}"
                                   ${isEditing ? '' : 'readonly'}
                                   placeholder="Device nickname..." />
                            <button class="device-name-edit-btn" 
                                    onclick="editDeviceNickname('${device.deviceId}')" 
                                    title="Edit nickname">
                                ✏️
                            </button>
                        </div>
                        <div class="device-mac">${device.macAddress}</div>
                    </div>
                    <div class="device-status">
                        <span class="status-dot ${isOnline ? 'online' : 'offline'}"></span>
                        ${isOnline ? 'Online' : 'Offline'}
                    </div>
                </div>
                
                <div class="device-info">
                    <div class="device-info-item">
                        <div class="device-info-label">Region</div>
                        <div class="device-info-value">${device.region}</div>
                    </div>
                    <div class="device-info-item">
                        <div class="device-info-label">Station</div>
                        <div class="device-info-value">${device.stationId}</div>
                    </div>
                    <div class="device-info-item">
                        <div class="device-info-label">Requests</div>
                        <div class="device-info-value">${device.requestCount}</div>
                    </div>
                    <div class="device-info-item">
                        <div class="device-info-label">Firmware</div>
                        <div class="device-info-value">${device.firmware || 'Unknown'}</div>
                    </div>
                </div>
                
                <div class="device-controls">
                    <select class="station-select" onchange="updateDeviceStation('${device.deviceId}', this.value)">
                        ${stationOptions}
                    </select>
                    <button class="btn btn-sm btn-identify" onclick="identifyDevice('${device.deviceId}')">🔍 Identify</button>
                    <button class="btn btn-sm btn-secondary" onclick="refreshDeviceData('${device.deviceId}')">🔄 Refresh</button>
                </div>
                
                <div class="device-last-seen">
                    Last seen: ${lastSeenText}
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = `<div class="devices-grid">${devicesHTML}</div>`;
}

async function scanForDevices() {
    const button = document.getElementById('scan-devices');
    const originalText = button.innerHTML;
    
    button.disabled = true;
    button.innerHTML = '🔍 Scanning...';
    
    try {
        showNotification('Scanning for new devices...', 'info');
        
        // Refresh devices list
        await loadDevices();
        
        showNotification('Device scan complete', 'success');
        
    } catch (error) {
        console.error('Failed to scan for devices:', error);
        showNotification(`Failed to scan for devices: ${error.message}`, 'error');
    } finally {
        button.disabled = false;
        button.innerHTML = originalText;
    }
}

function editDeviceNickname(deviceId) {
    if (editingDeviceNickname === deviceId) return;
    
    editingDeviceNickname = deviceId;
    displayDevices();
}

async function saveDeviceNickname(deviceId, newNickname) {
    if (editingDeviceNickname !== deviceId) return;
    
    editingDeviceNickname = null;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/devices/${deviceId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nickname: newNickname })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Update local device data
        const device = devices.find(d => d.deviceId === deviceId);
        if (device) {
            device.nickname = newNickname;
        }
        
        showNotification('Device nickname updated', 'success');
        displayDevices();
        
    } catch (error) {
        console.error('Failed to update device nickname:', error);
        showNotification(`Failed to update nickname: ${error.message}`, 'error');
        displayDevices();
    }
}

async function updateDeviceStation(deviceId, newStationId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/devices/${deviceId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ stationId: newStationId })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Update local device data
        const device = devices.find(d => d.deviceId === deviceId);
        if (device) {
            device.stationId = newStationId;
        }
        
        showNotification(`Device station updated to ${newStationId}`, 'success');
        displayDevices();
        
    } catch (error) {
        console.error('Failed to update device station:', error);
        showNotification(`Failed to update station: ${error.message}`, 'error');
    }
}

async function identifyDevice(deviceId) {
    const button = event.target;
    button.classList.add('pulsing');
    button.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/devices/${deviceId}/identify`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        showNotification('Device identify signal sent! The display should flash.', 'success');
        
    } catch (error) {
        console.error('Failed to identify device:', error);
        showNotification(`Failed to identify device: ${error.message}`, 'error');
    } finally {
        setTimeout(() => {
            button.classList.remove('pulsing');
            button.disabled = false;
        }, 3000);
    }
}

async function refreshDeviceData(deviceId) {
    try {
        showNotification('Refreshing device data...', 'info');
        await loadDevices();
        showNotification('Device data refreshed', 'success');
        
    } catch (error) {
        console.error('Failed to refresh device data:', error);
        showNotification(`Failed to refresh: ${error.message}`, 'error');
    }
}

// Auto-refresh functionality
setInterval(() => {
    checkBackendStatus();
    loadWeatherData();
    
    // Also refresh devices if that tab is active
    const devicesTab = document.getElementById('devices-tab');
    if (devicesTab && devicesTab.classList.contains('active')) {
        loadDevices();
    }
}, 60000); // Refresh every minute
