"""
Fetch Points of Interest from OpenStreetMap via the Overpass API.

Fetches driver-relevant POIs in the Netherlands:
- Public toilets (amenity=toilets)
- Rest areas (highway=rest_area)
- Highway services (highway=services)

No API key required. Be respectful of the shared Overpass infrastructure:
- Max 2 queries per run
- 60 second timeout per query
- 1 second delay between queries

Output: data/output/poi.json

Usage:
    python scripts/fetch_poi.py
"""

import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import requests

OVERPASS_API = "https://overpass-api.de/api/interpreter"
OUTPUT_DIR = Path(__file__).parent.parent / "data" / "output"
TIMEOUT = 60
DELAY_SECONDS = 1.0

# Overpass queries scoped to the Netherlands
# Query 1: Toilets near major roads + rest areas + service areas
QUERY_ROAD_POIS = """
[out:json][timeout:60];
area["ISO3166-1"="NL"]->.nl;
(
  node["amenity"="toilets"](area.nl);
  way["amenity"="toilets"](area.nl);
  node["highway"="rest_area"](area.nl);
  way["highway"="rest_area"](area.nl);
  node["highway"="services"](area.nl);
  way["highway"="services"](area.nl);
);
out center;
"""


def fetch_overpass(query: str) -> list[dict]:
    """Execute an Overpass API query and return elements."""
    headers = {
        "User-Agent": "FuelFinderNL/0.1 (github.com/mauritsajournal/fuel-finder-nl)",
        "Accept": "application/json",
    }

    response = requests.post(
        OVERPASS_API,
        data={"data": query.strip()},
        headers=headers,
        timeout=TIMEOUT + 10,
    )
    response.raise_for_status()

    data = response.json()
    elements = data.get("elements", [])
    return elements


def normalize_poi(element: dict) -> dict | None:
    """Convert Overpass element to our POI format."""
    try:
        osm_id = str(element.get("id", ""))
        if not osm_id:
            return None

        # Get coordinates (use 'center' for ways, direct for nodes)
        if element["type"] == "node":
            lat = element.get("lat")
            lng = element.get("lon")
        else:
            center = element.get("center", {})
            lat = center.get("lat")
            lng = center.get("lon")

        if lat is None or lng is None:
            return None

        lat = float(lat)
        lng = float(lng)

        # Validate NL bounds
        if not (50.5 <= lat <= 53.8 and 3.0 <= lng <= 7.5):
            return None

        tags = element.get("tags", {})

        # Determine POI type
        if tags.get("highway") == "services":
            poi_type = "services"
        elif tags.get("highway") == "rest_area":
            poi_type = "rest_area"
        elif tags.get("amenity") == "toilets":
            poi_type = "toilet"
        else:
            return None

        name = tags.get("name", tags.get("description", None))

        return {
            "id": f"osm-{element['type'][0]}{osm_id}",
            "type": poi_type,
            "name": name,
            "lat": lat,
            "lng": lng,
        }

    except Exception as e:
        print(f"  Warning: failed to normalize POI: {e}", file=sys.stderr)
        return None


def main():
    print(f"Starting Overpass POI fetch at {datetime.now(timezone.utc).isoformat()}")

    all_pois: list[dict] = []
    seen_ids: set[str] = set()

    # Query 1: Road POIs (toilets, rest areas, services)
    print("\nFetching road-side POIs (toilets, rest areas, services)...")
    try:
        elements = fetch_overpass(QUERY_ROAD_POIS)
        print(f"  Received {len(elements)} elements")

        for el in elements:
            poi = normalize_poi(el)
            if poi and poi["id"] not in seen_ids:
                seen_ids.add(poi["id"])
                all_pois.append(poi)

    except requests.RequestException as e:
        print(f"  ERROR: {e}", file=sys.stderr)
        # If Overpass fails, check for existing data
        output_file = OUTPUT_DIR / "poi.json"
        if output_file.exists():
            print("  Using existing POI data as fallback")
            return
        else:
            print("  No existing data, exiting", file=sys.stderr)
            sys.exit(1)

    # Count by type
    type_counts: dict[str, int] = {}
    for poi in all_pois:
        t = poi["type"]
        type_counts[t] = type_counts.get(t, 0) + 1

    print(f"\nTotal unique POIs: {len(all_pois)}")
    for t, count in sorted(type_counts.items()):
        print(f"  {t}: {count}")

    # Write output
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_file = OUTPUT_DIR / "poi.json"
    with open(output_file, "w") as f:
        json.dump(all_pois, f, indent=2, ensure_ascii=False)
    print(f"\nWritten to {output_file}")


if __name__ == "__main__":
    main()
