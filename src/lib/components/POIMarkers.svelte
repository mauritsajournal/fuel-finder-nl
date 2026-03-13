<script lang="ts">
	/**
	 * POI markers on the map (T-015).
	 *
	 * Shows toilets, rest areas, and service areas as small muted markers.
	 * Only visible at zoom > 10 to avoid clutter at country level.
	 * Visually subdued compared to fuel/EV markers.
	 */
	import { onMount } from 'svelte';
	import { getPOIs } from '$lib/stores/data.svelte.js';
	import type { POI } from '$lib/types.js';

	interface Props {
		map: import('maplibre-gl').Map | null;
		visible?: boolean;
	}

	let { map, visible = true }: Props = $props();

	let poiData = $derived(getPOIs());
	let sourceAdded = $state(false);

	const POI_COLORS: Record<string, string> = {
		toilet: '#8b5cf6',    // purple
		rest_area: '#06b6d4', // cyan
		services: '#f59e0b',  // amber
		playground: '#22c55e' // green
	};

	const POI_LABELS: Record<string, string> = {
		toilet: 'WC',
		rest_area: 'R',
		services: 'S',
		playground: 'P'
	};

	function buildGeoJSON(pois: POI[]) {
		return {
			type: 'FeatureCollection' as const,
			features: pois.map((poi) => ({
				type: 'Feature' as const,
				geometry: {
					type: 'Point' as const,
					coordinates: [poi.lng, poi.lat]
				},
				properties: {
					id: poi.id,
					type: poi.type,
					name: poi.name || '',
					color: POI_COLORS[poi.type] || '#9ca3af',
					label: POI_LABELS[poi.type] || '?'
				}
			}))
		};
	}

	function addPOILayers(mapInstance: import('maplibre-gl').Map) {
		if (mapInstance.getSource('poi-data')) return;

		mapInstance.addSource('poi-data', {
			type: 'geojson',
			data: buildGeoJSON(poiData)
		});

		// Small circle markers, only visible at zoom > 10
		mapInstance.addLayer({
			id: 'poi-circles',
			type: 'circle',
			source: 'poi-data',
			minzoom: 10,
			paint: {
				'circle-radius': 5,
				'circle-color': ['get', 'color'],
				'circle-opacity': 0.5,
				'circle-stroke-width': 1,
				'circle-stroke-color': 'rgba(255, 255, 255, 0.2)',
				'circle-pitch-alignment': 'map'
			}
		});

		// Label text at higher zoom
		mapInstance.addLayer({
			id: 'poi-labels',
			type: 'symbol',
			source: 'poi-data',
			minzoom: 13,
			layout: {
				'text-field': ['get', 'label'],
				'text-size': 9,
				'text-offset': [0, 1.5],
				'text-anchor': 'top',
				'text-allow-overlap': false
			},
			paint: {
				'text-color': 'rgba(255, 255, 255, 0.5)',
				'text-halo-color': 'rgba(0, 0, 0, 0.5)',
				'text-halo-width': 1
			}
		});

		// Click handler for popup
		mapInstance.on('click', 'poi-circles', (e) => {
			if (!e.features || e.features.length === 0) return;
			const feature = e.features[0];
			const props = feature.properties;
			const coords = (feature.geometry as GeoJSON.Point).coordinates;

			const typeLabels: Record<string, string> = {
				toilet: 'Toilet',
				rest_area: 'Rustplaats',
				services: 'Verzorgingsplaats',
				playground: 'Speeltuin'
			};

			const name = props?.name || typeLabels[props?.type ?? ''] || 'Onbekend';
			const typeName = typeLabels[props?.type ?? ''] || props?.type || '';

			// Use a simple popup via MapLibre
			import('maplibre-gl').then((maplibregl) => {
				new maplibregl.Popup({ closeButton: false, className: 'poi-popup' })
					.setLngLat(coords as [number, number])
					.setHTML(`<strong>${name}</strong><br/><span style="opacity:0.7">${typeName}</span>`)
					.addTo(mapInstance);
			});
		});

		// Cursor style
		mapInstance.on('mouseenter', 'poi-circles', () => {
			mapInstance.getCanvas().style.cursor = 'pointer';
		});
		mapInstance.on('mouseleave', 'poi-circles', () => {
			mapInstance.getCanvas().style.cursor = '';
		});

		sourceAdded = true;
	}

	// Update data when POIs change
	$effect(() => {
		if (!map || !sourceAdded) return;
		const source = map.getSource('poi-data') as import('maplibre-gl').GeoJSONSource | undefined;
		if (source) {
			source.setData(buildGeoJSON(poiData));
		}
	});

	// Toggle visibility
	$effect(() => {
		if (!map || !sourceAdded) return;
		const vis = visible ? 'visible' : 'none';
		map.setLayoutProperty('poi-circles', 'visibility', vis);
		map.setLayoutProperty('poi-labels', 'visibility', vis);
	});

	// Add layers when map becomes available
	$effect(() => {
		if (map && !sourceAdded) {
			addPOILayers(map);
		}
	});
</script>
