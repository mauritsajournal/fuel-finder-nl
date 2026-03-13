/** Price alert threshold store — persisted in localStorage */

import type { FuelType } from '$lib/types.js';

const STORAGE_KEY = 'fuel-finder-price-alerts';

type Thresholds = Partial<Record<FuelType, number>>;

let thresholds = $state<Thresholds>(load());

function load(): Thresholds {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) return JSON.parse(raw);
	} catch { /* ignore */ }
	return {};
}

function persist() {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(thresholds));
	} catch { /* ignore */ }
}

export function getThreshold(fuelType: FuelType): number | null {
	return thresholds[fuelType] ?? null;
}

export function setThreshold(fuelType: FuelType, price: number): void {
	thresholds = { ...thresholds, [fuelType]: price };
	persist();
}

export function clearThreshold(fuelType: FuelType): void {
	const next = { ...thresholds };
	delete next[fuelType];
	thresholds = next;
	persist();
}

export function hasActiveAlert(): boolean {
	return Object.keys(thresholds).length > 0;
}

export function getAllThresholds(): Thresholds {
	return thresholds;
}
