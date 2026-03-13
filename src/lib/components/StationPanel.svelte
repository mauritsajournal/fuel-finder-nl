<script lang="ts">
	import { getSelected, deselectStation } from '$lib/stores/selection.svelte.js';
	import { getStations } from '$lib/stores/data.svelte.js';
	import { formatPrice, priceDiffText, calculateLocalThresholds, haversineKm } from '$lib/utils/price-colors.js';
	import { getLocation, hasLocation } from '$lib/stores/location.svelte.js';
	import { getActivePriceFuelType } from '$lib/stores/filters.svelte.js';
	import { isFavorite, toggleFavorite } from '$lib/stores/favorites.svelte.js';
	import { fullTankCost, tripCost, getVehicle } from '$lib/stores/vehicle.svelte.js';
	import {
		calculateRoute,
		displayRoute,
		clearRoute,
		formatDuration,
		formatDistance,
		type RouteResult
	} from '$lib/services/routing.js';
	import type { FuelType, FuelStation } from '$lib/types.js';
	import { base } from '$app/paths';

	interface Props {
		mapInstance?: import('maplibre-gl').Map | null;
	}
	let { mapInstance = null }: Props = $props();

	let station = $derived(getSelected());
	let visible = $derived(station !== null);
	let allStations = $derived(getStations());
	let userLocation = $derived(getLocation());
	let hasUserLocation = $derived(hasLocation());
	let activeFuelType = $derived(getActivePriceFuelType());
	let vehicle = $derived(getVehicle());

	// Favorite state
	let isFav = $derived(station ? isFavorite(station.id) : false);

	// Active price for trip cost
	let activePrice = $derived(
		station?.prices.find((p) => p.fuelType === activeFuelType)?.price ?? null
	);

	// Local price comparison for average
	let avgPrices = $derived.by(() => {
		if (!station || allStations.length === 0) return null;
		const thresholds = calculateLocalThresholds(station, allStations, activeFuelType, 15);
		if (!thresholds) return null;
		// Compute actual local average
		const nearby = allStations.filter(
			(s) => haversineKm(station!.lat, station!.lng, s.lat, s.lng) <= 15
		);
		const prices = nearby
			.map((s) => s.prices.find((p) => p.fuelType === activeFuelType)?.price)
			.filter((p): p is number => p !== undefined);
		return prices.reduce((sum, p) => sum + p, 0) / prices.length;
	});

	function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
		return haversineKm(lat1, lng1, lat2, lng2);
	}

	let distance = $derived.by(() => {
		if (!station || !hasUserLocation || !userLocation.lat || !userLocation.lng) return null;
		return distanceKm(userLocation.lat, userLocation.lng, station.lat, station.lng);
	});

	// Quick-compare: rank among nearby for each fuel type
	let localRanks = $derived.by(() => {
		if (!station) return {};
		const ranks: Record<string, { rank: number; total: number }> = {};
		const nearby = allStations.filter(
			(s) => haversineKm(station!.lat, station!.lng, s.lat, s.lng) <= 10
		);
		for (const p of station.prices) {
			const sorted = nearby
				.map((s) => s.prices.find((pr) => pr.fuelType === p.fuelType)?.price)
				.filter((pr): pr is number => pr !== undefined)
				.sort((a, b) => a - b);
			const rank = sorted.indexOf(p.price) + 1;
			ranks[p.fuelType] = { rank: rank || sorted.length, total: sorted.length };
		}
		return ranks;
	});

	// Route calculation state
	let routeResult = $state<RouteResult | null>(null);
	let routeLoading = $state(false);
	let routeError = $state<string | null>(null);

	async function calculateRouteToStation() {
		if (!station || !hasUserLocation || !userLocation.lat || !userLocation.lng) {
			routeError = 'Locatie niet beschikbaar';
			return;
		}

		routeLoading = true;
		routeError = null;
		routeResult = null;

		try {
			const result = await calculateRoute(
				userLocation.lat,
				userLocation.lng,
				station.lat,
				station.lng
			);
			routeResult = result;
			if (mapInstance) {
				displayRoute(mapInstance, result.coordinates);
			}
		} catch {
			routeError = 'Route berekening mislukt';
		} finally {
			routeLoading = false;
		}
	}

	// Clear route when station changes or panel closes
	$effect(() => {
		if (!station) {
			routeResult = null;
			routeError = null;
			routeLoading = false;
			if (mapInstance) {
				clearRoute(mapInstance);
			}
		}
	});

	function fuelLabel(type: FuelType): string {
		const labels: Record<FuelType, string> = {
			euro95: 'Euro 95',
			euro98: 'Euro 98',
			diesel: 'Diesel',
			lpg: 'LPG'
		};
		return labels[type] ?? type;
	}

	function openGoogleMaps() {
		if (!station) return;
		window.open(
			`https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`,
			'_blank'
		);
	}

	function openWaze() {
		if (!station) return;
		window.open(
			`https://waze.com/ul?ll=${station.lat},${station.lng}&navigate=yes`,
			'_blank'
		);
	}

	async function shareStation() {
		if (!station) return;
		const activePrice = station.prices.find((p) => p.fuelType === activeFuelType);
		const priceText = activePrice ? `${fuelLabel(activePrice.fuelType)}: ${formatPrice(activePrice.price)}` : '';
		const text = `${priceText} bij ${station.name} in ${station.address.city}`;
		const url = `${window.location.origin}${base}?station=${station.id}`;

		if (navigator.share) {
			try {
				await navigator.share({ title: station.name, text, url });
			} catch { /* user cancelled */ }
		} else {
			await navigator.clipboard.writeText(`${text}\n${url}`);
		}
	}

	function handleBackdropClick() {
		deselectStation();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') deselectStation();
	}

	function rankColor(rank: number, total: number): string {
		const pct = rank / total;
		if (pct <= 0.25) return 'text-green-600';
		if (pct >= 0.75) return 'text-red-500';
		return 'text-yellow-600';
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if visible && station}
	<!-- Backdrop -->
	<button
		class="fixed inset-0 z-20 bg-black/20 transition-opacity duration-200"
		onclick={handleBackdropClick}
		aria-label="Sluit paneel"
		tabindex="-1"
	></button>

	<!-- Slide-up panel -->
	<div
		class="glass fixed inset-x-0 bottom-0 z-30 max-h-[75vh] overflow-y-auto rounded-t-3xl shadow-lg transition-transform duration-250 ease-out"
		role="dialog"
		aria-label="Station details"
	>
		<!-- Drag handle -->
		<div class="flex justify-center pb-2 pt-3">
			<div class="h-1 w-10 rounded-full bg-gray-300"></div>
		</div>

		<div class="px-5 pb-6">
			<!-- Header -->
			<div class="mb-4 flex items-start justify-between">
				<div class="flex-1 min-w-0">
					<div class="flex items-center gap-2">
						<h2 class="truncate text-lg font-bold text-gray-800">{station.name}</h2>
						<!-- Favorite toggle -->
						<button
							onclick={() => toggleFavorite(station!.id)}
							class="shrink-0 transition-transform duration-150 active:scale-125"
							aria-label={isFav ? 'Verwijder uit favorieten' : 'Voeg toe aan favorieten'}
						>
							<svg class="h-5 w-5 {isFav ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'}" fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
							</svg>
						</button>
					</div>
					<p class="text-sm text-gray-500">{station.brand}</p>
				</div>
				{#if distance !== null}
					<span class="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600">
						{distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`}
					</span>
				{/if}
			</div>

			<!-- Prices with local rank -->
			<div class="mb-4 grid grid-cols-2 gap-2">
				{#each station.prices as price (price.fuelType)}
					{@const rank = localRanks[price.fuelType]}
					<div class="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
						<div class="flex items-center justify-between">
							<span class="text-xs text-gray-500">{fuelLabel(price.fuelType)}</span>
							{#if rank}
								<span class="text-[10px] font-medium {rankColor(rank.rank, rank.total)}">
									#{rank.rank}/{rank.total}
								</span>
							{/if}
						</div>
						<div class="text-base font-semibold text-gray-800">{formatPrice(price.price)}</div>
						{#if avgPrices !== null && price.fuelType === activeFuelType}
							<span class="text-[10px] text-gray-400">
								{priceDiffText(price.price, avgPrices)}
							</span>
						{/if}
					</div>
				{/each}
			</div>

			<!-- Trip cost calculator -->
			{#if activePrice}
				<div class="mb-4 flex gap-2">
					<div class="flex-1 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-center">
						<div class="text-[10px] text-gray-500">Volle tank ({vehicle.tankSize}L)</div>
						<div class="text-sm font-bold text-gray-800">
							&euro; {fullTankCost(activePrice).toFixed(2).replace('.', ',')}
						</div>
					</div>
					{#if routeResult && !routeResult.isFallback}
						<div class="flex-1 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-center">
							<div class="text-[10px] text-gray-500">Rit ({(routeResult.distanceM / 1000).toFixed(0)} km)</div>
							<div class="text-sm font-bold text-gray-800">
								&euro; {tripCost(activePrice, routeResult.distanceM / 1000).toFixed(2).replace('.', ',')}
							</div>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Address -->
			<div class="mb-4 text-sm text-gray-600">
				{#if station.address.street}
					<p>{station.address.street}</p>
				{/if}
				<p>
					{#if station.address.postalCode}{station.address.postalCode} {/if}{station.address.city}
				</p>
			</div>

			<!-- Facilities -->
			{#if station.facilities.length > 0}
				<div class="mb-4 flex flex-wrap gap-2">
					{#each station.facilities as facility, i (i)}
						<span class="rounded-lg border border-gray-100 bg-gray-50 px-2 py-1 text-xs text-gray-500">
							{facility}
						</span>
					{/each}
				</div>
			{/if}

			<!-- Route info -->
			{#if routeResult}
				<div class="mb-4 flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2">
					<svg class="h-5 w-5 shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
					</svg>
					<div class="flex-1">
						<span class="text-sm font-medium text-blue-700">
							{formatDistance(routeResult.distanceM)} &middot; {formatDuration(routeResult.durationS)}
						</span>
						{#if routeResult.isFallback}
							<span class="ml-1 text-[10px] text-gray-400">(schatting)</span>
						{/if}
					</div>
					<button
						onclick={() => { routeResult = null; if (mapInstance) clearRoute(mapInstance); }}
						class="text-gray-400 hover:text-gray-700"
						aria-label="Route wissen"
					>
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			{/if}

			{#if routeError}
				<div class="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
					{routeError}
				</div>
			{/if}

			<!-- Action buttons -->
			<div class="flex gap-2">
				{#if hasUserLocation}
					<button
						onclick={calculateRouteToStation}
						disabled={routeLoading}
						class="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
					>
						{#if routeLoading}
							<div class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
							Berekenen...
						{:else}
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
							</svg>
							Navigeer
						{/if}
					</button>
				{/if}
				<button
					onclick={openGoogleMaps}
					class="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
						<path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
					</svg>
					Maps
				</button>
				<button
					onclick={openWaze}
					class="flex items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
				>
					Waze
				</button>
				<!-- Share -->
				<button
					onclick={shareStation}
					class="flex items-center justify-center rounded-xl bg-gray-100 px-3 py-2.5 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700"
					aria-label="Deel station"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
					</svg>
				</button>
			</div>
		</div>
	</div>
{/if}
