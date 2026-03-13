/**
 * Geocoding service (T-018).
 * Calls the Cloudflare Worker proxy for ORS geocoding,
 * scoped to the Netherlands.
 */

import { env } from '$env/dynamic/public';

export interface GeocodingResult {
	label: string;
	region: string;
	lat: number;
	lng: number;
}

const WORKER_URL = env.PUBLIC_WORKER_URL || '';

/**
 * Search for addresses/cities in the Netherlands via the Worker geocoding proxy.
 * Returns up to 5 results.
 */
export async function searchAddress(query: string): Promise<GeocodingResult[]> {
	if (!query || query.length < 2) return [];
	if (!WORKER_URL) {
		console.warn('Worker URL not configured, geocoding unavailable');
		return [];
	}

	try {
		const url = `${WORKER_URL}/geocode?text=${encodeURIComponent(query)}`;
		const res = await fetch(url, {
			signal: AbortSignal.timeout(8_000)
		});

		if (!res.ok) {
			console.warn(`Geocode API returned ${res.status}`);
			return [];
		}

		const data = await res.json();

		// ORS returns GeoJSON FeatureCollection
		const features = data?.features;
		if (!Array.isArray(features)) return [];

		return features
			.slice(0, 5)
			.map((f: { properties?: { label?: string; region?: string }; geometry?: { coordinates?: number[] } }) => {
				const props = f.properties || {};
				const coords = f.geometry?.coordinates;
				if (!coords || coords.length < 2) return null;

				return {
					label: props.label || 'Onbekend',
					region: props.region || '',
					lat: coords[1],
					lng: coords[0]
				};
			})
			.filter((r: GeocodingResult | null): r is GeocodingResult => r !== null);
	} catch (err) {
		console.warn('Geocoding failed:', err);
		return [];
	}
}
