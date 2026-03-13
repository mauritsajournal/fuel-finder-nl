<script lang="ts">
	/**
	 * Cheapest along route — enter origin + destination,
	 * find the cheapest station within a corridor along the route.
	 */
	import { searchAddress, type GeocodingResult } from '$lib/services/geocoding.js';
	import { calculateRoute, displayRoute, clearRoute } from '$lib/services/routing.js';
	import { getStations } from '$lib/stores/data.svelte.js';
	import { getActivePriceFuelType } from '$lib/stores/filters.svelte.js';
	import { selectStation } from '$lib/stores/selection.svelte.js';
	import { haversineKm } from '$lib/utils/price-colors.js';
	import { fullTankCost } from '$lib/stores/vehicle.svelte.js';
	import type { FuelStation } from '$lib/types.js';

	interface Props {
		mapInstance?: import('maplibre-gl').Map | null;
	}
	let { mapInstance = null }: Props = $props();

	let visible = $state(false);
	let originQuery = $state('');
	let destQuery = $state('');
	let originResults = $state<GeocodingResult[]>([]);
	let destResults = $state<GeocodingResult[]>([]);
	let showOriginDrop = $state(false);
	let showDestDrop = $state(false);
	let origin = $state<{ lat: number; lng: number } | null>(null);
	let dest = $state<{ lat: number; lng: number } | null>(null);

	let loading = $state(false);
	let routeStations = $state<{ station: FuelStation; price: number; offRouteKm: number }[]>([]);
	let routeDistance = $state<number | null>(null);

	let stations = $derived(getStations());
	let activeFuel = $derived(getActivePriceFuelType());

	let debounceOrigin: ReturnType<typeof setTimeout> | undefined;
	let debounceDest: ReturnType<typeof setTimeout> | undefined;

	let bufferKm = $state(3);

	function handleOriginInput() {
		clearTimeout(debounceOrigin);
		if (originQuery.length < 2) { originResults = []; showOriginDrop = false; return; }
		debounceOrigin = setTimeout(async () => {
			originResults = await searchAddress(originQuery);
			showOriginDrop = originResults.length > 0;
		}, 300);
	}

	function handleDestInput() {
		clearTimeout(debounceDest);
		if (destQuery.length < 2) { destResults = []; showDestDrop = false; return; }
		debounceDest = setTimeout(async () => {
			destResults = await searchAddress(destQuery);
			showDestDrop = destResults.length > 0;
		}, 300);
	}

	function selectOrigin(r: GeocodingResult) {
		originQuery = r.label;
		origin = { lat: r.lat, lng: r.lng };
		showOriginDrop = false;
		originResults = [];
	}

	function selectDest(r: GeocodingResult) {
		destQuery = r.label;
		dest = { lat: r.lat, lng: r.lng };
		showDestDrop = false;
		destResults = [];
	}

	async function findCheapest() {
		if (!origin || !dest) return;

		loading = true;
		routeStations = [];

		try {
			const route = await calculateRoute(origin.lat, origin.lng, dest.lat, dest.lng);
			routeDistance = route.distanceM / 1000;

			if (mapInstance) {
				displayRoute(mapInstance, route.coordinates);

				// Fit map to route
				const lngs = route.coordinates.map(c => c[0]);
				const lats = route.coordinates.map(c => c[1]);
				mapInstance.fitBounds(
					[[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
					{ padding: 60, duration: 1200 }
				);
			}

			// Sample route points (every 5th coordinate)
			const sampled = route.coordinates.filter((_, i) => i % 5 === 0);

			// Find stations near route corridor
			const nearbySet = new Set<string>();
			const stationDistMap = new Map<string, number>();

			for (const s of stations) {
				let minDist = Infinity;
				for (const [lng, lat] of sampled) {
					const d = haversineKm(lat, lng, s.lat, s.lng);
					if (d < minDist) minDist = d;
				}
				if (minDist <= bufferKm) {
					nearbySet.add(s.id);
					stationDistMap.set(s.id, minDist);
				}
			}

			// Sort by price
			const results: { station: FuelStation; price: number; offRouteKm: number }[] = [];
			for (const s of stations) {
				if (!nearbySet.has(s.id)) continue;
				const price = s.prices.find((p) => p.fuelType === activeFuel)?.price;
				if (price === undefined) continue;
				results.push({
					station: s,
					price,
					offRouteKm: stationDistMap.get(s.id) ?? 0
				});
			}
			results.sort((a, b) => a.price - b.price);
			routeStations = results.slice(0, 10);
		} catch {
			routeStations = [];
		} finally {
			loading = false;
		}
	}

	function handleSelectStation(station: FuelStation) {
		selectStation(station);
		mapInstance?.flyTo({ center: [station.lng, station.lat], zoom: 14, duration: 1000 });
	}

	function close() {
		visible = false;
		if (mapInstance) clearRoute(mapInstance);
		routeStations = [];
		routeDistance = null;
	}
</script>

<!-- Toggle button -->
<button
	onclick={() => { visible = !visible; if (!visible) close(); }}
	class="glass glass-hover pointer-events-auto flex h-8 items-center gap-1 rounded-xl px-2.5 text-xs font-medium text-gray-600 transition-all duration-200 hover:text-gray-800
		{visible ? 'border-blue-300 text-blue-600' : ''}"
	aria-label="Goedkoopst langs route"
>
	<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
		<path stroke-linecap="round" stroke-linejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
	</svg>
	Route
</button>

{#if visible}
	<button
		class="fixed inset-0 z-20 bg-black/20"
		onclick={close}
		aria-label="Sluit"
		tabindex="-1"
	></button>

	<div class="fixed inset-x-0 bottom-0 z-30 max-h-[75vh] overflow-y-auto rounded-t-3xl shadow-lg glass">
		<div class="flex justify-center pb-2 pt-3">
			<div class="h-1 w-10 rounded-full bg-gray-300"></div>
		</div>

		<div class="px-5 pb-6">
			<h2 class="mb-3 text-lg font-bold text-gray-800">Goedkoopst langs route</h2>

			<!-- Origin -->
			<div class="relative mb-2">
				<div class="flex items-center gap-2">
					<span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500 text-[10px] font-bold text-white">A</span>
					<input
						type="text"
						bind:value={originQuery}
						oninput={handleOriginInput}
						onblur={() => setTimeout(() => { showOriginDrop = false; }, 200)}
						onfocus={() => { if (originResults.length > 0) showOriginDrop = true; }}
						placeholder="Vertrekpunt..."
						class="w-full rounded-xl border border-gray-200 bg-white/60 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-blue-500/50 focus:bg-white"
					/>
				</div>
				{#if showOriginDrop && originResults.length > 0}
					<ul class="glass absolute inset-x-0 top-full z-50 ml-7 mt-1 overflow-hidden rounded-xl shadow-lg">
						{#each originResults as r, i (i)}
							<li>
								<button
									class="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
									onmousedown={() => selectOrigin(r)}
								>{r.label}</button>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<!-- Destination -->
			<div class="relative mb-3">
				<div class="flex items-center gap-2">
					<span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">B</span>
					<input
						type="text"
						bind:value={destQuery}
						oninput={handleDestInput}
						onblur={() => setTimeout(() => { showDestDrop = false; }, 200)}
						onfocus={() => { if (destResults.length > 0) showDestDrop = true; }}
						placeholder="Bestemming..."
						class="w-full rounded-xl border border-gray-200 bg-white/60 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-blue-500/50 focus:bg-white"
					/>
				</div>
				{#if showDestDrop && destResults.length > 0}
					<ul class="glass absolute inset-x-0 top-full z-50 ml-7 mt-1 overflow-hidden rounded-xl shadow-lg">
						{#each destResults as r, i (i)}
							<li>
								<button
									class="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
									onmousedown={() => selectDest(r)}
								>{r.label}</button>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<!-- Buffer slider -->
			<div class="mb-3">
				<div class="flex items-center justify-between text-xs text-gray-500">
					<span>Max afwijking van route</span>
					<span class="font-medium text-gray-700">{bufferKm} km</span>
				</div>
				<input type="range" min="1" max="10" step="1" bind:value={bufferKm} class="w-full" />
			</div>

			<!-- Search button -->
			<button
				onclick={findCheapest}
				disabled={!origin || !dest || loading}
				class="mb-4 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
			>
				{#if loading}
					<span class="flex items-center justify-center gap-2">
						<div class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
						Berekenen...
					</span>
				{:else}
					Zoek goedkoopste station
				{/if}
			</button>

			<!-- Results -->
			{#if routeStations.length > 0}
				{#if routeDistance}
					<div class="mb-2 text-xs text-gray-500">Route: {routeDistance.toFixed(0)} km</div>
				{/if}
				<div class="space-y-1">
					{#each routeStations as { station, price, offRouteKm }, i (station.id)}
						<button
							onclick={() => handleSelectStation(station)}
							class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-gray-50
								{i === 0 ? 'border border-green-200 bg-green-50' : ''}"
						>
							<span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold
								{i === 0 ? 'bg-green-600 text-white' : 'text-gray-400'}">
								{i + 1}
							</span>
							<div class="flex-1 min-w-0">
								<div class="truncate text-sm font-medium text-gray-800">{station.name}</div>
								<div class="text-xs text-gray-500">
									{station.brand} &middot; {offRouteKm < 0.5 ? 'op de route' : `${offRouteKm.toFixed(1)} km van route`}
								</div>
							</div>
							<div class="text-right shrink-0">
								<div class="text-sm font-bold text-gray-800">&euro; {price.toFixed(3).replace('.', ',')}</div>
								<div class="text-[10px] text-gray-400">
									tank &euro; {fullTankCost(price).toFixed(2).replace('.', ',')}
								</div>
							</div>
						</button>
					{/each}
				</div>
			{:else if !loading && origin && dest}
				<p class="text-center text-sm text-gray-400">Geen stations gevonden langs deze route</p>
			{/if}
		</div>
	</div>
{/if}
