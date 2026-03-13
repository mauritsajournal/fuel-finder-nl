# Critical Review: Fuel Finder NL Research Report & Technical Blueprint

## Findings

### CRITICAL

**C1. Reliance on Reverse-Engineered APIs Without Legal Assessment**
Both documents treat ANWB and DirectLease APIs as viable data sources despite being reverse-engineered, undocumented, and unauthorized. There is no mention of Terms of Service compliance. Scraping commercial APIs without permission is a legal risk in the EU (database rights under EU Directive 96/9/EC). The entire product's core value proposition depends on data sources that could send a cease-and-desist at any time -- and unlike a personal Home Assistant integration, this is intended as a public-facing product/pitch tool.

**C2. JSON Data Committed to Git is an Anti-Pattern at Scale**
The blueprint commits 6-10MB of JSON data to the git repo every 4 hours. Over a month that's ~180 commits of binary-ish data, bloating the repo to hundreds of MB within months. Git is not a database. This was perhaps acceptable for FPL Draft Dashboard with small datasets, but 4000 fuel stations + 30k EV chargers + POIs is a different scale. The repo will become uncloneable. GitHub Pages also has a 1GB repo size soft limit.

**C3. Client-Side API Key Exposure Understated**
The blueprint says exposing the OpenRouteService API key client-side is "acceptable -- it is domain-restricted." Domain restriction on a client-side key is trivially bypassed (set Referer header). Anyone can extract the key from the JS bundle and exhaust the 2,000/day quota, effectively DoS-ing the routing feature for all users. This is not a theoretical risk -- it's a known attack on free-tier API keys in public repos.

---

### MAJOR

**M1. 30k EV Charger Records Loaded in Browser is a Performance Problem**
The blueprint plans to fetch `ev-chargers.json` (3-5MB) on app load into a Svelte store. On a 4G connection, that's 2-4 seconds just for EV data. Combined with fuel stations (1-2MB) and POI (2-3MB), you're looking at 6-10MB of JSON parsed on load. This directly contradicts NFR-004 (page load under 3 seconds on 4G). The "load data lazily on first map interaction" note in Section 3.6 contradicts the "fetch on load" statement in Section 4.3 -- which is it?

**M2. OpenFreeMap is a Single-Person Project**
The research report lists OpenFreeMap (~2000 stars) as having "no limits, no key" but fails to note it's maintained by a single developer (hyperknot). The fallback plan ("tiles are self-hostable") is meaningless for a zero-budget project -- self-hosting vector tiles requires significant infrastructure. A more realistic fallback would be MapTiler free tier (limited) or Stadia Maps free tier.

**M3. DirectLease Checksum Authentication is Fragile**
The report acknowledges DirectLease requires "checksum generation" but underplays the risk. The SHA-1 checksum algorithm was reverse-engineered and can change at any time without notice. The blueprint's mitigation ("reference pyfuelprices library for updates") assumes the community will notice and fix changes quickly. For a product pitch, relying on a ~50-star library's community responsiveness is not a mitigation.

**M4. No Offline Strategy Despite PWA Ambitions**
D-018 calls for PWA with service worker, but neither document discusses offline data caching strategy. A PWA without offline capability is just a homescreen bookmark. Which data gets cached? How large is the cache? How do you handle stale cached data vs. fresh data? If PWA is a "quick win," the documents should at least sketch the caching strategy.

**M5. GitHub Actions Cron Reliability is Worse Than Stated**
The risk table rates "GitHub Actions cron becomes unreliable" as "Low" likelihood. In practice, GitHub Actions cron jobs are notoriously unreliable -- they can be delayed by 15-60 minutes, and GitHub explicitly states scheduled workflows can be disabled after 60 days of repo inactivity. For a PoC that may sit idle between demos, this is a real problem. The mitigation should include `workflow_dispatch` with a manual "refresh data" button in the app.

**M6. No Data Validation Between Pipeline and Frontend**
The blueprint mentions "schema check, reject corrupt data" in the security section but provides no detail. What happens when the frontend loads `fuel-stations.json` and it's malformed because the ANWB API changed its response format? The pipeline has no schema validation step either. A corrupt commit could break the live site until the next successful run.

---

### MINOR

**m1. Inconsistent Effort Estimates**
The research report estimates 44-62 hours total. Phase 1 alone is scoped at 2 weeks. If this is a side project at ~2h/day, Phase 1 is 28h -- already more than half the total estimate for what's roughly half the features. The 3-phase timeline (4 weeks) implies ~10h/week, making the total ~40h, which is below the low end of the effort estimate. These numbers don't reconcile.

**m2. Overpass API Query Will Return Too Much Data**
The POI query fetches ALL playgrounds, toilets, picnic sites, rest areas, and viewpoints in the Netherlands. That's potentially tens of thousands of nodes. The blueprint estimates 2-3MB but doesn't validate this. Playgrounds alone number ~15,000 in OSM for NL. The relevance of showing every playground in the country on a fuel finder app is questionable.

**m3. Market Analysis Misses Key Competitor**
The analysis omits **Brandstof-Zoeker.nl**, which is specifically mentioned in the open source section (Carbu_com HA integration uses it). It's a direct NL fuel price comparison site. Also missing: **United Consumers** app (NL fuel price comparison with routing).

**m4. "Short Property Names in JSON" is Premature Optimization**
The blueprint suggests using short property names for mobile bandwidth. This hurts readability and debuggability for zero meaningful gain when gzip is in play. Gzip compresses repeated JSON keys extremely well. Don't sacrifice developer experience for imaginary bandwidth savings.

**m5. No Mention of Map Style Customization Effort**
The blueprint assumes a dark-themed map is trivially available. OpenFreeMap serves standard OSM styles. Creating a custom dark glassmorphism-compatible map style for MapLibre is a non-trivial design task (JSON style spec, color tuning, label legibility). This effort is not reflected in the estimates.

**m6. Dual Workflow vs. Combined Workflow Contradiction**
Section 7 shows two separate workflows (`data-pipeline.yml` and `deploy.yml`) but then notes "merge both into a single workflow to avoid GITHUB_TOKEN permission issues." Which approach is being taken? The blueprint should be definitive.

**m7. Testing Coverage Target is Arbitrary**
"70% coverage for data processing utilities" is stated without justification. Coverage targets are meaningless without specifying what the critical paths are. The merging/deduplication logic is the most failure-prone code and should be 100% covered. UI components don't need coverage targets.

---

### SUGGESTIONS

**S1. Consider Cloudflare Workers + KV Instead of Git-Committed JSON**
For zero cost, Cloudflare Workers (100k requests/day free) with KV storage (1GB free) would solve the git bloat problem (C2), provide proper data storage, and allow the data pipeline to write to KV instead of committing to git. The frontend fetches from Workers endpoints. This is a cleaner architecture for the same price (EUR 0).

**S2. Tile-Based Data Loading Instead of Full-Country JSON**
Instead of loading all 4000 stations at once, split data into geographic tiles (e.g., by province or grid squares). Load only tiles visible in the current map viewport. This solves the M1 performance issue and scales better for European expansion.

**S3. Add a "Data Health" Dashboard**
Since the entire app depends on scraped data from unofficial APIs, add a simple status page or indicator showing: last successful fetch per source, number of stations returned, any errors. This helps diagnose data staleness quickly during demos.

**S4. Evaluate Protomaps for Self-Hostable Tiles**
Protomaps allows serving a single .pmtiles file from any static host (including GitHub Pages). This eliminates the OpenFreeMap dependency (M2) entirely. A Netherlands-only extract is ~500MB, which could be hosted on GitHub releases or R2 (free tier).

**S5. Drop DirectLease from PoC Scope Entirely**
The report recommends "start with ANWB, add DirectLease incrementally." Given the checksum fragility (M3) and the legal risk (C1), consider dropping DirectLease from the PoC scope entirely. ANWB alone provides sufficient data for a convincing demo. Add DirectLease only if ANWB proves insufficient.

**S6. Add Rate Limit Tracking for ORS**
Since the ORS API key is exposed client-side (C3), implement client-side tracking of API calls (counter in localStorage). Warn the user when approaching the daily limit rather than silently failing. Better yet, proxy routing through a Cloudflare Worker to hide the key.

---

## Summary of Findings

| Severity | Count | Key Themes |
|---|---|---|
| Critical | 3 | Legal risk of API scraping, git as database anti-pattern, API key exposure |
| Major | 6 | Performance at scale, single-point dependencies, missing offline strategy, data validation gaps |
| Minor | 7 | Estimate inconsistencies, scope creep (POIs), missing competitors, contradictions in blueprint |
| Suggestion | 6 | Cloudflare Workers alternative, tile-based loading, drop DirectLease from PoC |

## Overall Verdict: **Needs Revision**

The core concept is sound and the market gap is real. The technology choices are generally appropriate. However, three issues must be addressed before implementation:

1. **Legal assessment of API usage** (C1) -- At minimum, document the risk and have a plan for when (not if) an API breaks or sends a C&D. For a product pitch, this is a credibility issue.
2. **Replace git-committed JSON with proper data storage** (C2) -- Cloudflare KV, R2, or even GitHub Releases would all work better. This is an architectural flaw, not a nitpick.
3. **Resolve the data loading performance problem** (M1) -- 6-10MB of JSON on mobile load is a non-starter for a "modern, polished" app. Needs viewport-based loading or data tiling.

The blueprint is otherwise well-structured and the phased approach is sensible. Fix these three issues and it's ready to build.
