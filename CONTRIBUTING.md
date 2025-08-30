# Contributing

Thanks for your interest in contributing! This project uses a backend-first architecture with a lightweight firmware client.

## How to Contribute
- Open an issue to propose changes or report bugs
- Fork the repo and create feature branches
- Use conventional commits (feat:, fix:, docs:, chore:)
- Add/update documentation and tests where applicable

## Development
- Backend: TypeScript (Cloudflare Workers)
- Firmware: Arduino/PlatformIO for ESP32C3
- Docs: MkDocs (Phase 5)

## Standards
- Keep payloads ≤ 2 KB for embedded clients
- Follow schemas in /schemas; bump version when adding fields
- Ensure parsers have unit tests and fixtures

