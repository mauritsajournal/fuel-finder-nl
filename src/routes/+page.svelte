<script lang="ts">
	import Map from '$lib/components/Map.svelte';
	import TopBar from '$lib/components/TopBar.svelte';
	import FilterBar from '$lib/components/FilterBar.svelte';
	import LocateButton from '$lib/components/LocateButton.svelte';

	let mapComponent: Map;

	function handleLocate(lat: number, lng: number) {
		mapComponent?.flyTo(lat, lng);
		mapComponent?.setUserLocation(lat, lng);
	}
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

	<!-- Glass overlay panels -->
	<TopBar />
	<LocateButton onLocate={handleLocate} />
	<FilterBar />
</div>
