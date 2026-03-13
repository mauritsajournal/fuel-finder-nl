/**
 * Price color coding for fuel station markers.
 * Green = cheapest 25%, Yellow = middle 50%, Red = most expensive 25%
 */

import type { FuelStation, FuelType } from '$lib/types.js';

export type PriceCategory = 'cheap' | 'average' | 'expensive';

export const PRICE_COLORS: Record<PriceCategory, string> = {
	cheap: '#22c55e', // green-500
	average: '#eab308', // yellow-500
	expensive: '#ef4444' // red-500
};

/** Calculate price thresholds from loaded stations */
export function calculateThresholds(
	stations: FuelStation[],
	fuelType: FuelType
): { p25: number; p75: number } | null {
	const prices = stations
		.map((s) => s.prices.find((p) => p.fuelType === fuelType)?.price)
		.filter((p): p is number => p !== undefined)
		.sort((a, b) => a - b);

	if (prices.length < 4) return null;

	const p25 = prices[Math.floor(prices.length * 0.25)];
	const p75 = prices[Math.floor(prices.length * 0.75)];

	return { p25, p75 };
}

/** Get price category for a station */
export function getPriceCategory(
	station: FuelStation,
	fuelType: FuelType,
	thresholds: { p25: number; p75: number }
): PriceCategory {
	const price = station.prices.find((p) => p.fuelType === fuelType)?.price;
	if (price === undefined) return 'average';

	if (price <= thresholds.p25) return 'cheap';
	if (price >= thresholds.p75) return 'expensive';
	return 'average';
}

/** Format price for display: "2.019" -> "EUR 2,019" */
export function formatPrice(price: number): string {
	return `\u20AC ${price.toFixed(3).replace('.', ',')}`;
}

/** Calculate price difference from average */
export function priceDiffText(price: number, avgPrice: number): string {
	const diff = price - avgPrice;
	const diffCents = Math.abs(Math.round(diff * 1000));

	if (diffCents === 0) return 'gemiddeld';
	if (diff < 0) return `${diffCents / 10} cent goedkoper`;
	return `${diffCents / 10} cent duurder`;
}
