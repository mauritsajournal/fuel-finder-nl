/**
 * Filter state store (T-017).
 * Manages active fuel type filter and sort mode.
 * State is shared across components via exported functions.
 */

import type { FuelType } from '$lib/types.js';

export type FilterType = FuelType | 'electric';
export type SortMode = 'cheapest' | 'nearest';

let activeFuelType = $state<FilterType>('euro95');
let sortMode = $state<SortMode>('cheapest');

/** Get the active fuel type filter */
export function getActiveFuelType(): FilterType {
	return activeFuelType;
}

/** Set the active fuel type filter */
export function setActiveFuelType(type: FilterType): void {
	activeFuelType = type;
}

/** Get the current sort mode */
export function getSortMode(): SortMode {
	return sortMode;
}

/** Set the sort mode */
export function setSortMode(mode: SortMode): void {
	sortMode = mode;
}

/** Check if the active filter is for EV chargers (hides fuel markers) */
export function isElectricFilter(): boolean {
	return activeFuelType === 'electric';
}

/** Get the fuel type for price calculations (excludes 'electric') */
export function getActivePriceFuelType(): FuelType {
	if (activeFuelType === 'electric') return 'euro95';
	return activeFuelType;
}
