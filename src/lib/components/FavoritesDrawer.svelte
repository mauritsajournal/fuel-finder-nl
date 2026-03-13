<script lang="ts">
	import { getFavoriteIds, getFavoriteCount } from '$lib/stores/favorites.svelte.js';
	import { getStations } from '$lib/stores/data.svelte.js';
	import { getActivePriceFuelType } from '$lib/stores/filters.svelte.js';
	import { selectStation } from '$lib/stores/selection.svelte.js';
	import { haversineKm } from '$lib/utils/price-colors.js';
	import { getLocation, hasLocation } from '$lib/stores/location.svelte.js';
	import type { FuelStation } from '$lib/types.js';

	interface Props {
		mapInstance?: import('maplibre-gl').Map | null;
	}
	let { mapInstance = null }: Props = $props();

	let visible = $state(false);
	let stations = $derived(getStations());
	let favIds = $derived(getFavoriteIds());
	let favCount = $derived(getFavoriteCount());
	let activeFuel = $derived(getActivePriceFuelType());
	let userLoc = $derived(getLocation());
	let hasLoc = $derived(hasLocation());

	let favoriteStations = $derived.by(() => {
		return stations
			.filter((s) => favIds.has(s.id))
			.map((s) => {
				const price = s.prices.find((p) => p.fuelType === activeFuel)?.price ?? null;
				const dist = hasLoc && userLoc.lat && userLoc.lng
					? haversineKm(userLoc.lat, userLoc.lng, s.lat, s.lng)
					: null;
				return { station: s, price, dist };
			})
			.sort((a, b) => (a.price ?? 99) - (b.price ?? 99));
	});

	function handleSelect(station: FuelStation) {
		selectStation(station);
		mapInstance?.flyTo({ center: [station.lng, station.lat], zoom: 14, duration: 1200 });
		visible = false;
	}
</script>

<!-- Favorites button -->
<div class="pointer-events-none absolute left-0 top-16 z-10 p-3 sm:p-4">
	<button
		onclick={() => { visible = !visible; }}
		class="glass glass-hover pointer-events-auto flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm transition-all duration-200 sm:h-11
			{visible ? 'border-yellow-300 text-yellow-600' : 'text-gray-600'}"
		aria-label="Favorieten"
	>
		<svg class="h-4.5 w-4.5" fill={favCount > 0 ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
			<path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
		</svg>
		{#if favCount > 0}
			<span class="text-xs font-medium">{favCount}</span>
		{/if}
	</button>
</div>

<!-- Drawer -->
{#if visible}
	<button
		class="fixed inset-0 z-20 bg-black/20"
		onclick={() => { visible = false; }}
		aria-label="Sluit"
		tabindex="-1"
	></button>

	<div class="fixed inset-x-0 bottom-0 z-30 max-h-[60vh] overflow-y-auto rounded-t-3xl shadow-lg glass">
		<div class="flex justify-center pb-2 pt-3">
			<div class="h-1 w-10 rounded-full bg-gray-300"></div>
		</div>

		<div class="px-5 pb-6">
			<h2 class="mb-3 text-lg font-bold text-gray-800">Favorieten</h2>

			{#if favoriteStations.length === 0}
				<p class="py-8 text-center text-sm text-gray-400">
					Nog geen favorieten. Tik op het sterretje bij een station om het op te slaan.
				</p>
			{:else}
				<div class="space-y-2">
					{#each favoriteStations as { station, price, dist } (station.id)}
						<button
							onclick={() => handleSelect(station)}
							class="flex w-full items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 text-left transition-colors hover:bg-gray-100"
						>
							<div class="flex-1 min-w-0">
								<div class="truncate text-sm font-medium text-gray-800">{station.name}</div>
								<div class="text-xs text-gray-500">{station.brand} &middot; {station.address.city}</div>
							</div>
							<div class="text-right shrink-0">
								{#if price !== null}
									<div class="text-sm font-bold text-gray-800">&euro; {price.toFixed(3).replace('.', ',')}</div>
								{/if}
								{#if dist !== null}
									<div class="text-xs text-gray-400">
										{dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`}
									</div>
								{/if}
							</div>
						</button>
					{/each}
				</div>
			{/if}
		</div>
	</div>
{/if}
