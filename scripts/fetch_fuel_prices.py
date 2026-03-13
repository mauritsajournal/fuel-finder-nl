"""
Fetch fuel station data from ANWB API.

The ANWB API returns fuel stations within a geographic bounding box.
We cover the Netherlands with ~6 overlapping bounding boxes and deduplicate.

ANWB API endpoint:
    GET https://api.anwb.nl/routing/points-of-interest/v3/all
    ?type-filter=FUEL_STATION
    &bounding-box-filter={south},{west},{north},{east}

No authentication required. Be respectful: 1 second delay between requests.

Output: data/output/stations.json (all stations, deduplicated)
"""

import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import requests

# Netherlands bounding box: 50.7-53.6N, 3.3-7.3E
# Split into 6 overlapping boxes for API coverage
NL_GEOBOXES = [
    # (south, west, north, east)
    (50.7, 3.3, 51.7, 5.3),   # South-West (Zeeland, Noord-Brabant west)
    (50.7, 5.3, 51.7, 7.3),   # South-East (Noord-Brabant east, Limburg)
    (51.5, 3.3, 52.5, 5.3),   # Central-West (Zuid-Holland, Utrecht)
    (51.5, 5.3, 52.5, 7.3),   # Central-East (Gelderland, Overijssel south)
    (52.3, 3.3, 53.6, 5.3),   # North-West (Noord-Holland, Friesland west)
    (52.3, 5.3, 53.6, 7.3),   # North-East (Drenthe, Groningen)
]

API_BASE = "https://api.anwb.nl/routing/points-of-interest/v3/all"
DELAY_SECONDS = 1.0
OUTPUT_DIR = Path(__file__).parent.parent / "data" / "output"


def fetch_geobox(session: requests.Session, south: float, west: float, north: float, east: float) -> list[dict]:
    """Fetch fuel stations within a bounding box."""
    params = {
        "type-filter": "FUEL_STATION",
        "bounding-box-filter": f"{south},{west},{north},{east}",
    }
    headers = {
        "User-Agent": "FuelFinderNL/0.1 (github.com/mauritsajournal/fuel-finder-nl)",
        "Accept": "application/json",
    }

    response = session.get(API_BASE, params=params, headers=headers, timeout=30)
    response.raise_for_status()

    data = response.json()

    # API returns list of POI objects
    if isinstance(data, list):
        return data
    elif isinstance(data, dict) and "pois" in data:
        return data["pois"]
    elif isinstance(data, dict) and "locations" in data:
        return data["locations"]
    else:
        # Try to find the list of stations in the response
        print(f"  Warning: unexpected response structure. Keys: {list(data.keys()) if isinstance(data, dict) else type(data)}", file=sys.stderr)
        return data if isinstance(data, list) else []


def normalize_station(raw: dict) -> dict | None:
    """Convert ANWB API station to our FuelStation format."""
    try:
        station_id = str(raw.get("id", raw.get("uuid", "")))
        if not station_id:
            return None

        # Extract coordinates
        coords = raw.get("coordinates", raw.get("location", raw.get("geo", {})))
        lat = coords.get("latitude", coords.get("lat"))
        lng = coords.get("longitude", coords.get("lng", coords.get("lon")))

        if lat is None or lng is None:
            return None

        lat = float(lat)
        lng = float(lng)

        # Validate NL bounds (with some margin)
        if not (50.5 <= lat <= 53.8 and 3.0 <= lng <= 7.5):
            return None

        # Extract name and brand
        name = raw.get("title", raw.get("name", "Onbekend"))
        brand = raw.get("brand", raw.get("operator", name.split()[0] if name else ""))

        # Extract address
        address_raw = raw.get("address", {})
        address = {
            "street": address_raw.get("street", address_raw.get("streetName", "")),
            "city": address_raw.get("city", address_raw.get("place", "")),
            "postalCode": address_raw.get("postalCode", address_raw.get("zipCode", "")),
        }

        # Extract prices
        prices = []
        price_data = raw.get("prices", raw.get("fuelPrices", []))
        for p in price_data:
            fuel_type = normalize_fuel_type(p.get("fuelType", p.get("type", "")))
            value = p.get("value", p.get("price"))
            if fuel_type and value is not None:
                try:
                    price_val = round(float(value), 3)
                    if 0.5 < price_val < 5.0:  # Sanity check EUR/liter
                        prices.append({"fuelType": fuel_type, "price": price_val})
                except (ValueError, TypeError):
                    continue

        if not prices:
            return None

        # Extract facilities
        facilities = []
        for facility in raw.get("facilities", raw.get("services", [])):
            if isinstance(facility, str):
                facilities.append(facility.lower())
            elif isinstance(facility, dict):
                facilities.append(facility.get("type", facility.get("name", "")).lower())

        return {
            "id": station_id,
            "name": name,
            "brand": brand,
            "address": address,
            "lat": lat,
            "lng": lng,
            "prices": prices,
            "facilities": facilities,
            "lastUpdated": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        print(f"  Warning: failed to normalize station: {e}", file=sys.stderr)
        return None


def normalize_fuel_type(raw_type: str) -> str | None:
    """Map ANWB fuel type names to our standard types."""
    mapping = {
        "euro95": "euro95",
        "euro 95": "euro95",
        "e10": "euro95",
        "super": "euro95",
        "euro98": "euro98",
        "euro 98": "euro98",
        "super plus": "euro98",
        "v-power": "euro98",
        "diesel": "diesel",
        "b7": "diesel",
        "lpg": "lpg",
        "autogas": "lpg",
    }
    return mapping.get(raw_type.lower().strip())


def fetch_all_stations() -> list[dict]:
    """Fetch stations from all geoboxes and deduplicate."""
    session = requests.Session()
    all_raw: list[dict] = []

    for i, (south, west, north, east) in enumerate(NL_GEOBOXES):
        print(f"Fetching geobox {i+1}/{len(NL_GEOBOXES)}: ({south},{west}) to ({north},{east})")
        try:
            stations = fetch_geobox(session, south, west, north, east)
            print(f"  Found {len(stations)} stations")
            all_raw.extend(stations)
        except requests.RequestException as e:
            print(f"  ERROR: {e}", file=sys.stderr)

        if i < len(NL_GEOBOXES) - 1:
            time.sleep(DELAY_SECONDS)

    # Deduplicate by station ID
    seen: set[str] = set()
    unique: list[dict] = []
    for raw in all_raw:
        normalized = normalize_station(raw)
        if normalized and normalized["id"] not in seen:
            seen.add(normalized["id"])
            unique.append(normalized)

    return unique


def main():
    print(f"Starting ANWB fuel price fetch at {datetime.now(timezone.utc).isoformat()}")
    print(f"Querying {len(NL_GEOBOXES)} geoboxes covering the Netherlands\n")

    stations = fetch_all_stations()

    print(f"\nTotal unique stations: {len(stations)}")

    if len(stations) < 100:
        print("WARNING: Fewer than 100 stations found. API may have changed.", file=sys.stderr)

    # Validate: each station has at least one price
    valid = [s for s in stations if len(s["prices"]) > 0]
    print(f"Stations with prices: {len(valid)}")

    # Write output
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_file = OUTPUT_DIR / "stations.json"
    with open(output_file, "w") as f:
        json.dump(valid, f, indent=2, ensure_ascii=False)
    print(f"\nWritten to {output_file}")

    return valid


if __name__ == "__main__":
    main()
