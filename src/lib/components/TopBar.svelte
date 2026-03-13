<script lang="ts">
	import { searchAddress, type GeocodingResult } from '$lib/services/geocoding.js';

	interface Props {
		onSelect?: (lat: number, lng: number) => void;
	}
	let { onSelect }: Props = $props();

	let searchQuery = $state('');
	let results = $state<GeocodingResult[]>([]);
	let showDropdown = $state(false);
	let loading = $state(false);
	let selectedIndex = $state(-1);

	// Debounced search
	let debounceTimer: ReturnType<typeof setTimeout> | undefined;

	function handleInput() {
		clearTimeout(debounceTimer);
		selectedIndex = -1;

		if (searchQuery.length < 2) {
			results = [];
			showDropdown = false;
			return;
		}

		loading = true;
		debounceTimer = setTimeout(async () => {
			const r = await searchAddress(searchQuery);
			results = r;
			showDropdown = r.length > 0;
			loading = false;
		}, 300);
	}

	function selectResult(result: GeocodingResult) {
		searchQuery = result.label;
		showDropdown = false;
		results = [];
		selectedIndex = -1;
		onSelect?.(result.lat, result.lng);
	}

	function clearSearch() {
		searchQuery = '';
		results = [];
		showDropdown = false;
		selectedIndex = -1;
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
			selectedIndex = -1;
		}
	}

	function handleBlur() {
		// Small delay to allow click on dropdown item
		setTimeout(() => {
			showDropdown = false;
		}, 200);
	}
</script>

<div class="pointer-events-none absolute inset-x-0 top-0 z-10 p-3 sm:p-4">
	<div class="glass pointer-events-auto mx-auto flex max-w-lg items-center gap-3 rounded-2xl px-4 py-2.5 transition-all duration-200">
		<!-- App name -->
		<h1 class="shrink-0 text-sm font-semibold text-white sm:text-base">
			Fuel Finder NL
		</h1>

		<!-- Search input -->
		<div class="relative flex-1">
			<input
				type="text"
				bind:value={searchQuery}
				oninput={handleInput}
				onkeydown={handleKeydown}
				onblur={handleBlur}
				onfocus={() => { if (results.length > 0) showDropdown = true; }}
				placeholder="Zoek stad of adres..."
				class="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-blue-500/50 focus:bg-white/8"
				role="combobox"
				aria-expanded={showDropdown}
				aria-haspopup="listbox"
				aria-autocomplete="list"
				aria-controls="search-results"
				aria-activedescendant={selectedIndex >= 0 ? `search-result-${selectedIndex}` : undefined}
			/>

			{#if loading}
				<div class="absolute right-2 top-1/2 -translate-y-1/2">
					<div class="h-4 w-4 animate-spin rounded-full border-2 border-slate-500/30 border-t-slate-400"></div>
				</div>
			{:else if searchQuery}
				<button
					onclick={clearSearch}
					class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
					aria-label="Wis zoekveld"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			{/if}

			<!-- Dropdown results -->
			{#if showDropdown && results.length > 0}
				<ul
					id="search-results"
					role="listbox"
					class="glass absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-xl"
				>
					{#each results as result, i}
						<li
							id="search-result-{i}"
							role="option"
							aria-selected={selectedIndex === i}
						>
							<button
								class="flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition-colors
									{selectedIndex === i ? 'bg-blue-500/20 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'}"
								onmousedown={() => selectResult(result)}
							>
								<svg class="mt-0.5 h-4 w-4 shrink-0 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
									<path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
									<path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
								</svg>
								<div class="min-w-0 flex-1">
									<div class="truncate">{result.label}</div>
									{#if result.region}
										<div class="truncate text-xs text-slate-500">{result.region}</div>
									{/if}
								</div>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>
</div>
