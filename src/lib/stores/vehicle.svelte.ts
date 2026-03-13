/** Vehicle settings store — persisted in localStorage */

const STORAGE_KEY = 'fuel-finder-vehicle';

interface VehicleSettings {
	consumption: number; // L/100km
	tankSize: number;    // liters
}

const DEFAULTS: VehicleSettings = { consumption: 7.0, tankSize: 50 };

let settings = $state<VehicleSettings>(load());

function load(): VehicleSettings {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
	} catch { /* ignore */ }
	return { ...DEFAULTS };
}

function persist() {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
	} catch { /* ignore */ }
}

export function getVehicle(): VehicleSettings {
	return settings;
}

export function setConsumption(val: number): void {
	settings = { ...settings, consumption: Math.max(1, Math.min(30, val)) };
	persist();
}

export function setTankSize(val: number): void {
	settings = { ...settings, tankSize: Math.max(10, Math.min(120, val)) };
	persist();
}

/** Full tank cost */
export function fullTankCost(pricePerLiter: number): number {
	return pricePerLiter * settings.tankSize;
}

/** Trip cost given distance in km */
export function tripCost(pricePerLiter: number, distanceKm: number): number {
	return pricePerLiter * (settings.consumption / 100) * distanceKm;
}
