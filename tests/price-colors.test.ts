import { describe, it, expect } from 'vitest';
import {
	calculateThresholds,
	getPriceCategory,
	formatPrice,
	priceDiffText
} from '../src/lib/utils/price-colors.js';
import type { FuelStation } from '../src/lib/types.js';

function mockStation(euro95Price: number): FuelStation {
	return {
		id: `test-${euro95Price}`,
		name: 'Test',
		brand: 'Test',
		address: { street: '', city: '', postalCode: '' },
		lat: 52.0,
		lng: 5.0,
		prices: [{ fuelType: 'euro95', price: euro95Price }],
		facilities: [],
		lastUpdated: ''
	};
}

describe('calculateThresholds', () => {
	it('returns null for fewer than 4 stations', () => {
		const stations = [1.9, 2.0, 2.1].map(mockStation);
		expect(calculateThresholds(stations, 'euro95')).toBeNull();
	});

	it('calculates p25 and p75 correctly', () => {
		const prices = [1.8, 1.9, 1.95, 2.0, 2.05, 2.1, 2.15, 2.2];
		const stations = prices.map(mockStation);
		const thresholds = calculateThresholds(stations, 'euro95');
		expect(thresholds).not.toBeNull();
		expect(thresholds!.p25).toBe(1.95);
		expect(thresholds!.p75).toBe(2.15);
	});
});

describe('getPriceCategory', () => {
	const thresholds = { p25: 1.95, p75: 2.10 };

	it('categorizes cheap station', () => {
		expect(getPriceCategory(mockStation(1.90), 'euro95', thresholds)).toBe('cheap');
	});

	it('categorizes average station', () => {
		expect(getPriceCategory(mockStation(2.00), 'euro95', thresholds)).toBe('average');
	});

	it('categorizes expensive station', () => {
		expect(getPriceCategory(mockStation(2.15), 'euro95', thresholds)).toBe('expensive');
	});
});

describe('formatPrice', () => {
	it('formats price with EUR symbol and comma', () => {
		expect(formatPrice(2.019)).toBe('\u20AC 2,019');
	});

	it('handles round prices', () => {
		expect(formatPrice(2.0)).toBe('\u20AC 2,000');
	});
});

describe('priceDiffText', () => {
	it('shows cheaper text', () => {
		expect(priceDiffText(1.95, 2.0)).toBe('5 cent goedkoper');
	});

	it('shows more expensive text', () => {
		expect(priceDiffText(2.05, 2.0)).toBe('5 cent duurder');
	});

	it('shows average for same price', () => {
		expect(priceDiffText(2.0, 2.0)).toBe('gemiddeld');
	});
});
