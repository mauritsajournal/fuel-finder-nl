"""
Fetch EV charging station data from OpenChargeMap API.

OpenChargeMap API endpoint:
    GET https://api.openchargemap.io/v3/poi/
    ?output=json&countrycode=NL&maxresults=10000&compact=true&verbose=false&key={KEY}

Requires API key (OCM_API_KEY environment variable) for >250 results.
May need multiple paginated requests if >10,000 results.

Output: data/output/chargers.json (all chargers, deduplicated)
"""

import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import requests

API_BASE = "https://api.openchargemap.io/v3/poi/"
PAGE_SIZE = 5000  # max results per request
DELAY_SECONDS = 1.5  # be respectful to public API
OUTPUT_DIR = Path(__file__).parent.parent / "data" / "output"

# Connector type mappings from OpenChargeMap ConnectionTypeID to readable labels
CONNECTOR_TYPES: dict[int, str] = {
    1: "Type 1 (J1772)",
    2: "CHAdeMO",
    25: "Type 2 (Mennekes)",
    27: "Tesla Supercharger",
    28: "Tesla (Roadster)",
    30: "Tesla (Model S/X)",
    32: "CCS (Type 1)",
    33: "CCS (Type 2)",
    36: "Type 2 (Socket)",
    0: "Unknown",
    1036: "Type 2 (Tethered)",
}

# Status type mappings from OpenChargeMap StatusTypeID
STATUS_TYPES: dict[int, str] = {
    0: "unknown",
    10: "currently_unavailable",
    20: "planned",
    30: "temporarily_unavailable",
    50: "operational",
    75: "partly_operational",
    100: "not_operational",
    150: "no_longer_operational",
    200: "removed",
}


def get_api_key() -> str:
    """Get OpenChargeMap API key from environment."""
    key = os.environ.get("OCM_API_KEY", "")
    if not key:
        print("WARNING: OCM_API_KEY not set. API may limit results to 250.", file=sys.stderr)
    return key


def fetch_page(session: requests.Session, api_key: str, offset: int = 0) -> list[dict]:
    """Fetch a page of EV chargers from OpenChargeMap."""
    params: dict[str, str | int] = {
        "output": "json",
        "countrycode": "NL",
        "maxresults": PAGE_SIZE,
        "compact": "true",
        "verbose": "false",
    }
    if offset > 0:
        params["offset"] = offset  # undocumented but works

    headers = {
        "User-Agent": "FuelFinderNL/0.1 (github.com/mauritsajournal/fuel-finder-nl)",
        "Accept": "application/json",
    }

    if api_key:
        headers["X-API-Key"] = api_key

    response = session.get(API_BASE, params=params, headers=headers, timeout=60)
    response.raise_for_status()

    data = response.json()
    if not isinstance(data, list):
        print(f"  Warning: unexpected response type: {type(data)}", file=sys.stderr)
        return []

    return data


def normalize_connector(conn: dict) -> dict | None:
    """Normalize a single connection/connector entry."""
    try:
        conn_type_id = conn.get("ConnectionTypeID", 0)
        conn_type = CONNECTOR_TYPES.get(conn_type_id, f"Type {conn_type_id}")

        # Power level
        power_kw = conn.get("PowerKW")
        if power_kw is None:
            # Try to calculate from voltage and amps
            voltage = conn.get("Voltage")
            amps = conn.get("Amps")
            if voltage and amps:
                power_kw = round(float(voltage) * float(amps) / 1000, 1)
            else:
                power_kw = 0

        power_kw = float(power_kw) if power_kw else 0

        quantity = conn.get("Quantity", 1) or 1

        return {
            "type": conn_type,
            "powerKW": round(power_kw, 1),
            "quantity": int(quantity),
        }
    except (ValueError, TypeError) as e:
        print(f"  Warning: failed to normalize connector: {e}", file=sys.stderr)
        return None


def normalize_charger(raw: dict) -> dict | None:
    """Convert OpenChargeMap POI to our EVCharger format."""
    try:
        charger_id = str(raw.get("ID", ""))
        if not charger_id:
            return None

        # Address info contains coordinates
        address = raw.get("AddressInfo", {})
        if not address:
            return None

        lat = address.get("Latitude")
        lng = address.get("Longitude")
        if lat is None or lng is None:
            return None

        lat = float(lat)
        lng = float(lng)

        # Validate NL bounds (with margin)
        if not (50.5 <= lat <= 53.8 and 3.0 <= lng <= 7.5):
            return None

        # Operator
        operator_info = raw.get("OperatorInfo") or raw.get("OperatorID")
        if isinstance(operator_info, dict):
            operator = operator_info.get("Title", "Onbekend")
        else:
            operator = "Onbekend"

        # Connections/connectors
        connections = raw.get("Connections", []) or []
        connectors = []
        for conn in connections:
            normalized = normalize_connector(conn)
            if normalized:
                connectors.append(normalized)

        if not connectors:
            return None

        # Usage/pricing
        pricing = raw.get("UsageCost") or None
        if pricing and isinstance(pricing, str):
            pricing = pricing.strip()[:200]  # cap length

        # Status
        status_type = raw.get("StatusType") or {}
        if isinstance(status_type, dict):
            status_id = status_type.get("ID", 0)
        else:
            status_id = raw.get("StatusTypeID", 0) or 0
        status = STATUS_TYPES.get(int(status_id), "unknown")

        # Skip removed/decommissioned chargers
        if status in ("removed", "no_longer_operational", "not_operational"):
            return None

        # Last updated
        date_last_verified = raw.get("DateLastVerified") or raw.get("DateLastStatusUpdate")
        last_updated = date_last_verified or datetime.now(timezone.utc).isoformat()

        return {
            "id": charger_id,
            "operator": operator,
            "lat": lat,
            "lng": lng,
            "connectors": connectors,
            "pricing": pricing,
            "status": status,
            "lastUpdated": last_updated,
        }
    except Exception as e:
        print(f"  Warning: failed to normalize charger: {e}", file=sys.stderr)
        return None


def fetch_all_chargers() -> list[dict]:
    """Fetch all NL chargers with pagination and deduplication."""
    api_key = get_api_key()
    session = requests.Session()

    all_chargers: list[dict] = []
    offset = 0
    page = 1

    while True:
        print(f"Fetching page {page} (offset={offset}, page_size={PAGE_SIZE})")
        try:
            raw_page = fetch_page(session, api_key, offset)
            print(f"  Received {len(raw_page)} results")

            if not raw_page:
                break

            all_chargers.extend(raw_page)
            offset += len(raw_page)
            page += 1

            # If we got fewer results than page size, we're done
            if len(raw_page) < PAGE_SIZE:
                break

            time.sleep(DELAY_SECONDS)
        except requests.RequestException as e:
            print(f"  ERROR on page {page}: {e}", file=sys.stderr)
            break

    # Normalize and deduplicate
    seen: set[str] = set()
    unique: list[dict] = []
    for raw in all_chargers:
        normalized = normalize_charger(raw)
        if normalized and normalized["id"] not in seen:
            seen.add(normalized["id"])
            unique.append(normalized)

    return unique


def main():
    print(f"Starting OpenChargeMap EV charger fetch at {datetime.now(timezone.utc).isoformat()}")
    print(f"API key: {'set' if get_api_key() else 'NOT SET'}\n")

    chargers = fetch_all_chargers()

    print(f"\nTotal unique chargers: {len(chargers)}")

    if len(chargers) < 100:
        print("WARNING: Fewer than 100 chargers found. API may have issues.", file=sys.stderr)

    # Count total charging points (sum of connector quantities)
    total_points = sum(
        sum(c["quantity"] for c in charger["connectors"])
        for charger in chargers
    )
    print(f"Total charging points: {total_points}")

    # Status breakdown
    status_counts: dict[str, int] = {}
    for c in chargers:
        status_counts[c["status"]] = status_counts.get(c["status"], 0) + 1
    print(f"Status breakdown: {json.dumps(status_counts, indent=2)}")

    # Write output
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_file = OUTPUT_DIR / "chargers.json"
    with open(output_file, "w") as f:
        json.dump(chargers, f, indent=2, ensure_ascii=False)
    print(f"\nWritten to {output_file}")

    return chargers


if __name__ == "__main__":
    main()
