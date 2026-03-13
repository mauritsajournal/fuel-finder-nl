<script lang="ts">
	import { getThreshold, setThreshold, clearThreshold, hasActiveAlert } from '$lib/stores/price-alert.svelte.js';
	import { getActivePriceFuelType } from '$lib/stores/filters.svelte.js';
	import { getStations } from '$lib/stores/data.svelte.js';
	import type { FuelType } from '$lib/types.js';

	let visible = $state(false);
	let activeFuel = $derived(getActivePriceFuelType());
	let stations = $derived(getStations());
	let hasAlert = $derived(hasActiveAlert());

	let currentThreshold = $derived(getThreshold(activeFuel));

	// Count stations below threshold
	let belowCount = $derived.by(() => {
		if (currentThreshold === null) return 0;
		return stations.filter((s) => {
			const p = s.prices.find((pr) => pr.fuelType === activeFuel)?.price;
			return p !== undefined && p <= currentThreshold!;
		}).length;
	});

	// Average price for current fuel type
	let avgPrice = $derived.by(() => {
		const prices = stations
			.map((s) => s.prices.find((p) => p.fuelType === activeFuel)?.price)
			.filter((p): p is number => p !== undefined);
		if (prices.length === 0) return null;
		return prices.reduce((sum, p) => sum + p, 0) / prices.length;
	});

	let inputValue = $state('');

	$effect(() => {
		inputValue = currentThreshold !== null ? currentThreshold.toFixed(3) : (avgPrice?.toFixed(3) ?? '');
	});

	function fuelLabel(type: FuelType): string {
		const labels: Record<FuelType, string> = {
			euro95: 'Euro 95', euro98: 'Euro 98', diesel: 'Diesel', lpg: 'LPG'
		};
		return labels[type] ?? type;
	}

	function applyThreshold() {
		const val = parseFloat(inputValue);
		if (!isNaN(val) && val > 0) {
			setThreshold(activeFuel, val);
		}
	}

	function removeThreshold() {
		clearThreshold(activeFuel);
	}

	function adjustPrice(delta: number) {
		const current = parseFloat(inputValue);
		if (isNaN(current)) return;
		const newVal = Math.max(0.001, current + delta);
		inputValue = newVal.toFixed(3);
		setThreshold(activeFuel, newVal);
	}
</script>

<!-- Alert bell button -->
<div class="pointer-events-none absolute right-0 bottom-20 z-10 p-3 sm:bottom-24 sm:p-4">
	<button
		onclick={() => { visible = !visible; }}
		class="glass glass-hover pointer-events-auto flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 sm:h-11 sm:w-11
			{hasAlert ? 'border-green-300 text-green-600' : 'text-gray-500'}"
		aria-label="Prijs alert"
		title="Prijs alert"
	>
		<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
			<path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
		</svg>
		{#if hasAlert}
			<span class="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-green-500"></span>
		{/if}
	</button>
</div>

{#if visible}
	<div class="pointer-events-none absolute bottom-36 right-0 z-10 p-3 sm:bottom-40 sm:p-4">
		<div class="glass pointer-events-auto w-64 rounded-2xl p-4 shadow-lg">
			<h3 class="mb-2 text-sm font-semibold text-gray-800">Prijs alert — {fuelLabel(activeFuel)}</h3>
			<p class="mb-3 text-[11px] text-gray-500">
				Markeer stations onder jouw limiet met een groene ring.
			</p>

			<!-- Price input with +/- buttons -->
			<div class="mb-3 flex items-center gap-2">
				<button
					onclick={() => adjustPrice(-0.01)}
					class="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
				>-</button>
				<div class="relative flex-1">
					<span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-gray-400">&euro;</span>
					<input
						type="text"
						bind:value={inputValue}
						onchange={applyThreshold}
						class="w-full rounded-xl border border-gray-200 bg-white/60 py-1.5 pl-7 pr-3 text-center text-sm font-medium text-gray-800 outline-none focus:border-blue-500/50 focus:bg-white"
					/>
				</div>
				<button
					onclick={() => adjustPrice(0.01)}
					class="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
				>+</button>
			</div>

			<div class="flex gap-2">
				<button
					onclick={applyThreshold}
					class="flex-1 rounded-xl bg-green-600 py-2 text-xs font-medium text-white transition-colors hover:bg-green-700"
				>
					Activeer
				</button>
				{#if currentThreshold !== null}
					<button
						onclick={removeThreshold}
						class="rounded-xl bg-gray-100 px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200"
					>
						Uit
					</button>
				{/if}
			</div>

			{#if currentThreshold !== null}
				<div class="mt-2 text-center text-xs text-green-600 font-medium">
					{belowCount} station{belowCount !== 1 ? 's' : ''} onder limiet
				</div>
			{/if}
		</div>
	</div>
{/if}
