import { describe, it, expect } from 'vitest';
import type { FuelStation, EVCharger, POI, Metadata } from '../src/lib/types.js';

describe('Type definitions', () => {
	it('FuelStation type should be structurally valid', () => {
		const station: FuelStation = {
			id: 'test-001',
			name: 'Shell Amsterdam',
			brand: 'Shell',
			address: {
				street: 'Keizersgracht 1',
				city: 'Amsterdam',
				postalCode: '1015 AA'
			},
			lat: 52.3676,
			lng: 4.9041,
			prices: [{ fuelType: 'euro95', price: 2.019 }],
			facilities: ['shop', 'toilet'],
			lastUpdated: '2026-03-13T12:00:00Z'
		};

		expect(station.id).toBe('test-001');
		expect(station.prices[0].price).toBe(2.019);
		expect(station.lat).toBeGreaterThan(50);
	});

	it('EVCharger type should be structurally valid', () => {
		const charger: EVCharger = {
			id: 'ev-001',
			operator: 'Fastned',
			lat: 52.1,
			lng: 5.1,
			connectors: [{ type: 'CCS', powerKW: 150, quantity: 2 }],
			pricing: 'EUR 0.59/kWh',
			status: 'operational',
			lastUpdated: '2026-03-13T12:00:00Z'
		};

		expect(charger.connectors[0].powerKW).toBe(150);
	});

	it('POI type should be structurally valid', () => {
		const poi: POI = {
			id: 'poi-001',
			type: 'toilet',
			name: 'Sanifair A2',
			lat: 52.0,
			lng: 5.0
		};

		expect(poi.type).toBe('toilet');
	});

	it('Metadata type should be structurally valid', () => {
		const meta: Metadata = {
			lastUpdated: {
				fuel: '2026-03-13T12:00:00Z',
				ev: null,
				poi: null
			},
			stationCount: 3800,
			chargerCount: 0,
			tileIndex: [{ key: '52.0_5.0', count: 120 }]
		};

		expect(meta.stationCount).toBe(3800);
		expect(meta.tileIndex).toHaveLength(1);
	});
});
