import { describe, it, expect } from 'vitest';

/**
 * Tests for tile key calculation logic.
 * Mirrors the Python tile_data.py logic to ensure consistency.
 */

const TILE_SIZE = 0.5;

/** Calculate tile key from coordinates (same algo as Python) */
function tileKey(lat: number, lng: number): string {
	const tileLat = Math.floor(lat / TILE_SIZE) * TILE_SIZE;
	const tileLng = Math.floor(lng / TILE_SIZE) * TILE_SIZE;
	return `${tileLat}_${tileLng}`;
}

describe('Tile key calculation', () => {
	it('should place Amsterdam in correct tile', () => {
		// Amsterdam: 52.37, 4.89
		expect(tileKey(52.37, 4.89)).toBe('52_4.5');
	});

	it('should place Rotterdam in correct tile', () => {
		// Rotterdam: 51.92, 4.48
		expect(tileKey(51.92, 4.48)).toBe('51.5_4');
	});

	it('should place Groningen in correct tile', () => {
		// Groningen: 53.22, 6.57
		expect(tileKey(53.22, 6.57)).toBe('53_6.5');
	});

	it('should place Maastricht in correct tile', () => {
		// Maastricht: 50.85, 5.69
		expect(tileKey(50.85, 5.69)).toBe('50.5_5.5');
	});

	it('should handle exact tile boundary', () => {
		expect(tileKey(52.0, 5.0)).toBe('52_5');
	});

	it('should handle negative coordinates', () => {
		// Not in NL, but tests the math
		expect(tileKey(-1.5, -2.7)).toBe('-1.5_-3');
	});

	it('should produce consistent keys for nearby stations', () => {
		// Two stations in same tile should get same key
		const key1 = tileKey(52.37, 4.89);
		const key2 = tileKey(52.22, 4.75);
		expect(key1).toBe(key2); // Both in 52_4.5
	});

	it('should separate stations in different tiles', () => {
		const key1 = tileKey(52.37, 4.89); // 52_4.5
		const key2 = tileKey(51.92, 4.48); // 51.5_4
		expect(key1).not.toBe(key2);
	});
});
