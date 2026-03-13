<script lang="ts">
	import { getStations } from '$lib/stores/data.svelte.js';
	import { getActivePriceFuelType } from '$lib/stores/filters.svelte.js';
	import { getSortMode } from '$lib/stores/filters.svelte.js';
	import { selectStation } from '$lib/stores/selection.svelte.js';
	import { getLocation, hasLocation } from '$lib/stores/location.svelte.js';
	import { getExcludedBrands } from '$lib/stores/brand-filter.svelte.js';
	import { isFavorite } from '$lib/stores/favorites.svelte.js';
	import { haversineKm, PRICE_COLORS, calculateLocalThresholds } from '$lib/utils/price-colors.js';
	import { fullTankCost, getVehicle } from '$lib/stores/vehicle.svelte.js';
	import type { FuelStation, FuelType } from '$lib/types.js';

	interface Props {
		mapInstance?: import('maplibre-gl').Map | null;
	}
	let { mapInstance = null }: Props = $props();

	let visible = $state(false);
	let stations = $derived(getStations());
	let activeFuel = $derived(getActivePriceFuelType());
	let sortMode = $derived(getSortMode());
	let userLoc = $derived(getLocation());
	let hasLoc = $derived(hasLocation());
	let excluded = $derived(getExcludedBrands());
	let vehicle = $derived(getVehicle());

	let sortedStations = $derived.by(() => {
		const filtered = stations
			.filter((s) => !excluded.has(s.brand))
			.filter((s) => s.prices.some((p) => p.fuelType === activeFuel))
			.map((s) => {
				const price = s.prices.find((p) => p.fuelType === activeFuel)?.price ?? null;
				const dist = hasLoc && userLoc.lat && userLoc.lng
					? haversineKm(userLoc.lat, userLoc.lng, s.lat, s.lng)
					: null;
				return { station: s, price, dist };
			});

		if (sortMode === 'nearest' && hasLoc) {
			filtered.sort((a, b) => (a.dist ?? 999) - (b.dist ?? 999));
		} else {
			filtered.sort((a, b) => (a.price ?? 99) - (b.price ?? 99));
		}

		return filtered.slice(0, 50);
	});

	function fuelLabel(type: FuelType): string {
		const labels: Record<FuelType, string> = {
			euro95: 'Euro 95', euro98: 'Euro 98', diesel: 'Diesel', lpg: 'LPG'
		};
		return labels[type] ?? type;
	}

	function handleSelect(station: FuelStation) {
		selectStation(station);
		mapInstance?.flyTo({ center: [station.lng, station.lat], zoom: 14, duration: 1200 });
		visible = false;
	}

	function getPriceColor(station: FuelStation): string {
		const price = station.prices.find((p) => p.fuelType === activeFuel)?.price;
		if (!price) return PRICE_COLORS.average;
		const thresholds = calculateLocalThresholds(station, stations, activeFuel, 15);
		if (!thresholds) return PRICE_COLORS.average;
		if (price <= thresholds.p25) return PRICE_COLORS.cheap;
		if (price >= thresholds.p75) return PRICE_COLORS.expensive;
		return PRICE_COLORS.average;
	}
</script>

<!-- List toggle button -->
<button
	onclick={() => { visible = !visible; }}
	class="glass glass-hover pointer-events-auto flex h-8 items-center gap-1 rounded-xl px-2.5 text-xs font-medium text-gray-600 transition-all duration-200 hover:text-gray-800
		{visible ? 'border-blue-300 text-blue-600' : ''}"
	aria-label="Lijst weergave"
>
	<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
		<path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
	</svg>
	Lijst
</button>

{#if visible}
	<button
		class="fixed inset-0 z-20 bg-black/20"
		onclick={() => { visible = false; }}
		aria-label="Sluit"
		tabindex="-1"
	></button>

	<div class="fixed inset-x-0 bottom-0 z-30 max-h-[80vh] overflow-y-auto rounded-t-3xl shadow-lg glass">
		<div class="flex justify-center pb-2 pt-3">
			<div class="h-1 w-10 rounded-full bg-gray-300"></div>
		</div>

		<div class="px-5 pb-6">
			<div class="mb-3 flex items-center justify-between">
				<h2 class="text-lg font-bold text-gray-800">
					{sortMode === 'nearest' ? 'Dichtstbij' : 'Goedkoopst'} — {fuelLabel(activeFuel)}
				</h2>
				<span class="text-xs text-gray-400">{sortedStations.length} stations</span>
			</div>

			<div class="space-y-1">
				{#each sortedStations as { station, price, dist }, i (station.id)}
					<button
						onclick={() => handleSelect(station)}
						class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-gray-50
							{i === 0 ? 'border border-green-200 bg-green-50' : ''}"
					>
						<!-- Rank -->
						<span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold
							{i === 0 ? 'bg-green-600 text-white' : i < 3 ? 'bg-gray-200 text-gray-700' : 'text-gray-400'}">
							{i + 1}
						</span>

						<!-- Color dot -->
						<span
							class="h-3 w-3 shrink-0 rounded-full"
							style="background-color: {getPriceColor(station)}"
						></span>

						<!-- Info -->
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-1">
								<span class="truncate text-sm font-medium text-gray-800">{station.name}</span>
								{#if isFavorite(station.id)}
									<svg class="h-3 w-3 shrink-0 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
										<path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
									</svg>
								{/if}
							</div>
							<div class="text-xs text-gray-500">{station.brand} &middot; {station.address.city}</div>
						</div>

						<!-- Price + distance -->
						<div class="text-right shrink-0">
							{#if price !== null}
								<div class="text-sm font-bold text-gray-800">&euro; {price.toFixed(3).replace('.', ',')}</div>
								<div class="text-[10px] text-gray-400">
									tank &euro; {fullTankCost(price).toFixed(2).replace('.', ',')}
								</div>
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
		</div>
	</div>
{/if}
