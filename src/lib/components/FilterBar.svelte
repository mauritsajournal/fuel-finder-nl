<script lang="ts">
	import {
		getActiveFuelType,
		setActiveFuelType,
		getSortMode,
		setSortMode,
		type FilterType
	} from '$lib/stores/filters.svelte.js';
	import { hasLocation } from '$lib/stores/location.svelte.js';
	import BrandFilter from './BrandFilter.svelte';
	import StationList from './StationList.svelte';
	import RouteSearch from './RouteSearch.svelte';

	interface Props {
		mapInstance?: import('maplibre-gl').Map | null;
	}
	let { mapInstance = null }: Props = $props();

	interface Filter {
		id: FilterType;
		label: string;
		shortLabel: string;
		icon: string;
	}

	const filters: Filter[] = [
		{ id: 'euro95', label: 'Euro 95', shortLabel: 'E95', icon: '\u26FD' },
		{ id: 'diesel', label: 'Diesel', shortLabel: 'Die', icon: '\u26FD' },
		{ id: 'lpg', label: 'LPG', shortLabel: 'LPG', icon: '\u26FD' },
		{ id: 'electric', label: 'Elektrisch', shortLabel: 'EV', icon: '\u26A1' }
	];

	let activeFilter = $derived(getActiveFuelType());
	let currentSort = $derived(getSortMode());
	let locationAvailable = $derived(hasLocation());

	function selectFilter(id: FilterType) {
		setActiveFuelType(id);
	}

	function toggleSort() {
		if (!locationAvailable) return;
		setSortMode(currentSort === 'cheapest' ? 'nearest' : 'cheapest');
	}
</script>

<div class="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-3 sm:p-4">
	<div class="pointer-events-auto mx-auto flex max-w-lg flex-col items-center gap-2">
		<!-- Tool buttons row -->
		<div class="flex items-center gap-1.5">
			{#if locationAvailable}
				<button
					onclick={toggleSort}
					class="glass glass-hover pointer-events-auto flex h-8 items-center gap-1 rounded-xl px-2.5 text-xs font-medium text-gray-600 transition-all duration-200 hover:text-gray-800"
					aria-label="Sorteer op {currentSort === 'cheapest' ? 'afstand' : 'prijs'}"
				>
					{#if currentSort === 'cheapest'}
						<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						Prijs
					{:else}
						<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
							<path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
						</svg>
						Afstand
					{/if}
				</button>
			{/if}
			<BrandFilter />
			<StationList {mapInstance} />
			<RouteSearch {mapInstance} />
		</div>

		<!-- Fuel type filters -->
		<div class="glass flex items-center justify-center gap-1.5 rounded-2xl px-3 py-2 sm:gap-2 sm:px-4">
			{#each filters as filter (filter.id)}
				<button
					onclick={() => selectFilter(filter.id)}
					class="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all duration-200 sm:text-sm
						{activeFilter === filter.id
							? 'bg-blue-600 text-white border border-blue-600 shadow-sm'
							: 'text-gray-500 hover:text-gray-800 hover:bg-gray-100 border border-transparent'}"
					aria-pressed={activeFilter === filter.id}
				>
					<span>{filter.icon}</span>
					<span class="hidden sm:inline">{filter.label}</span>
					<span class="sm:hidden">{filter.shortLabel}</span>
				</button>
			{/each}
		</div>
	</div>
</div>
