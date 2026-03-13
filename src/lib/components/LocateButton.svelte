<script lang="ts">
	import { getLocation, requestLocation, hasLocation } from '$lib/stores/location.svelte.js';

	interface Props {
		onLocate?: (lat: number, lng: number) => void;
	}

	let { onLocate }: Props = $props();

	let location = $derived(getLocation());
	let located = $derived(hasLocation());

	function handleClick() {
		requestLocation();
	}

	// When location becomes available, notify parent
	$effect(() => {
		if (location.lat !== null && location.lng !== null && onLocate) {
			onLocate(location.lat, location.lng);
		}
	});
</script>

<div class="pointer-events-none absolute bottom-20 right-0 z-10 p-3 sm:p-4">
	<button
		onclick={handleClick}
		disabled={location.loading}
		class="glass glass-hover pointer-events-auto flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 sm:h-11 sm:w-11
			{located ? 'border-blue-300 text-blue-600' : 'text-gray-500'}"
		aria-label="Mijn locatie"
		title="Mijn locatie"
	>
		{#if location.loading}
			<!-- Loading spinner -->
			<svg class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" />
				<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
			</svg>
		{:else}
			<!-- GPS icon -->
			<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
				<circle cx="12" cy="12" r="3" />
				<path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke-linecap="round" />
			</svg>
		{/if}
	</button>

	<!-- Error toast -->
	{#if location.error}
		<div class="glass pointer-events-auto mt-2 rounded-xl px-3 py-2 text-xs text-red-600">
			{location.error}
		</div>
	{/if}
</div>
