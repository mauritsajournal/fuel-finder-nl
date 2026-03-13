/**
 * Reactive data store for fuel stations.
 * Loads tiled JSON from Cloudflare R2 based on map viewport.
 * Caches loaded tiles in memory (never re-fetches within session).
 */

import type { FuelStation, Metadata } from '$lib/types.js';
import { getVisibleTileKeys } from '$lib/utils/tiles.js';
import { env } from '$env/dynamic/public';

// Tile cache: key -> stations
const tileCache = new Map<string, FuelStation[]>();

// Reactive state
let stations = $state<FuelStation[]>([]);
let metadata = $state<Metadata | null>(null);
let loading = $state(false);
let error = $state<string | null>(null);

const R2_BASE = env.PUBLIC_R2_URL || '';

/** Get all currently loaded stations */
export function getStations(): FuelStation[] {
	return stations;
}

/** Get metadata */
export function getMetadata(): Metadata | null {
	return metadata;
}

/** Check if data is loading */
export function isLoading(): boolean {
	return loading;
}

/** Get current error */
export function getError(): string | null {
	return error;
}

/** Fetch metadata from R2 */
export async function fetchMetadata(): Promise<void> {
	if (!R2_BASE) {
		error = 'R2 URL niet geconfigureerd';
		return;
	}

	try {
		const res = await fetch(`${R2_BASE}/metadata.json`);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		metadata = await res.json();
	} catch (e) {
		error = `Metadata laden mislukt: ${e instanceof Error ? e.message : 'onbekend'}`;
	}
}

/** Load tiles visible in the current viewport */
export async function loadVisibleTiles(bounds: {
	north: number;
	south: number;
	east: number;
	west: number;
}): Promise<void> {
	if (!R2_BASE) return;

	const visibleKeys = getVisibleTileKeys(bounds);
	const toFetch = visibleKeys.filter((key) => !tileCache.has(key));

	if (toFetch.length === 0) return;

	loading = true;
	error = null;

	const results = await Promise.allSettled(
		toFetch.map(async (key) => {
			const url = `${R2_BASE}/tiles/fuel/${key}.json`;
			const res = await fetch(url);
			if (!res.ok) {
				if (res.status === 404) {
					// Tile doesn't exist (no stations in this area)
					tileCache.set(key, []);
					return;
				}
				throw new Error(`HTTP ${res.status} for tile ${key}`);
			}
			const data: FuelStation[] = await res.json();
			tileCache.set(key, data);
		})
	);

	// Log failures but don't block
	const failures = results.filter((r) => r.status === 'rejected');
	if (failures.length > 0) {
		console.warn(`Failed to load ${failures.length} tiles`);
	}

	// Rebuild stations array from all cached tiles
	stations = Array.from(tileCache.values()).flat();
	loading = false;
}

/** Debounced tile loader for map moveend events */
let debounceTimer: ReturnType<typeof setTimeout> | undefined;

export function debouncedLoadTiles(bounds: {
	north: number;
	south: number;
	east: number;
	west: number;
}): void {
	clearTimeout(debounceTimer);
	debounceTimer = setTimeout(() => loadVisibleTiles(bounds), 300);
}
