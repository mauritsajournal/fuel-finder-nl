/** Brand filter store — persisted in localStorage */

const STORAGE_KEY = 'fuel-finder-brand-filter';

let excludedBrands = $state<Set<string>>(load());

function load(): Set<string> {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) return new Set(JSON.parse(raw));
	} catch { /* ignore */ }
	return new Set();
}

function persist() {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify([...excludedBrands]));
	} catch { /* ignore */ }
}

export function isBrandVisible(brand: string): boolean {
	return !excludedBrands.has(brand);
}

export function toggleBrand(brand: string): void {
	if (excludedBrands.has(brand)) {
		excludedBrands.delete(brand);
	} else {
		excludedBrands.add(brand);
	}
	excludedBrands = new Set(excludedBrands);
	persist();
}

export function getExcludedBrands(): Set<string> {
	return excludedBrands;
}

export function getExcludedCount(): number {
	return excludedBrands.size;
}

export function showAllBrands(): void {
	excludedBrands = new Set();
	persist();
}

export function hideAllBrands(allBrands: string[]): void {
	excludedBrands = new Set(allBrands);
	persist();
}
