<script lang="ts">
	import { getMetadata, getStations, isLoading } from '$lib/stores/data.svelte.js';

	let metadata = $derived(getMetadata());
	let stations = $derived(getStations());
	let loading = $derived(isLoading());
	let expanded = $state(false);

	/** Calculate hours since a timestamp */
	function hoursSince(isoDate: string): number {
		const then = new Date(isoDate).getTime();
		const now = Date.now();
		return (now - then) / (1000 * 60 * 60);
	}

	/** Format relative time in Dutch */
	function relativeTime(isoDate: string): string {
		const hours = hoursSince(isoDate);
		if (hours < 1) return 'minder dan een uur geleden';
		if (hours < 2) return '1 uur geleden';
		if (hours < 24) return `${Math.floor(hours)} uur geleden`;
		const days = Math.floor(hours / 24);
		if (days === 1) return '1 dag geleden';
		return `${days} dagen geleden`;
	}

	/** Get freshness color class based on hours */
	function freshnessColor(isoDate: string): string {
		const hours = hoursSince(isoDate);
		if (hours > 24) return 'text-red-600';
		if (hours > 8) return 'text-amber-600';
		return 'text-gray-500';
	}

	let fuelUpdated = $derived(metadata?.lastUpdated?.fuel ?? null);
	let evUpdated = $derived(metadata?.lastUpdated?.ev ?? null);
	let poiUpdated = $derived(metadata?.lastUpdated?.poi ?? null);

	function toggle() {
		expanded = !expanded;
	}
</script>

{#if metadata && fuelUpdated}
	<div class="pointer-events-none absolute bottom-16 left-0 z-10 p-3 sm:bottom-20">
		<!-- Freshness indicator -->
		<button
			onclick={toggle}
			class="glass pointer-events-auto rounded-xl px-2.5 py-1.5 text-[11px] transition-all duration-200 hover:bg-gray-50 {freshnessColor(fuelUpdated)}"
			aria-expanded={expanded}
			aria-label="Data gezondheid"
		>
			{#if loading}
				Laden...
			{:else}
				Prijzen {relativeTime(fuelUpdated)}
			{/if}
		</button>

		<!-- Expanded health panel -->
		{#if expanded}
			<div class="glass pointer-events-auto mt-2 w-56 rounded-xl p-3">
				<h3 class="mb-2 text-xs font-semibold text-gray-800">Data status</h3>

				<div class="space-y-1.5 text-[11px]">
					<!-- Fuel data -->
					<div class="flex items-center justify-between">
						<span class="text-gray-500">Brandstof</span>
						<span class={freshnessColor(fuelUpdated)}>
							{relativeTime(fuelUpdated)}
						</span>
					</div>

					<!-- EV data -->
					<div class="flex items-center justify-between">
						<span class="text-gray-500">EV laders</span>
						{#if evUpdated}
							<span class={freshnessColor(evUpdated)}>
								{relativeTime(evUpdated)}
							</span>
						{:else}
							<span class="text-gray-300">niet beschikbaar</span>
						{/if}
					</div>

					<!-- POI data -->
					<div class="flex items-center justify-between">
						<span class="text-gray-500">Voorzieningen</span>
						{#if poiUpdated}
							<span class={freshnessColor(poiUpdated)}>
								{relativeTime(poiUpdated)}
							</span>
						{:else}
							<span class="text-gray-300">niet beschikbaar</span>
						{/if}
					</div>

					<!-- Counts -->
					<div class="mt-2 border-t border-gray-100 pt-2">
						<div class="flex items-center justify-between">
							<span class="text-gray-500">Stations geladen</span>
							<span class="text-gray-800 font-medium">{stations.length}</span>
						</div>
						{#if metadata.chargerCount > 0}
							<div class="flex items-center justify-between">
								<span class="text-gray-500">Laadpunten</span>
								<span class="text-gray-800 font-medium">{metadata.chargerCount}</span>
							</div>
						{/if}
					</div>
				</div>
			</div>
		{/if}
	</div>
{/if}
