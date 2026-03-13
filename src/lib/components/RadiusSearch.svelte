<script lang="ts">
	/**
	 * Address + radius search.
	 * User enters an address, adjusts a radius slider, and sees the cheapest
	 * station within that circle highlighted on the map.
	 */
	import { searchAddress, type GeocodingResult } from '$lib/services/geocoding.js';
	import { getStations } from '$lib/stores/data.svelte.js';
	import { getActivePriceFuelType } from '$lib/stores/filters.svelte.js';
	import { selectStation } from '$lib/stores/selection.svelte.js';
	import { haversineKm } from '$lib/utils/price-colors.js';
	import type { FuelStation } from '$lib/types.js';

	interface Props {
		mapInstance?: import('maplibre-gl').Map | null;
	}
	let { mapInstance = null }: Props = $props();

	let query = $state('');
	let results = $state<GeocodingResult[]>([]);
	let showDropdown = $state(false);
	let loading = $state(false);
	let selectedIndex = $state(-1);

	let searchCenter = $state<{ lat: number; lng: number; label: string } | null>(null);
	let radiusKm = $state(5);
	let expanded = $state(false);

	let stations = $derived(getStations());
	let activeFuel = $derived(getActivePriceFuelType());

	// Find cheapest station within radius
	let cheapestInRadius = $derived.by(() => {
		if (!searchCenter) return null;

		const inRange = stations.filter(
			(s) => haversineKm(searchCenter!.lat, searchCenter!.lng, s.lat, s.lng) <= radiusKm
		);

		let best: FuelStation | null = null;
		let bestPrice = Infinity;

		for (const s of inRange) {
			const p = s.prices.find((pr) => pr.fuelType === activeFuel)?.price;
			if (p !== undefined && p < bestPrice) {
				bestPrice = p;
				best = s;
			}
		}

		return best;
	});

	let stationsInRadius = $derived.by(() => {
		if (!searchCenter) return 0;
		return stations.filter(
			(s) => haversineKm(searchCenter!.lat, searchCenter!.lng, s.lat, s.lng) <= radiusKm
		).length;
	});

	// Debounced search
	let debounceTimer: ReturnType<typeof setTimeout> | undefined;

	function handleInput() {
		clearTimeout(debounceTimer);
		selectedIndex = -1;
		if (query.length < 2) {
			results = [];
			showDropdown = false;
			return;
		}
		loading = true;
		debounceTimer = setTimeout(async () => {
			const r = await searchAddress(query);
			results = r;
			showDropdown = r.length > 0;
			loading = false;
		}, 300);
	}

	function selectResult(result: GeocodingResult) {
		query = result.label;
		showDropdown = false;
		results = [];
		selectedIndex = -1;
		searchCenter = { lat: result.lat, lng: result.lng, label: result.label };
		mapInstance?.flyTo({ center: [result.lng, result.lat], zoom: 12, duration: 1200 });
		drawCircle();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!showDropdown || results.length === 0) return;
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = Math.max(selectedIndex - 1, -1);
		} else if (e.key === 'Enter' && selectedIndex >= 0) {
			e.preventDefault();
			selectResult(results[selectedIndex]);
		} else if (e.key === 'Escape') {
			showDropdown = false;
		}
	}

	function handleBlur() {
		setTimeout(() => { showDropdown = false; }, 200);
	}

	function clearSearch() {
		query = '';
		results = [];
		showDropdown = false;
		searchCenter = null;
		removeCircle();
	}

	function highlightCheapest() {
		if (!cheapestInRadius) return;
		selectStation(cheapestInRadius);
		if (mapInstance) {
			mapInstance.flyTo({
				center: [cheapestInRadius.lng, cheapestInRadius.lat],
				zoom: 14,
				duration: 1000
			});
		}
	}

	// Draw radius circle on map
	function drawCircle() {
		if (!mapInstance || !searchCenter) return;

		const points = 64;
		const coords: [number, number][] = [];
		const lat = searchCenter.lat;
		const lng = searchCenter.lng;

		for (let i = 0; i <= points; i++) {
			const angle = (i / points) * 2 * Math.PI;
			const dLat = (radiusKm / 111.32) * Math.cos(angle);
			const dLng = (radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180))) * Math.sin(angle);
			coords.push([lng + dLng, lat + dLat]);
		}

		const geojson = {
			type: 'FeatureCollection' as const,
			features: [
				{
					type: 'Feature' as const,
					geometry: { type: 'Polygon' as const, coordinates: [coords] },
					properties: {}
				}
			]
		};

		const source = mapInstance.getSource('radius-circle') as import('maplibre-gl').GeoJSONSource | undefined;
		if (source) {
			source.setData(geojson);
		} else {
			mapInstance.addSource('radius-circle', { type: 'geojson', data: geojson });
			mapInstance.addLayer({
				id: 'radius-circle-fill',
				type: 'fill',
				source: 'radius-circle',
				paint: {
					'fill-color': '#3b82f6',
					'fill-opacity': 0.08
				}
			});
			mapInstance.addLayer({
				id: 'radius-circle-stroke',
				type: 'line',
				source: 'radius-circle',
				paint: {
					'line-color': '#3b82f6',
					'line-width': 2,
					'line-dasharray': [3, 2],
					'line-opacity': 0.5
				}
			});
		}
	}

	function removeCircle() {
		if (!mapInstance) return;
		if (mapInstance.getLayer('radius-circle-fill')) mapInstance.removeLayer('radius-circle-fill');
		if (mapInstance.getLayer('radius-circle-stroke')) mapInstance.removeLayer('radius-circle-stroke');
		if (mapInstance.getSource('radius-circle')) mapInstance.removeSource('radius-circle');
	}

	// Redraw circle when radius changes
	$effect(() => {
		if (searchCenter && radiusKm) {
			drawCircle();
		}
	});

	// Clean up circle when component is destroyed or search cleared
	$effect(() => {
		if (!searchCenter) {
			removeCircle();
		}
	});
</script>

<!-- Toggle button -->
<div class="pointer-events-none absolute right-0 top-16 z-10 p-3 sm:p-4">
	<button
		onclick={() => { expanded = !expanded; }}
		class="glass glass-hover pointer-events-auto flex h-10 w-10 items-center justify-center rounded-xl text-gray-600 transition-all duration-200 sm:h-11 sm:w-11
			{expanded ? 'border-blue-300 text-blue-600' : ''}"
		aria-label="Zoek op afstand"
		title="Zoek op afstand"
	>
		<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
			<circle cx="12" cy="12" r="10" opacity="0.3" />
			<circle cx="12" cy="12" r="5" />
			<path stroke-linecap="round" d="M12 2v3M12 19v3M2 12h3M19 12h3" />
		</svg>
	</button>
</div>

<!-- Expanded panel -->
{#if expanded}
	<div class="pointer-events-none absolute right-0 top-[7.5rem] z-10 p-3 sm:p-4">
		<div class="glass pointer-events-auto w-72 rounded-2xl p-4 shadow-lg">
			<h3 class="mb-3 text-sm font-semibold text-gray-800">Zoek binnen straal</h3>

			<!-- Address input -->
			<div class="relative mb-3">
				<input
					type="text"
					bind:value={query}
					oninput={handleInput}
					onkeydown={handleKeydown}
					onblur={handleBlur}
					onfocus={() => { if (results.length > 0) showDropdown = true; }}
					placeholder="Adres of stad..."
					class="w-full rounded-xl border border-gray-200 bg-white/60 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 outline-none transition-colors focus:border-blue-500/50 focus:bg-white"
				/>

				{#if loading}
					<div class="absolute right-2.5 top-1/2 -translate-y-1/2">
						<div class="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-500"></div>
					</div>
				{:else if query}
					<button
						onclick={clearSearch}
						class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
						aria-label="Wis"
					>
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				{/if}

				<!-- Dropdown -->
				{#if showDropdown && results.length > 0}
					<ul class="glass absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-xl shadow-lg">
						{#each results as result, i (i)}
							<li>
								<button
									class="flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition-colors
										{selectedIndex === i ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}"
									onmousedown={() => selectResult(result)}
								>
									<svg class="mt-0.5 h-4 w-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
										<path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
										<path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
									</svg>
									<div class="min-w-0 flex-1">
										<div class="truncate">{result.label}</div>
										{#if result.region}
											<div class="truncate text-xs text-gray-400">{result.region}</div>
										{/if}
									</div>
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<!-- Radius slider -->
			{#if searchCenter}
				<div class="mb-3">
					<div class="mb-1 flex items-center justify-between text-xs text-gray-500">
						<span>Straal</span>
						<span class="font-medium text-gray-700">{radiusKm} km</span>
					</div>
					<input
						type="range"
						min="1"
						max="30"
						step="1"
						bind:value={radiusKm}
						class="radius-slider w-full"
					/>
					<div class="mt-1 flex justify-between text-[10px] text-gray-400">
						<span>1 km</span>
						<span>30 km</span>
					</div>
				</div>

				<!-- Result -->
				<div class="rounded-xl border border-gray-100 bg-gray-50 p-3">
					<div class="mb-1 text-xs text-gray-500">
						{stationsInRadius} station{stationsInRadius !== 1 ? 's' : ''} binnen {radiusKm} km
					</div>

					{#if cheapestInRadius}
						{@const price = cheapestInRadius.prices.find((p) => p.fuelType === activeFuel)?.price}
						<div class="flex items-center justify-between">
							<div>
								<div class="text-sm font-semibold text-gray-800">{cheapestInRadius.name}</div>
								<div class="text-xs text-gray-500">{cheapestInRadius.brand}</div>
							</div>
							{#if price}
								<div class="text-right">
									<div class="text-base font-bold text-green-600">
										&euro; {price.toFixed(3).replace('.', ',')}
									</div>
								</div>
							{/if}
						</div>
						<button
							onclick={highlightCheapest}
							class="mt-2 w-full rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700"
						>
							Toon op kaart
						</button>
					{:else}
						<div class="text-sm text-gray-400">Geen stations gevonden</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
{/if}
