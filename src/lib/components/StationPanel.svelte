<script lang="ts">
	import { getSelected, deselectStation } from '$lib/stores/selection.svelte.js';
	import { getStations } from '$lib/stores/data.svelte.js';
	import { formatPrice, priceDiffText, calculateThresholds } from '$lib/utils/price-colors.js';
	import { getLocation, hasLocation } from '$lib/stores/location.svelte.js';
	import type { FuelType } from '$lib/types.js';

	let station = $derived(getSelected());
	let visible = $derived(station !== null);
	let allStations = $derived(getStations());
	let userLocation = $derived(getLocation());
	let hasUserLocation = $derived(hasLocation());

	// Calculate average prices for comparison
	let avgPrices = $derived.by(() => {
		const thresholds = calculateThresholds(allStations, 'euro95');
		if (!thresholds || allStations.length === 0) return null;

		const prices = allStations
			.map((s) => s.prices.find((p) => p.fuelType === 'euro95')?.price)
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
		class="fixed inset-0 z-20 bg-black/30 transition-opacity duration-200"
		onclick={handleBackdropClick}
		aria-label="Sluit paneel"
		tabindex="-1"
	></button>

	<!-- Slide-up panel -->
	<div
		class="glass fixed inset-x-0 bottom-0 z-30 max-h-[70vh] overflow-y-auto rounded-t-3xl transition-transform duration-250 ease-out"
		role="dialog"
		aria-label="Station details"
	>
		<!-- Drag handle -->
		<div class="flex justify-center pb-2 pt-3">
			<div class="h-1 w-10 rounded-full bg-white/20"></div>
		</div>

		<div class="px-5 pb-6">
			<!-- Header -->
			<div class="mb-4 flex items-start justify-between">
				<div>
					<h2 class="text-lg font-bold text-white">{station.name}</h2>
					<p class="text-sm text-slate-400">{station.brand}</p>
				</div>
				{#if distance !== null}
					<span class="rounded-lg bg-blue-500/20 px-2.5 py-1 text-xs font-medium text-blue-400">
						{distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`}
					</span>
				{/if}
			</div>

			<!-- Prices -->
			<div class="mb-4 grid grid-cols-2 gap-2">
				{#each station.prices as price}
					<div class="rounded-xl border border-white/5 bg-white/3 px-3 py-2">
						<span class="text-xs text-slate-400">{fuelLabel(price.fuelType)}</span>
						<div class="text-base font-semibold text-white">{formatPrice(price.price)}</div>
						{#if avgPrices !== null && price.fuelType === 'euro95'}
							<span class="text-[10px] text-slate-500">
								{priceDiffText(price.price, avgPrices)}
							</span>
						{/if}
					</div>
				{/each}
			</div>

			<!-- Address -->
			<div class="mb-4 text-sm text-slate-300">
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
					{#each station.facilities as facility}
						<span class="rounded-lg border border-white/5 bg-white/3 px-2 py-1 text-xs text-slate-400">
							{facility}
						</span>
					{/each}
				</div>
			{/if}

			<!-- Action buttons -->
			<div class="flex gap-2">
				<button
					onclick={openGoogleMaps}
					class="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600/20 py-2.5 text-sm font-medium text-blue-400 transition-colors hover:bg-blue-600/30"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
						<path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
					</svg>
					Google Maps
				</button>
				<button
					onclick={openWaze}
					class="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10"
				>
					Waze
				</button>
			</div>
		</div>
	</div>
{/if}
