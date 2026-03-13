/** Favorite stations store — persisted in localStorage */

const STORAGE_KEY = 'fuel-finder-favorites';

let favoriteIds = $state<Set<string>>(loadFavorites());

function loadFavorites(): Set<string> {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) return new Set(JSON.parse(raw));
	} catch { /* ignore */ }
	return new Set();
}

function persist() {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify([...favoriteIds]));
	} catch { /* ignore */ }
}

export function isFavorite(id: string): boolean {
	return favoriteIds.has(id);
}

export function toggleFavorite(id: string): void {
	if (favoriteIds.has(id)) {
		favoriteIds.delete(id);
	} else {
		favoriteIds.add(id);
	}
	favoriteIds = new Set(favoriteIds); // trigger reactivity
	persist();
}

export function getFavoriteIds(): Set<string> {
	return favoriteIds;
}

export function getFavoriteCount(): number {
	return favoriteIds.size;
}
