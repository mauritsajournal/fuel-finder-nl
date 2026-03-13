/**
 * Route calculation service (T-016).
 * Calls the Cloudflare Worker proxy to get driving routes from ORS.
 * Includes caching in sessionStorage and fallback to straight-line distance.
 */

import { env } from '$env/dynamic/public';

export interface RouteResult {
	/** Route geometry as GeoJSON coordinates */
	coordinates: [number, number][];
	/** Driving distance in meters */
	distanceM: number;
	/** Driving time in seconds */
	durationS: number;
	/** Whether this is a fallback (straight-line) result */
	isFallback: boolean;
}

const WORKER_URL = env.PUBLIC_WORKER_URL || '';
const CACHE_TTL = 3600_000; // 1 hour in ms

/** Debounce state to prevent duplicate requests */
let lastRequestTime = 0;
const DEBOUNCE_MS = 500;

/**
 * Calculate a driving route from start to end coordinates.
 * Falls back to straight-line estimate if the Worker/ORS is unavailable.
 */
export async function calculateRoute(
	startLat: number,
	startLng: number,
	endLat: number,
	endLng: number
): Promise<RouteResult> {
	// Debounce
	const now = Date.now();
	if (now - lastRequestTime < DEBOUNCE_MS) {
		return fallbackRoute(startLat, startLng, endLat, endLng);
	}
	lastRequestTime = now;

	// Check cache
	const cacheKey = `route:${startLng.toFixed(4)},${startLat.toFixed(4)}_${endLng.toFixed(4)},${endLat.toFixed(4)}`;
	const cached = getCachedRoute(cacheKey);
	if (cached) return cached;

	// If Worker URL is not configured, use fallback
	if (!WORKER_URL) {
		console.warn('Worker URL not configured, using straight-line fallback');
		return fallbackRoute(startLat, startLng, endLat, endLng);
	}

	try {
		const start = `${startLng},${startLat}`;
		const end = `${endLng},${endLat}`;
		const url = `${WORKER_URL}/route?start=${start}&end=${end}&profile=driving-car`;

		const res = await fetch(url, {
			signal: AbortSignal.timeout(10_000) // 10s timeout
		});

		if (!res.ok) {
			console.warn(`Route API returned ${res.status}, using fallback`);
			return fallbackRoute(startLat, startLng, endLat, endLng);
		}

		const data = await res.json();

		// ORS returns GeoJSON FeatureCollection
		const feature = data?.features?.[0];
		if (!feature) {
			return fallbackRoute(startLat, startLng, endLat, endLng);
		}

		const coordinates = feature.geometry?.coordinates as [number, number][] | undefined;
		const summary = feature.properties?.summary;

		if (!coordinates || !summary) {
			return fallbackRoute(startLat, startLng, endLat, endLng);
		}

		const result: RouteResult = {
			coordinates,
			distanceM: summary.distance,
			durationS: summary.duration,
			isFallback: false
		};

		// Cache the result
		cacheRoute(cacheKey, result);
		return result;
	} catch (err) {
		console.warn('Route calculation failed, using fallback:', err);
		return fallbackRoute(startLat, startLng, endLat, endLng);
	}
}

/** Clear any displayed route */
export function clearRoute(map: import('maplibre-gl').Map | null): void {
	if (!map) return;

	if (map.getLayer('route-line')) {
		map.removeLayer('route-line');
	}
	if (map.getLayer('route-line-outline')) {
		map.removeLayer('route-line-outline');
	}
	if (map.getSource('route')) {
		map.removeSource('route');
	}
}

/** Display a route on the map as a polyline */
export function displayRoute(
	map: import('maplibre-gl').Map | null,
	coordinates: [number, number][]
): void {
	if (!map || coordinates.length === 0) return;

	// Clear any existing route
	clearRoute(map);

	map.addSource('route', {
		type: 'geojson',
		data: {
			type: 'Feature',
			properties: {},
			geometry: {
				type: 'LineString',
				coordinates
			}
		}
	});

	// Route outline (wider, darker)
	map.addLayer({
		id: 'route-line-outline',
		type: 'line',
		source: 'route',
		layout: {
			'line-join': 'round',
			'line-cap': 'round'
		},
		paint: {
			'line-color': '#1e3a5f',
			'line-width': 8,
			'line-opacity': 0.6
		}
	});

	// Route line (main)
	map.addLayer({
		id: 'route-line',
		type: 'line',
		source: 'route',
		layout: {
			'line-join': 'round',
			'line-cap': 'round'
		},
		paint: {
			'line-color': '#3b82f6',
			'line-width': 4,
			'line-opacity': 0.9
		}
	});
}

/** Format duration in seconds to human-readable string */
export function formatDuration(seconds: number): string {
	if (seconds < 60) return '< 1 min';
	const mins = Math.round(seconds / 60);
	if (mins < 60) return `${mins} min`;
	const hours = Math.floor(mins / 60);
	const remainingMins = mins % 60;
	return `${hours} u ${remainingMins} min`;
}

/** Format distance in meters to human-readable string */
export function formatDistance(meters: number): string {
	if (meters < 1000) return `${Math.round(meters)} m`;
	return `${(meters / 1000).toFixed(1)} km`;
}

// --- Internal helpers ---

/** Haversine distance between two points in meters */
function haversineDistance(
	lat1: number,
	lng1: number,
	lat2: number,
	lng2: number
): number {
	const R = 6_371_000; // Earth radius in meters
	const dLat = ((lat2 - lat1) * Math.PI) / 180;
	const dLng = ((lng2 - lng1) * Math.PI) / 180;
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos((lat1 * Math.PI) / 180) *
			Math.cos((lat2 * Math.PI) / 180) *
			Math.sin(dLng / 2) *
			Math.sin(dLng / 2);
	return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Generate a fallback route using straight-line distance */
function fallbackRoute(
	startLat: number,
	startLng: number,
	endLat: number,
	endLng: number
): RouteResult {
	const distanceM = haversineDistance(startLat, startLng, endLat, endLng);
	// Estimate driving time at 60 km/h average, with 1.3x factor for road vs straight-line
	const estimatedDistanceM = distanceM * 1.3;
	const durationS = estimatedDistanceM / (60_000 / 3600); // 60 km/h in m/s

	return {
		coordinates: [
			[startLng, startLat],
			[endLng, endLat]
		],
		distanceM: estimatedDistanceM,
		durationS,
		isFallback: true
	};
}

/** Get cached route from sessionStorage */
function getCachedRoute(key: string): RouteResult | null {
	try {
		const raw = sessionStorage.getItem(key);
		if (!raw) return null;

		const cached = JSON.parse(raw);
		if (Date.now() - cached.timestamp > CACHE_TTL) {
			sessionStorage.removeItem(key);
			return null;
		}

		return cached.result;
	} catch {
		return null;
	}
}

/** Cache a route result in sessionStorage */
function cacheRoute(key: string, result: RouteResult): void {
	try {
		sessionStorage.setItem(
			key,
			JSON.stringify({
				result,
				timestamp: Date.now()
			})
		);
	} catch {
		// sessionStorage full or unavailable, ignore
	}
}
