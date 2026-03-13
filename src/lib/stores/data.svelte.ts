/**
 * Reactive data store for fuel stations.
 * Loads tiled JSON from Cloudflare R2 based on map viewport.
 * Caches loaded tiles in memory (never re-fetches within session).
 */

import type { FuelStation, EVCharger, POI, Metadata } from '$lib/types.js';
import { getVisibleTileKeys } from '$lib/utils/tiles.js';
import { PUBLIC_R2_URL } from '$env/static/public';
import { SvelteMap } from 'svelte/reactivity';

// Tile cache: key -> stations
const tileCache = new SvelteMap<string, FuelStation[]>();
const evTileCache = new SvelteMap<string, EVCharger[]>();
const poiTileCache = new SvelteMap<string, POI[]>();

// Reactive state
let stations = $state<FuelStation[]>([]);
let evChargers = $state<EVCharger[]>([]);
let pois = $state<POI[]>([]);
let metadata = $state<Metadata | null>(null);
let loading = $state(false);
let error = $state<string | null>(null);

const R2_BASE = PUBLIC_R2_URL || '';

// Max tiles to fetch per data type to avoid overwhelming R2
const MAX_TILES_PER_LOAD = 20;

// Concurrency limiter: fetch at most N tiles at a time
const CONCURRENCY = 6;
async function fetchWithConcurrency<T>(tasks: (() => Promise<T>)[]): Promise<PromiseSettledResult<T>[]> {
	const results: PromiseSettledResult<T>[] = [];
	let i = 0;
	async function next(): Promise<void> {
		while (i < tasks.length) {
			const idx = i++;
			try {
				const value = await tasks[idx]();
				results[idx] = { status: 'fulfilled', value };
			} catch (reason) {
				results[idx] = { status: 'rejected', reason };
			}
		}
	}
	await Promise.all(Array.from({ length: Math.min(CONCURRENCY, tasks.length) }, () => next()));
	return results;
}

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
	const toFetch = visibleKeys.filter((key) => !tileCache.has(key)).slice(0, MAX_TILES_PER_LOAD);

	if (toFetch.length === 0) return;

	loading = true;
	error = null;

	const results = await fetchWithConcurrency(
		toFetch.map((key) => async () => {
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

/** Get all currently loaded EV chargers */
export function getEVChargers(): EVCharger[] {
	return evChargers;
}

/** Load EV charger tiles visible in the current viewport */
export async function loadVisibleEVTiles(bounds: {
	north: number;
	south: number;
	east: number;
	west: number;
}): Promise<void> {
	if (!R2_BASE) return;

	const visibleKeys = getVisibleTileKeys(bounds);
	const toFetch = visibleKeys.filter((key) => !evTileCache.has(key)).slice(0, MAX_TILES_PER_LOAD);

	if (toFetch.length === 0) return;

	const results = await fetchWithConcurrency(
		toFetch.map((key) => async () => {
			const url = `${R2_BASE}/tiles/ev/${key}.json`;
			const res = await fetch(url);
			if (!res.ok) {
				if (res.status === 404) {
					evTileCache.set(key, []);
					return;
				}
				throw new Error(`HTTP ${res.status} for EV tile ${key}`);
			}
			const data: EVCharger[] = await res.json();
			evTileCache.set(key, data);
		})
	);

	const failures = results.filter((r) => r.status === 'rejected');
	if (failures.length > 0) {
		console.warn(`Failed to load ${failures.length} EV tiles`);
	}

	evChargers = Array.from(evTileCache.values()).flat();
}

/** Get all currently loaded POIs */
export function getPOIs(): POI[] {
	return pois;
}

/** Load POI tiles visible in the current viewport */
export async function loadVisiblePOITiles(bounds: {
	north: number;
	south: number;
	east: number;
	west: number;
}): Promise<void> {
	if (!R2_BASE) return;

	const visibleKeys = getVisibleTileKeys(bounds);
	const toFetch = visibleKeys.filter((key) => !poiTileCache.has(key)).slice(0, MAX_TILES_PER_LOAD);

	if (toFetch.length === 0) return;

	const results = await fetchWithConcurrency(
		toFetch.map((key) => async () => {
			const url = `${R2_BASE}/tiles/poi/${key}.json`;
			const res = await fetch(url);
			if (!res.ok) {
				if (res.status === 404) {
					poiTileCache.set(key, []);
					return;
				}
				throw new Error(`HTTP ${res.status} for POI tile ${key}`);
			}
			const data: POI[] = await res.json();
			poiTileCache.set(key, data);
		})
	);

	const failures = results.filter((r) => r.status === 'rejected');
	if (failures.length > 0) {
		console.warn(`Failed to load ${failures.length} POI tiles`);
	}

	pois = Array.from(poiTileCache.values()).flat();
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
	debounceTimer = setTimeout(() => {
		loadVisibleTiles(bounds);
		loadVisibleEVTiles(bounds);
		loadVisiblePOITiles(bounds);
	}, 300);
}
