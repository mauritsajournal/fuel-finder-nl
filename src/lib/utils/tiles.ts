/**
 * Tile calculation utilities.
 * Tiles are 0.5-degree grid cells. Key format: "lat_lng" (SW corner).
 */

const TILE_SIZE = 0.5;

/** Format a tile coordinate to always include one decimal (e.g. 52 -> "52.0", 52.5 -> "52.5") */
function formatCoord(n: number): string {
	return Number.isInteger(n) ? n.toFixed(1) : String(n);
}

/** Calculate tile key from coordinates */
export function tileKey(lat: number, lng: number): string {
	const tileLat = Math.floor(lat / TILE_SIZE) * TILE_SIZE;
	const tileLng = Math.floor(lng / TILE_SIZE) * TILE_SIZE;
	return `${formatCoord(tileLat)}_${formatCoord(tileLng)}`;
}

/** Get all tile keys visible in a bounding box */
export function getVisibleTileKeys(bounds: {
	north: number;
	south: number;
	east: number;
	west: number;
}): string[] {
	const keys: string[] = [];

	const startLat = Math.floor(bounds.south / TILE_SIZE) * TILE_SIZE;
	const endLat = Math.floor(bounds.north / TILE_SIZE) * TILE_SIZE;
	const startLng = Math.floor(bounds.west / TILE_SIZE) * TILE_SIZE;
	const endLng = Math.floor(bounds.east / TILE_SIZE) * TILE_SIZE;

	for (let lat = startLat; lat <= endLat; lat += TILE_SIZE) {
		for (let lng = startLng; lng <= endLng; lng += TILE_SIZE) {
			keys.push(`${formatCoord(lat)}_${formatCoord(lng)}`);
		}
	}

	return keys;
}
