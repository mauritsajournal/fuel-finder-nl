<script lang="ts">
	/**
	 * Fuel station markers on the map.
	 *
	 * Shows fuel stations as colored circle markers.
	 * Green = cheapest 25%, Yellow = middle 50%, Red = expensive 25%.
	 * Clustering at low zoom levels. Click to select station.
	 */
	import { getStations } from '$lib/stores/data.svelte.js';
	import { selectStation } from '$lib/stores/selection.svelte.js';
	import { getActivePriceFuelType } from '$lib/stores/filters.svelte.js';
	import { calculateThresholds, PRICE_COLORS } from '$lib/utils/price-colors.js';
	import type { FuelStation, FuelType } from '$lib/types.js';

	interface Props {
		map: import('maplibre-gl').Map | null;
	}

	let { map }: Props = $props();

	let stationData = $derived(getStations());
	let activeFuel = $derived(getActivePriceFuelType());
	let sourceAdded = $state(false);

	function getPrice(station: FuelStation, fuelType: FuelType): number | null {
		return station.prices.find((p) => p.fuelType === fuelType)?.price ?? null;
	}

	function buildGeoJSON(stations: FuelStation[], fuelType: FuelType) {
		const thresholds = calculateThresholds(stations, fuelType);

		return {
			type: 'FeatureCollection' as const,
			features: stations
				.filter((s) => getPrice(s, fuelType) !== null)
				.map((station) => {
					const price = getPrice(station, fuelType)!;
					let category: 'cheap' | 'average' | 'expensive' = 'average';
					if (thresholds) {
						if (price <= thresholds.p25) category = 'cheap';
						else if (price >= thresholds.p75) category = 'expensive';
					}

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
							color: PRICE_COLORS[category]
						}
					};
				})
		};
	}

	function addStationLayers(mapInstance: import('maplibre-gl').Map) {
		if (mapInstance.getSource('fuel-stations')) return;

		mapInstance.addSource('fuel-stations', {
			type: 'geojson',
			data: buildGeoJSON(stationData, activeFuel),
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
			paint: {
				'circle-color': '#eab308',
				'circle-radius': ['step', ['get', 'point_count'], 14, 10, 18, 50, 24],
				'circle-opacity': 0.7,
				'circle-stroke-width': 2,
				'circle-stroke-color': 'rgba(234, 179, 8, 0.3)'
			}
		});

		// Cluster count labels
		mapInstance.addLayer({
			id: 'fuel-cluster-count',
			type: 'symbol',
			source: 'fuel-stations',
			filter: ['has', 'point_count'],
			layout: {
				'text-field': '{point_count_abbreviated}',
				'text-size': 11,
				'text-font': ['Open Sans Bold']
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
			paint: {
				'circle-color': ['get', 'color'],
				'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 3, 10, 5, 14, 8],
				'circle-opacity': 0.85,
				'circle-stroke-width': 1.5,
				'circle-stroke-color': 'rgba(255,255,255,0.15)',
				'circle-pitch-alignment': 'map'
			}
		});

		// Price labels at higher zoom
		mapInstance.addLayer({
			id: 'fuel-price-labels',
			type: 'symbol',
			source: 'fuel-stations',
			filter: ['!', ['has', 'point_count']],
			minzoom: 13,
			layout: {
				'text-field': ['number-format', ['get', 'price'], { 'min-fraction-digits': 3, 'max-fraction-digits': 3 }],
				'text-size': 10,
				'text-offset': [0, 1.5],
				'text-allow-overlap': false,
				'text-font': ['Noto Sans Regular']
			},
			paint: {
				'text-color': '#cbd5e1',
				'text-halo-color': '#0f172a',
				'text-halo-width': 1
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
				const station = stationData.find((s) => s.id === props.id);
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

	// Update data when stations or fuel type changes
	$effect(() => {
		if (!map || !sourceAdded) return;
		const source = map.getSource('fuel-stations') as import('maplibre-gl').GeoJSONSource | undefined;
		if (source) {
			source.setData(buildGeoJSON(stationData, activeFuel));
		}
	});

	// Add layers when map becomes available
	$effect(() => {
		if (map && !sourceAdded) {
			addStationLayers(map);
		}
	});
</script>
