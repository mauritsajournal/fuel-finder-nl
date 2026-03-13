<script lang="ts">
	import { getStations } from '$lib/stores/data.svelte.js';
	import { getExcludedBrands, getExcludedCount, toggleBrand, showAllBrands, hideAllBrands, isBrandVisible } from '$lib/stores/brand-filter.svelte.js';

	let visible = $state(false);
	let stations = $derived(getStations());
	let excludedCount = $derived(getExcludedCount());

	let allBrands = $derived.by(() => {
		const brands = [...new Set(stations.map((s) => s.brand))].sort();
		return brands;
	});

	let brandCounts = $derived.by(() => {
		const counts = new Map<string, number>();
		for (const s of stations) {
			counts.set(s.brand, (counts.get(s.brand) ?? 0) + 1);
		}
		return counts;
	});

	// Force reactivity on excluded brands
	let _excluded = $derived(getExcludedBrands());
</script>

<!-- Filter button -->
<button
	onclick={() => { visible = !visible; }}
	class="glass glass-hover pointer-events-auto relative flex h-8 items-center gap-1 rounded-xl px-2.5 text-xs font-medium text-gray-600 transition-all duration-200 hover:text-gray-800
		{excludedCount > 0 ? 'border-orange-300 text-orange-600' : ''}"
	aria-label="Merk filter"
>
	<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
		<path stroke-linecap="round" stroke-linejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
	</svg>
	Merk
	{#if excludedCount > 0}
		<span class="flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[9px] font-bold text-white">
			{excludedCount}
		</span>
	{/if}
</button>

{#if visible}
	<button
		class="fixed inset-0 z-20 bg-black/20"
		onclick={() => { visible = false; }}
		aria-label="Sluit"
		tabindex="-1"
	></button>

	<div class="fixed inset-x-0 bottom-0 z-30 max-h-[50vh] overflow-y-auto rounded-t-3xl shadow-lg glass">
		<div class="flex justify-center pb-2 pt-3">
			<div class="h-1 w-10 rounded-full bg-gray-300"></div>
		</div>

		<div class="px-5 pb-6">
			<div class="mb-3 flex items-center justify-between">
				<h3 class="text-sm font-semibold text-gray-800">Filter op merk</h3>
				<div class="flex gap-2">
					<button
						onclick={() => showAllBrands()}
						class="text-xs text-blue-600 hover:text-blue-800"
					>Alles aan</button>
					<button
						onclick={() => hideAllBrands(allBrands)}
						class="text-xs text-gray-500 hover:text-gray-700"
					>Alles uit</button>
				</div>
			</div>

			<div class="flex flex-wrap gap-2">
				{#each allBrands as brand (brand)}
					{@const isVisible = isBrandVisible(brand)}
					<button
						onclick={() => toggleBrand(brand)}
						class="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-all duration-150
							{isVisible
								? 'border-blue-200 bg-blue-50 text-blue-700'
								: 'border-gray-200 bg-gray-50 text-gray-400 line-through'}"
					>
						{brand}
						<span class="text-[10px] opacity-60">{brandCounts.get(brand) ?? 0}</span>
					</button>
				{/each}
			</div>
		</div>
	</div>
{/if}
