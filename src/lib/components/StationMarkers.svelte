<script lang="ts">
	/**
	 * Fuel station markers on the map.
	 *
	 * Shows fuel stations as colored circle markers.
	 * Green = cheapest 25% locally, Yellow = middle 50%, Red = expensive 25%.
	 * Clustering at low zoom levels. Click to select station.
	 * Only visible at zoom >= 9 for performance.
	 */
	import { getStations } from '$lib/stores/data.svelte.js';
	import { selectStation } from '$lib/stores/selection.svelte.js';
	import { getActivePriceFuelType } from '$lib/stores/filters.svelte.js';
	import { getExcludedBrands } from '$lib/stores/brand-filter.svelte.js';
	import { getThreshold } from '$lib/stores/price-alert.svelte.js';
	import { calculateLocalThresholds, PRICE_COLORS } from '$lib/utils/price-colors.js';
	import type { FuelStation, FuelType } from '$lib/types.js';

	interface Props {
		map: import('maplibre-gl').Map | null;
	}

	let { map }: Props = $props();

	let stationData = $derived(getStations());
	let activeFuel = $derived(getActivePriceFuelType());
	let excluded = $derived(getExcludedBrands());
	let sourceAdded = $state(false);

	let filteredStations = $derived(
		stationData.filter((s) => !excluded.has(s.brand))
	);

	function getPrice(station: FuelStation, fuelType: FuelType): number | null {
		return station.prices.find((p) => p.fuelType === fuelType)?.price ?? null;
	}

	function buildGeoJSON(stations: FuelStation[], fuelType: FuelType) {
		const threshold = getThreshold(fuelType);

		return {
			type: 'FeatureCollection' as const,
			features: stations
				.filter((s) => getPrice(s, fuelType) !== null)
				.map((station) => {
					const price = getPrice(station, fuelType)!;

					// Local price comparison
					const thresholds = calculateLocalThresholds(station, stations, fuelType, 15);
					let category: 'cheap' | 'average' | 'expensive' = 'average';
					if (thresholds) {
						if (price <= thresholds.p25) category = 'cheap';
						else if (price >= thresholds.p75) category = 'expensive';
					}

					// Price alert check
					const belowAlert = threshold !== null && price <= threshold;

					return {
						type: 'Feature' as const,
						geometry: {
							type: 'Point' as const,
							coordinates: [station.lng, station.lat]
						},
						properties: {
							id: station.id,
							name: station.name,
							brand: station.brand,
							price,
							category,
							color: PRICE_COLORS[category],
							belowAlert
						}
					};
				})
		};
	}

	function addStationLayers(mapInstance: import('maplibre-gl').Map) {
		if (mapInstance.getSource('fuel-stations')) return;

		mapInstance.addSource('fuel-stations', {
			type: 'geojson',
			data: buildGeoJSON(filteredStations, activeFuel),
			cluster: true,
			clusterMaxZoom: 11,
			clusterRadius: 40
		});

		// Cluster circles
		mapInstance.addLayer({
			id: 'fuel-clusters',
			type: 'circle',
			source: 'fuel-stations',
			filter: ['has', 'point_count'],
			minzoom: 9,
			paint: {
				'circle-color': '#eab308',
				'circle-radius': ['step', ['get', 'point_count'], 16, 10, 22, 50, 28],
				'circle-opacity': 0.8,
				'circle-stroke-width': 2,
				'circle-stroke-color': 'rgba(234, 179, 8, 0.4)'
			}
		});

		// Cluster count labels
		mapInstance.addLayer({
			id: 'fuel-cluster-count',
			type: 'symbol',
			source: 'fuel-stations',
			filter: ['has', 'point_count'],
			minzoom: 9,
			layout: {
				'text-field': '{point_count_abbreviated}',
				'text-size': 12,
				'text-font': ['Noto Sans Bold']
			},
			paint: {
				'text-color': '#ffffff'
			}
		});

		// Individual station markers
		mapInstance.addLayer({
			id: 'fuel-markers',
			type: 'circle',
			source: 'fuel-stations',
			filter: ['!', ['has', 'point_count']],
			minzoom: 9,
			paint: {
				'circle-color': ['get', 'color'],
				'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 4, 11, 7, 13, 10, 16, 14],
				'circle-opacity': 0.9,
				'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 9, 1, 13, 2, 16, 2.5],
				'circle-stroke-color': 'rgba(255,255,255,0.7)',
				'circle-pitch-alignment': 'map'
			}
		});

		// Price alert pulse ring for stations below threshold
		mapInstance.addLayer({
			id: 'fuel-alert-ring',
			type: 'circle',
			source: 'fuel-stations',
			filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'belowAlert'], true]],
			minzoom: 9,
			paint: {
				'circle-color': 'transparent',
				'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 8, 13, 16, 16, 22],
				'circle-stroke-width': 2.5,
				'circle-stroke-color': '#22c55e',
				'circle-stroke-opacity': 0.7
			}
		});

		// Price labels — visible from zoom 11
		mapInstance.addLayer({
			id: 'fuel-price-labels',
			type: 'symbol',
			source: 'fuel-stations',
			filter: ['!', ['has', 'point_count']],
			minzoom: 11,
			layout: {
				'text-field': ['number-format', ['get', 'price'], { 'min-fraction-digits': 3, 'max-fraction-digits': 3 }],
				'text-size': ['interpolate', ['linear'], ['zoom'], 11, 9, 13, 12, 16, 15],
				'text-offset': [0, 1.8],
				'text-allow-overlap': false,
				'text-font': ['Noto Sans Bold']
			},
			paint: {
				'text-color': '#374151',
				'text-halo-color': '#ffffff',
				'text-halo-width': 1.5
			}
		});

		// Click cluster -> zoom in
		mapInstance.on('click', 'fuel-clusters', async (e) => {
			const features = mapInstance.queryRenderedFeatures(e.point, {
				layers: ['fuel-clusters']
			});
			if (!features.length) return;

			const clusterId = features[0].properties?.cluster_id;
			const source = mapInstance.getSource('fuel-stations') as import('maplibre-gl').GeoJSONSource;
			try {
				const zoom = await source.getClusterExpansionZoom(clusterId);
				const coords = (features[0].geometry as { type: string; coordinates: number[] }).coordinates;
				mapInstance.easeTo({
					center: coords as [number, number],
					zoom
				});
			} catch {
				// ignore
			}
		});

		// Click station -> select it
		mapInstance.on('click', 'fuel-markers', (e) => {
			if (!e.features || e.features.length === 0) return;
			const props = e.features[0].properties;
			if (props?.id) {
				const station = filteredStations.find((s) => s.id === props.id);
				if (station) selectStation(station);
			}
		});

		// Cursor styles
		mapInstance.on('mouseenter', 'fuel-markers', () => {
			mapInstance.getCanvas().style.cursor = 'pointer';
		});
		mapInstance.on('mouseleave', 'fuel-markers', () => {
			mapInstance.getCanvas().style.cursor = '';
		});
		mapInstance.on('mouseenter', 'fuel-clusters', () => {
			mapInstance.getCanvas().style.cursor = 'pointer';
		});
		mapInstance.on('mouseleave', 'fuel-clusters', () => {
			mapInstance.getCanvas().style.cursor = '';
		});

		sourceAdded = true;
	}

	// Update data when stations, fuel type, or filters change
	$effect(() => {
		if (!map || !sourceAdded) return;
		// Touch reactive dependencies
		const _s = filteredStations;
		const _f = activeFuel;
		const _e = excluded;
		const source = map.getSource('fuel-stations') as import('maplibre-gl').GeoJSONSource | undefined;
		if (source) {
			source.setData(buildGeoJSON(filteredStations, activeFuel));
		}
	});

	// Add layers when map becomes available
	$effect(() => {
		if (map && !sourceAdded) {
			addStationLayers(map);
		}
	});
</script>
