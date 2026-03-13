<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { darkMapStyle } from '$lib/styles/map-dark-style.js';

	let mapContainer: HTMLDivElement;
	let map: import('maplibre-gl').Map | null = $state(null);

	// Netherlands center and zoom
	const NL_CENTER: [number, number] = [5.2913, 52.1326];
	const NL_ZOOM = 7;

	/** Expose map instance for other components */
	export function getMap() {
		return map;
	}

	onMount(() => {
		if (!browser) return;

		let instance: import('maplibre-gl').Map | undefined;

		(async () => {
			const maplibregl = await import('maplibre-gl');

			// Import MapLibre CSS
			await import('maplibre-gl/dist/maplibre-gl.css');

			instance = new maplibregl.Map({
				container: mapContainer,
				style: darkMapStyle,
				center: NL_CENTER,
				zoom: NL_ZOOM,
				minZoom: 6,
				maxZoom: 18,
				attributionControl: {},
				maxBounds: [
					[2.5, 50.0], // SW
					[8.0, 54.0] // NE
				]
			});

			// Add navigation controls (zoom +/-)
			instance.addControl(
				new maplibregl.NavigationControl({ showCompass: false }),
				'bottom-right'
			);

			instance.on('load', () => {
				map = instance ?? null;
			});
		})();

		return () => {
			instance?.remove();
			map = null;
		};
	});
</script>

<div bind:this={mapContainer} class="absolute inset-0 h-full w-full"></div>
