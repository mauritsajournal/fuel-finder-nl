<script lang="ts">
	import { getSelected, deselectStation } from '$lib/stores/selection.svelte.js';
	import { getStations } from '$lib/stores/data.svelte.js';
	import { formatPrice, priceDiffText, calculateThresholds } from '$lib/utils/price-colors.js';
	import { getLocation, hasLocation } from '$lib/stores/location.svelte.js';
	import { getActivePriceFuelType } from '$lib/stores/filters.svelte.js';
	import {
		calculateRoute,
		displayRoute,
		clearRoute,
		formatDuration,
		formatDistance,
		type RouteResult
	} from '$lib/services/routing.js';
	import type { FuelType } from '$lib/types.js';

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

	// Calculate average prices for comparison based on active fuel type
	let avgPrices = $derived.by(() => {
		const thresholds = calculateThresholds(allStations, activeFuelType);
		if (!thresholds || allStations.length === 0) return null;

		const prices = allStations
			.map((s) => s.prices.find((p) => p.fuelType === activeFuelType)?.price)
			.filter((p): p is number => p !== undefined);

		return prices.reduce((sum, p) => sum + p, 0) / prices.length;
	});

	/** Calculate straight-line distance in km */
	function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
		const R = 6371;
		const dLat = ((lat2 - lat1) * Math.PI) / 180;
		const dLng = ((lng2 - lng1) * Math.PI) / 180;
		const a =
			Math.sin(dLat / 2) * Math.sin(dLat / 2) +
			Math.cos((lat1 * Math.PI) / 180) *
				Math.cos((lat2 * Math.PI) / 180) *
				Math.sin(dLng / 2) *
				Math.sin(dLng / 2);
		return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	}

	let distance = $derived.by(() => {
		if (!station || !hasUserLocation || !userLocation.lat || !userLocation.lng) return null;
		return distanceKm(userLocation.lat, userLocation.lng, station.lat, station.lng);
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

			// Display route on map
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

	function handleBackdropClick() {
		deselectStation();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') deselectStation();
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
		class="glass fixed inset-x-0 bottom-0 z-30 max-h-[70vh] overflow-y-auto rounded-t-3xl shadow-lg transition-transform duration-250 ease-out"
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
				<div>
					<h2 class="text-lg font-bold text-gray-800">{station.name}</h2>
					<p class="text-sm text-gray-500">{station.brand}</p>
				</div>
				{#if distance !== null}
					<span class="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600">
						{distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`}
					</span>
				{/if}
			</div>

			<!-- Prices -->
			<div class="mb-4 grid grid-cols-2 gap-2">
				{#each station.prices as price (price.fuelType)}
					<div class="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
						<span class="text-xs text-gray-500">{fuelLabel(price.fuelType)}</span>
						<div class="text-base font-semibold text-gray-800">{formatPrice(price.price)}</div>
						{#if avgPrices !== null && price.fuelType === activeFuelType}
							<span class="text-[10px] text-gray-400">
								{priceDiffText(price.price, avgPrices)}
							</span>
						{/if}
					</div>
				{/each}
			</div>

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
					Google Maps
				</button>
				<button
					onclick={openWaze}
					class="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-100 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
				>
					Waze
				</button>
			</div>
		</div>
	</div>
{/if}
