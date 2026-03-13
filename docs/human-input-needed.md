# Human Input Needed -- Fuel Finder NL

> Shared file between architect and engineer agents for blockers requiring human decision.
> Date initialized: 2026-03-13

## Pending Actions

### H-001: Cloudflare Account Access
**Status:** Pending
**Blocker for:** T-003 (R2 setup), T-013 (Worker proxy)
**Description:** The engineer agent needs access to a Cloudflare account to create an R2 bucket and deploy a Worker. The Cloudflare account used for A-Journal's infrastructure may be suitable, or a separate free account can be created for this personal project.
**Decision needed:** Which Cloudflare account should be used? Or should a new free account be created?

### H-002: OpenRouteService API Key Registration
**Status:** Pending
**Blocker for:** T-013 (Worker proxy)
**Description:** A free API key needs to be registered at https://openrouteservice.org/dev/#/signup. This requires human action (email verification). The key will be stored as a Cloudflare Worker environment variable.
**Decision needed:** Register and provide the API key.

### H-003: OpenChargeMap API Key Registration
**Status:** Pending
**Blocker for:** T-011 (EV charger pipeline)
**Description:** An API key needs to be registered at https://openchargemap.org/site/loginprovider/beginlogin. Required for fetching >250 results. Free.
**Decision needed:** Register and provide the API key.

### H-004: GitHub Repository Creation
**Status:** Pending
**Blocker for:** T-002 (deploy pipeline)
**Description:** The repo `mauritsajournal/fuel-finder-nl` needs to be created (public for free GitHub Pages). The engineer agent can do this via `gh repo create` if the CLI is authenticated.
**Decision needed:** Confirm repo should be public. Confirm repo name `fuel-finder-nl` is acceptable.

### H-005: App Name and Branding
**Status:** Pending
**Blocker for:** T-010 (theme), T-020 (PWA manifest)
**Description:** The PoC needs a working name and basic branding (color accent, optional logo). Current working name: "Fuel Finder NL". Is this acceptable or should it be something else?
**Decision needed:** Confirm or change the app name.

---

## Resolved

(none yet)
