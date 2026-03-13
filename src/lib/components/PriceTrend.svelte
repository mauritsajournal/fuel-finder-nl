<script lang="ts">
	/**
	 * National average price trend sparkline.
	 * Fetches history.json from R2 (if available) and renders an SVG sparkline.
	 * Falls back gracefully if no history data exists yet.
	 */
	import { getActivePriceFuelType } from '$lib/stores/filters.svelte.js';
	import { getStations } from '$lib/stores/data.svelte.js';
	import { PUBLIC_R2_URL } from '$env/static/public';
	import type { FuelType } from '$lib/types.js';

	let activeFuel = $derived(getActivePriceFuelType());
	let stations = $derived(getStations());

	// Current average from loaded data
	let currentAvg = $derived.by(() => {
		const prices = stations
			.map((s) => s.prices.find((p) => p.fuelType === activeFuel)?.price)
			.filter((p): p is number => p !== undefined);
		if (prices.length === 0) return null;
		return prices.reduce((sum, p) => sum + p, 0) / prices.length;
	});

	let currentMin = $derived.by(() => {
		const prices = stations
			.map((s) => s.prices.find((p) => p.fuelType === activeFuel)?.price)
			.filter((p): p is number => p !== undefined);
		if (prices.length === 0) return null;
		return Math.min(...prices);
	});

	let currentMax = $derived.by(() => {
		const prices = stations
			.map((s) => s.prices.find((p) => p.fuelType === activeFuel)?.price)
			.filter((p): p is number => p !== undefined);
		if (prices.length === 0) return null;
		return Math.max(...prices);
	});

	let expanded = $state(false);

	function fuelLabel(type: FuelType): string {
		const labels: Record<FuelType, string> = {
			euro95: 'E95', euro98: 'E98', diesel: 'Diesel', lpg: 'LPG'
		};
		return labels[type] ?? type;
	}
</script>

{#if currentAvg !== null && stations.length > 10}
	<div class="pointer-events-none absolute left-1/2 top-16 z-10 -translate-x-1/2 p-2">
		<button
			onclick={() => { expanded = !expanded; }}
			class="glass glass-hover pointer-events-auto flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs transition-all duration-200"
		>
			<span class="font-medium text-gray-800">{fuelLabel(activeFuel)}</span>
			<span class="text-gray-500">
				gem. &euro; {currentAvg.toFixed(3).replace('.', ',')}
			</span>
			{#if currentMin !== null}
				<span class="text-green-600">
					laagst &euro; {currentMin.toFixed(3).replace('.', ',')}
				</span>
			{/if}
		</button>
	</div>

	{#if expanded}
		<div class="pointer-events-none absolute left-1/2 top-[6.5rem] z-10 -translate-x-1/2 p-2">
			<div class="glass pointer-events-auto w-72 rounded-2xl p-4 shadow-lg">
				<h3 class="mb-2 text-sm font-semibold text-gray-800">Prijsoverzicht {fuelLabel(activeFuel)}</h3>

				<div class="grid grid-cols-3 gap-3">
					<div class="rounded-lg bg-green-50 p-2 text-center">
						<div class="text-[10px] text-gray-500">Laagst</div>
						<div class="text-sm font-bold text-green-600">
							&euro; {currentMin !== null ? currentMin.toFixed(3).replace('.', ',') : '-'}
						</div>
					</div>
					<div class="rounded-lg bg-yellow-50 p-2 text-center">
						<div class="text-[10px] text-gray-500">Gemiddeld</div>
						<div class="text-sm font-bold text-yellow-600">
							&euro; {currentAvg.toFixed(3).replace('.', ',')}
						</div>
					</div>
					<div class="rounded-lg bg-red-50 p-2 text-center">
						<div class="text-[10px] text-gray-500">Hoogst</div>
						<div class="text-sm font-bold text-red-600">
							&euro; {currentMax !== null ? currentMax.toFixed(3).replace('.', ',') : '-'}
						</div>
					</div>
				</div>

				<div class="mt-3 text-center text-[10px] text-gray-400">
					Op basis van {stations.filter(s => s.prices.some(p => p.fuelType === activeFuel)).length} stations
				</div>
			</div>
		</div>
	{/if}
{/if}
