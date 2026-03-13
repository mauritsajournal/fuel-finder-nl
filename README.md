# Fuel Finder NL

> Find the cheapest fuel stations in the Netherlands on an interactive map. Includes EV charging stations, facilities, and route calculation.

**Live:** [mauritsajournal.github.io/fuel-finder-nl](https://mauritsajournal.github.io/fuel-finder-nl/)

## Status

MVP in development. Frontend scaffolding complete, data pipeline scripts ready, Worker proxy coded. Waiting on Cloudflare R2 bucket and API keys for full deployment.

## Quick Start

```bash
pnpm install
pnpm dev          # Start dev server at localhost:5173
pnpm build        # Build static site to build/
pnpm test         # Run Vitest tests (22 passing)
pnpm check        # TypeScript + Svelte type checking
```

## Architecture

Static SvelteKit site on GitHub Pages + GitHub Actions data pipeline + Cloudflare R2 storage + Cloudflare Worker routing proxy. Zero operational cost.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | SvelteKit 2 + Svelte 5 + TypeScript |
| Styling | Tailwind CSS 4 (glassmorphism dark theme) |
| Map | MapLibre GL JS 5 + OpenFreeMap vector tiles |
| Data Pipeline | GitHub Actions + Python |
| Data Storage | Cloudflare R2 (free tier) |
| Routing Proxy | Cloudflare Workers (free tier) |
| Routing API | OpenRouteService (free tier) |
| Hosting | GitHub Pages (free) |

## Documentation

- [Research Report](docs/research-report.md) -- Market analysis, technology evaluation
- [Technical Blueprint](docs/technical-blueprint.md) -- Architecture, component design
- [Verification Review](docs/verification-review.md) -- Independent technical review
- [Tickets](docs/tickets.md) -- Development backlog
- [Human Input Needed](docs/human-input-needed.md) -- Blockers requiring human decision
