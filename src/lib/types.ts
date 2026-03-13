/** Fuel station from ANWB API, processed */
export interface FuelStation {
	id: string;
	name: string;
	brand: string;
	address: {
		street: string;
		city: string;
		postalCode: string;
	};
	lat: number;
	lng: number;
	prices: FuelPrice[];
	facilities: string[];
	lastUpdated: string;
}

export interface FuelPrice {
	fuelType: FuelType;
	price: number; // EUR/liter, 3 decimal places
}

export type FuelType = 'euro95' | 'euro98' | 'diesel' | 'lpg';

/** EV charging station from OpenChargeMap */
export interface EVCharger {
	id: string;
	operator: string;
	lat: number;
	lng: number;
	connectors: Connector[];
	pricing: string | null;
	status: string;
	lastUpdated: string;
}

export interface Connector {
	type: string; // CCS, CHAdeMO, Type 2
	powerKW: number;
	quantity: number;
}

/** Point of Interest from Overpass API */
export interface POI {
	id: string;
	type: 'toilet' | 'rest_area' | 'playground' | 'services';
	name: string | null;
	lat: number;
	lng: number;
}

/** Metadata from R2 */
export interface Metadata {
	lastUpdated: {
		fuel: string;
		ev: string | null;
		poi: string | null;
	};
	stationCount: number;
	chargerCount: number;
	tileIndex: TileRef[];
}

export interface TileRef {
	key: string; // e.g. "52.0_5.0"
	count: number;
}
