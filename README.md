# Fuel Finder NL

> Find the cheapest fuel stations in the Netherlands on an interactive map. Includes EV charging stations, facilities, and route calculation.

## Status

In planning -- tickets are being created by the architect agent.

## Documentation

- [Research Report](docs/research-report.md) -- Market analysis, technology evaluation, cost estimation
- [Technical Blueprint](docs/technical-blueprint.md) -- Architecture, component design, integration specs
- [Verification Review](docs/verification-review.md) -- Independent technical review findings
- [Tickets](docs/tickets.md) -- Detailed ticket backlog for implementation
- [Human Input Needed](docs/human-input-needed.md) -- Blockers requiring human decision

## Architecture

Static SvelteKit site on GitHub Pages + GitHub Actions data pipeline + Cloudflare R2 storage + Cloudflare Worker routing proxy. Zero operational cost.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | SvelteKit 2 + Svelte 5 + TypeScript |
| Styling | Tailwind CSS 4 (glassmorphism dark theme) |
| Map | MapLibre GL JS + OpenFreeMap vector tiles |
| Data Pipeline | GitHub Actions + Python |
| Data Storage | Cloudflare R2 (free tier) |
| Routing Proxy | Cloudflare Workers (free tier) |
| Routing API | OpenRouteService (free tier) |
| Hosting | GitHub Pages (free) |

## Quick Start

> To be filled in by the engineer agent after initial setup is complete.
