# Fuel Finder NL -- Claude Code Instructions

## Project
Interactive map to find the cheapest fuel stations in the Netherlands. Includes EV charging stations, facilities, and route calculation. Static SvelteKit site + GitHub Actions data pipeline + Cloudflare R2 + Cloudflare Worker.

## Tech Stack
- **Framework:** SvelteKit 2.x (static adapter for GitHub Pages)
- **Components:** Svelte 5 with runes
- **Styling:** Tailwind CSS 4 (dark glassmorphism theme)
- **Map:** MapLibre GL JS + OpenFreeMap vector tiles
- **Data Pipeline:** Python scripts run via GitHub Actions cron
- **Data Storage:** Cloudflare R2 (tiled JSON)
- **Routing Proxy:** Cloudflare Worker (protects ORS API key)
- **Hosting:** GitHub Pages (free)
- **Testing:** Vitest
- **Package Manager:** pnpm

## Commands
```bash
pnpm dev          # Start dev server
pnpm build        # Build static site to build/
pnpm preview      # Preview production build
pnpm check        # TypeScript + Svelte type checking
pnpm test         # Run Vitest tests
pnpm lint         # ESLint
pnpm format       # Prettier
```

## Folder Structure
```
src/
  routes/           -- SvelteKit pages
  lib/
    components/     -- Svelte components (Map, StationPanel, FilterBar, etc.)
    stores/         -- Svelte 5 reactive stores ($state runes)
    services/       -- API service layer (routing, geocoding)
    utils/          -- Utility functions (tiles, price-colors)
    types.ts        -- TypeScript interfaces (FuelStation, EVCharger, POI, Metadata)
    styles/         -- Custom map styles
static/             -- Static assets (favicon, icons, manifest)
scripts/            -- Python data pipeline scripts
worker/             -- Cloudflare Worker source (routing proxy)
tests/              -- Vitest tests
docs/               -- Architecture docs, tickets, research
```

## Key Configuration
- `svelte.config.js`: adapter-static with `paths.base = '/fuel-finder-nl'` in production
- `vite.config.ts`: Tailwind via `@tailwindcss/vite` plugin
- `src/routes/+layout.ts`: `prerender = true`, `ssr = false` for static SPA
- `.env.example`: `PUBLIC_R2_URL`, `PUBLIC_WORKER_URL`

## Conventions
- Svelte 5 runes (`$state`, `$derived`, `$effect`) for all reactivity
- Glassmorphism dark theme: `bg-[rgba(255,255,255,0.05)]`, `backdrop-blur-lg`, `border-white/10`
- All prices in EUR/liter, 3 decimal places
- Data types defined in `src/lib/types.ts`
- Dutch locale (NL) for user-facing text, English for code
- MapLibre components use `onMount` for browser-only initialization
- Commit format: `feat(#T-XXX): description` or `fix(#T-XXX): description`

## Data Flow
1. GitHub Actions cron (every 4h) runs Python scripts
2. Scripts fetch ANWB fuel prices, OpenChargeMap EV data, Overpass POIs
3. Data split into 0.5-degree geographic tiles
4. Tiles uploaded to Cloudflare R2
5. Browser loads only visible tiles based on map viewport
6. Routing requests proxied through Cloudflare Worker to ORS API

## GitHub Pages
- Deployed via GitHub Actions on push to main
- Base path: `/fuel-finder-nl`
- URL: `https://mauritsajournal.github.io/fuel-finder-nl/`
