"""
Split station/charger data into geographic tiles for viewport-based loading.

Each tile covers a 0.5-degree grid cell. Tile key format: "{lat}_{lng}" where
lat/lng are the southwest corner of the tile, rounded to nearest 0.5.

Example: station at (52.37, 4.89) goes into tile "52.0_4.5"

Input:  data/output/stations.json (from fetch_fuel_prices.py)
Output: data/output/tiles/fuel/<lat>_<lng>.json (one file per tile)
        data/output/metadata.json (tile index + timestamps)

Usage:
    python scripts/tile_data.py [--data-type fuel|ev|poi]
"""

import json
import math
import argparse
from datetime import datetime, timezone
from pathlib import Path

TILE_SIZE = 0.5  # degrees
OUTPUT_DIR = Path(__file__).parent.parent / "data" / "output"


def tile_key(lat: float, lng: float) -> str:
    """Calculate tile key from coordinates. Returns 'lat_lng' of SW corner."""
    tile_lat = math.floor(lat / TILE_SIZE) * TILE_SIZE
    tile_lng = math.floor(lng / TILE_SIZE) * TILE_SIZE
    return f"{tile_lat}_{tile_lng}"


def split_into_tiles(stations: list[dict]) -> dict[str, list[dict]]:
    """Split stations into geographic tiles."""
    tiles: dict[str, list[dict]] = {}
    for station in stations:
        key = tile_key(station["lat"], station["lng"])
        if key not in tiles:
            tiles[key] = []
        tiles[key].append(station)
    return tiles


def write_tiles(tiles: dict[str, list[dict]], data_type: str = "fuel") -> list[dict]:
    """Write tile files and return tile index."""
    tiles_dir = OUTPUT_DIR / "tiles" / data_type
    tiles_dir.mkdir(parents=True, exist_ok=True)

    tile_index = []
    for key, stations in sorted(tiles.items()):
        tile_file = tiles_dir / f"{key}.json"
        with open(tile_file, "w") as f:
            json.dump(stations, f, ensure_ascii=False)
        tile_index.append({"key": key, "count": len(stations)})
        print(f"  Tile {key}: {len(stations)} items ({tile_file.stat().st_size:,} bytes)")

    return tile_index


def write_metadata(
    tile_index: list[dict],
    data_type: str,
    total_count: int,
    existing_metadata: dict | None = None,
) -> None:
    """Write or update metadata.json with tile index and timestamps."""
    now = datetime.now(timezone.utc).isoformat()

    if existing_metadata:
        metadata = existing_metadata
    else:
        metadata = {
            "lastUpdated": {"fuel": None, "ev": None, "poi": None},
            "stationCount": 0,
            "chargerCount": 0,
            "tileIndex": [],
        }

    metadata["lastUpdated"][data_type] = now

    if data_type == "fuel":
        metadata["stationCount"] = total_count
    elif data_type == "ev":
        metadata["chargerCount"] = total_count

    # Merge tile index: remove old tiles of this type, add new ones
    prefix = f"{data_type}:"
    metadata["tileIndex"] = [
        t for t in metadata.get("tileIndex", []) if not t.get("key", "").startswith(prefix)
    ]
    metadata["tileIndex"].extend(
        [{"key": f"{data_type}:{t['key']}", "count": t["count"]} for t in tile_index]
    )

    meta_file = OUTPUT_DIR / "metadata.json"
    with open(meta_file, "w") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    print(f"\nMetadata written to {meta_file}")


def main():
    parser = argparse.ArgumentParser(description="Split data into geographic tiles")
    parser.add_argument(
        "--data-type",
        choices=["fuel", "ev", "poi"],
        default="fuel",
        help="Type of data to tile",
    )
    args = parser.parse_args()

    # Determine input file
    if args.data_type == "fuel":
        input_file = OUTPUT_DIR / "stations.json"
    elif args.data_type == "ev":
        input_file = OUTPUT_DIR / "chargers.json"
    else:
        input_file = OUTPUT_DIR / "poi.json"

    if not input_file.exists():
        print(f"ERROR: Input file not found: {input_file}")
        return

    with open(input_file) as f:
        data = json.load(f)

    print(f"Tiling {len(data)} {args.data_type} items into {TILE_SIZE}-degree grid")

    tiles = split_into_tiles(data)
    print(f"Split into {len(tiles)} tiles\n")

    tile_index = write_tiles(tiles, args.data_type)

    # Load existing metadata if present
    meta_file = OUTPUT_DIR / "metadata.json"
    existing_metadata = None
    if meta_file.exists():
        with open(meta_file) as f:
            existing_metadata = json.load(f)

    write_metadata(tile_index, args.data_type, len(data), existing_metadata)

    print(f"\nDone. {len(tiles)} tiles written for {len(data)} {args.data_type} items.")


if __name__ == "__main__":
    main()
