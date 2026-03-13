/**
 * Selected station state for the detail panel.
 */

import type { FuelStation } from '$lib/types.js';

let selected = $state<FuelStation | null>(null);

/** Get the currently selected station */
export function getSelected(): FuelStation | null {
	return selected;
}

/** Select a station (opens detail panel) */
export function selectStation(station: FuelStation): void {
	selected = station;
}

/** Deselect (closes detail panel) */
export function deselectStation(): void {
	selected = null;
}
