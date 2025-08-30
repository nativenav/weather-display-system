# Backend (Cloudflare Workers + KV)

Implements the public API the ESP32C3 devices call. Fetches data from upstream weather stations, parses/normalizes, caches in KV, and serves lightweight payloads.

## Endpoints (planned)
- GET /api/v1/weather/:station
- GET /api/v1/weather/:station?format=display
- GET /api/v1/stations
- POST /api/v1/collect (cron)

## Features
- Parser library in TypeScript (ported from ESP32 code)
- Exponential backoff and retry on failures
- Content-hash caching and TTLs per station
- Metrics and logging for station health

## Next (Phase 2)
- Initialize Workers project (wrangler)
- Create KV namespace(s)
- Implement first parser and routes

