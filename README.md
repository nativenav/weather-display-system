# Weather Display System

A backend-first architecture for Seeed Studio XIAO ESP32C3 + 7.5" ePaper displays that fetch pre-parsed, lightweight weather data from a cloud API and render it on-device.

## Goals
- Offload parsing and heavy logic to a cloud backend (free tier)
- Keep device firmware lightweight and reliable
- Provide a stable, versioned JSON schema for future apps
- Enable easy addition of new weather stations without reflashing devices

## Project Structure
```
weather-display-system/
  backend/        # Cloudflare Workers + KV (API + parsers)
  firmware/       # Minimal ESP32C3 client for ePaper
  docs/           # Architecture docs and ADRs
  infra/          # Infra notes/placeholders (Workers config in Phase 2)
  schemas/        # Versioned JSON schemas
```

## Quick Start (Phase 1)
- Read docs/ADR-0001.md for architecture decisions
- Review schemas/weather.v1.json
- Firmware and backend implementation begin in Phase 2/3

## Roadmap (High-level)
1. Phase 1: Docs, schema, repo scaffolding (this)
2. Phase 2: Backend (Workers, parsers, API, caching)
3. Phase 3: Firmware client (HTTP GET + display formatting)
4. Phase 4: CI/CD and staging
5. Phase 5: Documentation site and community
6. Phase 6: Mobile app foundation and extensions

