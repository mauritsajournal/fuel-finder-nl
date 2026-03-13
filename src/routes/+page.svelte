<script lang="ts">
	import Map from '$lib/components/Map.svelte';
	import TopBar from '$lib/components/TopBar.svelte';
	import FilterBar from '$lib/components/FilterBar.svelte';
	import LocateButton from '$lib/components/LocateButton.svelte';
	import StationPanel from '$lib/components/StationPanel.svelte';
	import DataHealth from '$lib/components/DataHealth.svelte';
	import POIMarkers from '$lib/components/POIMarkers.svelte';
	import EVMarkers from '$lib/components/EVMarkers.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import { isElectricFilter } from '$lib/stores/filters.svelte.js';
	import { resolve } from '$app/paths';

	let mapComponent: Map;
	let mapInstance: import('maplibre-gl').Map | null = $state(null);
	let showPOI = $state(true);
	let showEV = $derived(isElectricFilter());

	function handleLocate(lat: number, lng: number) {
		mapComponent?.flyTo(lat, lng);
		mapComponent?.setUserLocation(lat, lng);
	}

	// Poll for map instance (set after map 'load' event)
	$effect(() => {
		if (mapInstance) return;
		const interval = setInterval(() => {
			const m = mapComponent?.getMap();
			if (m) {
				mapInstance = m;
				clearInterval(interval);
			}
		}, 200);
		return () => clearInterval(interval);
	});
</script>

<svelte:head>
	<title>Fuel Finder NL -- Goedkoopste tankstations</title>
	<meta property="og:title" content="Fuel Finder NL" />
	<meta property="og:description" content="Vind de goedkoopste tankstations in Nederland op een interactieve kaart" />
	<meta property="og:type" content="website" />
</svelte:head>

<div class="relative h-screen w-screen overflow-hidden bg-[#0c1220]">
	<!-- Full-screen map background -->
	<Map bind:this={mapComponent} />

	<!-- EV charger markers (shown when electric filter active) -->
	<EVMarkers map={mapInstance} visible={showEV} />

	<!-- POI markers (subdued, zoom > 10 only) -->
	<POIMarkers map={mapInstance} visible={showPOI} />

	<!-- Glass overlay panels -->
	<TopBar onSelect={(lat, lng) => mapComponent?.flyTo(lat, lng, 13)} />
	<LocateButton onLocate={handleLocate} />
	<DataHealth />
	<FilterBar />

	<!-- Station detail slide-up panel -->
	<StationPanel {mapInstance} />

	<!-- Toast notifications -->
	<Toast />

	<!-- Privacy link -->
	<a
		href={resolve('/privacy')}
		class="absolute bottom-16 left-3 z-10 text-[10px] text-slate-600 transition-colors hover:text-slate-400 sm:bottom-3"
	>
		Privacy
	</a>
</div>
