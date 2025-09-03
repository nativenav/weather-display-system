# Changelog

All notable changes to the Weather Display System will be documented in this file.

## [Unreleased]

## [1.1.0] - 2025-09-03

### Added
- **Aggressive Anti-Ghosting System**: Implemented intensive flash clearing sequence for ePaper displays
- **Three-Column Region Display**: Complete regional weather view showing all 3 stations per region
- **Enhanced Typography**: Larger fonts with field labels for optimal readability
- **Missing Data Handling**: Shows dashes for unavailable temperature data instead of confusing zeros

### Changed  
- **Display Layout**: Upgraded from single station to three-column regional layout
- **Font Sizes**: Increased header fonts by 30% and doubled data field font sizes
- **Line Spacing**: Increased data field spacing by 20% for better readability
- **Anti-Ghosting**: Every display update now performs aggressive 5-6 second clearing sequence
- **Refresh Strategy**: Full refresh with intensive clearing on every weather update

### Fixed
- **Ghosting Artifacts**: Completely eliminated ePaper ghosting with multi-stage clearing
- **Temperature Display**: Proper handling of missing temperature data from weather APIs
- **Display Contrast**: Perfect contrast and readability with aggressive pixel reset

### Technical Details
- Anti-ghosting sequence: 3x flash cycles + extended holds + intensive final clearing
- Configuration: `FULL_REFRESH_ALWAYS`, `FLASH_CLEAR_CYCLES=3`, `ANTI_GHOST_DELAY=400ms`
- Memory usage: Optimized for 3-station JSON parsing with 4KB buffer
- Performance: ~5-6 seconds anti-ghosting per 3-minute weather update

### Added
- Modern blue-themed frontend interface with topographical contour line background
- Enhanced nickname editing with dedicated edit buttons and improved UX
- New Cloudflare Pages deployment: `https://wds.nativenav.com` (friendly URL: `https://f1de89eb.weather-display-blue.pages.dev`)
- Inline device nickname editing with visual feedback
- Improved CSS styling with wind-inspired background animations
- Better responsive design for mobile devices

### Changed
- **BREAKING**: Migrated from purple theme to modern blue theme
- Frontend deployment URL changed to `weather-display-blue` project
- Enhanced device name editing UI with edit button icons
- Improved visual feedback for editing states
- Updated documentation with new deployment URLs

### Removed
- Deprecated old purple-themed deployment (`weather-management`)
- Removed old Cloudflare Pages project to avoid confusion

### Fixed
- Device nickname editing functionality now works properly
- Improved CSS styling consistency across all UI elements
- Fixed hover and focus states for better user interaction

### Backend
- Enhanced device management API with proper device indexing
- Improved `getAllDevices` function with better sorting and status tracking
- Updated KV storage implementation for device tracking

### Infrastructure
- Deployed new blue-themed frontend to Cloudflare Pages
- Updated all documentation with correct deployment URLs
- Cleaned up old deployments to prevent confusion

---

## [v0.1.0] - 2025-08-XX

### Initial Release
- Complete weather display system with 6 active weather stations
- ESP32C3 device auto-registration and management
- Real-time weather data collection from UK marine and French alpine stations
- Web management interface with device controls
- Backend API with Cloudflare Workers and KV storage
- Full device identification and station assignment features
