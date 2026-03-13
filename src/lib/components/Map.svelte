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

	/** Fly map to coordinates with animation */
	export function flyTo(lat: number, lng: number, zoom = 12) {
		map?.flyTo({ center: [lng, lat], zoom, duration: 1500 });
	}

	/** Add or update the user location marker (pulsing blue dot) */
	export function setUserLocation(lat: number, lng: number) {
		if (!map) return;

		const source = map.getSource('user-location') as import('maplibre-gl').GeoJSONSource | undefined;
		const geojson = {
			type: 'FeatureCollection' as const,
			features: [
				{
					type: 'Feature' as const,
					geometry: { type: 'Point' as const, coordinates: [lng, lat] },
					properties: {}
				}
			]
		};

		if (source) {
			source.setData(geojson);
		} else {
			map.addSource('user-location', { type: 'geojson', data: geojson });

			// Outer pulse ring
			map.addLayer({
				id: 'user-location-pulse',
				type: 'circle',
				source: 'user-location',
				paint: {
					'circle-radius': 20,
					'circle-color': '#3b82f6',
					'circle-opacity': 0.15,
					'circle-stroke-width': 0,
					'circle-pitch-alignment': 'map'
				}
			});

			// Inner dot
			map.addLayer({
				id: 'user-location-dot',
				type: 'circle',
				source: 'user-location',
				paint: {
					'circle-radius': 6,
					'circle-color': '#3b82f6',
					'circle-opacity': 1,
					'circle-stroke-color': '#ffffff',
					'circle-stroke-width': 2,
					'circle-pitch-alignment': 'map'
				}
			});
		}
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
