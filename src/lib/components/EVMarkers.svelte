<script lang="ts">
	/**
	 * EV charger markers on the map (T-014).
	 *
	 * Shows EV charging stations as lightning-bolt-style markers.
	 * Green for fast chargers (>50kW), blue for regular (<50kW).
	 * Clustering at low zoom levels.
	 * Click to show detail popup with operator, connectors, power, pricing.
	 */
	import { getEVChargers } from '$lib/stores/data.svelte.js';
	import type { EVCharger } from '$lib/types.js';

	interface Props {
		map: import('maplibre-gl').Map | null;
		visible?: boolean;
	}

	let { map, visible = true }: Props = $props();

	let evData = $derived(getEVChargers());
	let sourceAdded = $state(false);

	/** Determine if a charger has any connector >= 50kW */
	function isFastCharger(charger: EVCharger): boolean {
		return charger.connectors.some((c) => c.powerKW >= 50);
	}

	/** Get max power across all connectors */
	function maxPower(charger: EVCharger): number {
		if (charger.connectors.length === 0) return 0;
		return Math.max(...charger.connectors.map((c) => c.powerKW));
	}

	function buildGeoJSON(chargers: EVCharger[]) {
		return {
			type: 'FeatureCollection' as const,
			features: chargers.map((charger) => ({
				type: 'Feature' as const,
				geometry: {
					type: 'Point' as const,
					coordinates: [charger.lng, charger.lat]
				},
				properties: {
					id: charger.id,
					operator: charger.operator,
					isFast: isFastCharger(charger),
					maxPowerKW: maxPower(charger),
					connectorCount: charger.connectors.length,
					connectorTypes: charger.connectors.map((c) => c.type).join(', '),
					pricing: charger.pricing || 'Onbekend',
					status: charger.status
				}
			}))
		};
	}

	function addEVLayers(mapInstance: import('maplibre-gl').Map) {
		if (mapInstance.getSource('ev-data')) return;

		mapInstance.addSource('ev-data', {
			type: 'geojson',
			data: buildGeoJSON(evData),
			cluster: true,
			clusterMaxZoom: 12,
			clusterRadius: 50
		});

		// Cluster circles
		mapInstance.addLayer({
			id: 'ev-clusters',
			type: 'circle',
			source: 'ev-data',
			filter: ['has', 'point_count'],
			paint: {
				'circle-color': '#3b82f6',
				'circle-radius': ['step', ['get', 'point_count'], 16, 10, 20, 50, 26],
				'circle-opacity': 0.7,
				'circle-stroke-width': 2,
				'circle-stroke-color': 'rgba(59, 130, 246, 0.3)'
			}
		});

		// Cluster count labels
		mapInstance.addLayer({
			id: 'ev-cluster-count',
			type: 'symbol',
			source: 'ev-data',
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

		// Individual charger markers (unclustered)
		mapInstance.addLayer({
			id: 'ev-markers',
			type: 'circle',
			source: 'ev-data',
			filter: ['!', ['has', 'point_count']],
			paint: {
				// Green for fast (>50kW), blue for regular
				'circle-color': [
					'case',
					['get', 'isFast'],
					'#22c55e', // green-500
					'#3b82f6' // blue-500
				],
				'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 4, 12, 7, 16, 10],
				'circle-opacity': 0.85,
				'circle-stroke-width': 2,
				'circle-stroke-color': [
					'case',
					['get', 'isFast'],
					'rgba(34, 197, 94, 0.3)',
					'rgba(59, 130, 246, 0.3)'
				],
				'circle-pitch-alignment': 'map'
			}
		});

		// Lightning bolt symbol at higher zoom
		mapInstance.addLayer({
			id: 'ev-labels',
			type: 'symbol',
			source: 'ev-data',
			filter: ['!', ['has', 'point_count']],
			minzoom: 12,
			layout: {
				'text-field': '\u26A1',
				'text-size': 10,
				'text-allow-overlap': false
			},
			paint: {
				'text-color': '#ffffff'
			}
		});

		// Click on cluster -> zoom in
		mapInstance.on('click', 'ev-clusters', async (e) => {
			const features = mapInstance.queryRenderedFeatures(e.point, {
				layers: ['ev-clusters']
			});
			if (!features.length) return;

			const clusterId = features[0].properties?.cluster_id;
			const source = mapInstance.getSource('ev-data') as import('maplibre-gl').GeoJSONSource;
			try {
				const zoom = await source.getClusterExpansionZoom(clusterId);
				const coords = (features[0].geometry as { type: string; coordinates: number[] }).coordinates;
				mapInstance.easeTo({
					center: coords as [number, number],
					zoom: zoom
				});
			} catch {
				// ignore cluster zoom errors
			}
		});

		// Click on individual charger -> show popup
		mapInstance.on('click', 'ev-markers', (e) => {
			if (!e.features || e.features.length === 0) return;
			const feature = e.features[0];
			const props = feature.properties;
			const coords = (feature.geometry as { type: string; coordinates: number[] }).coordinates;

			const operator = props?.operator || 'Onbekend';
			const maxPwr = props?.maxPowerKW || 0;
			const connTypes = props?.connectorTypes || '';
			const pricing = props?.pricing || 'Onbekend';
			const isFast = props?.isFast;
			const statusLabel = props?.status === 'operational' ? 'Beschikbaar' : props?.status || '';

			const speedLabel = isFast ? 'Snellader' : 'Normaal';
			const speedColor = isFast ? '#22c55e' : '#3b82f6';

			import('maplibre-gl').then((maplibregl) => {
				new maplibregl.Popup({ closeButton: true, className: 'ev-popup', maxWidth: '260px' })
					.setLngLat(coords as [number, number])
					.setHTML(
						`<div style="font-family:system-ui;font-size:13px;">
							<strong>${operator}</strong>
							<span style="display:inline-block;background:${speedColor};color:white;font-size:10px;padding:1px 6px;border-radius:8px;margin-left:6px;">${speedLabel}</span>
							<br/>
							<span style="opacity:0.7">${connTypes}</span><br/>
							<span style="opacity:0.7">Max ${maxPwr} kW</span><br/>
							<span style="opacity:0.7">Kosten: ${pricing}</span>
							${statusLabel ? `<br/><span style="opacity:0.5;font-size:11px">${statusLabel}</span>` : ''}
						</div>`
					)
					.addTo(mapInstance);
			});
		});

		// Cursor styles
		mapInstance.on('mouseenter', 'ev-markers', () => {
			mapInstance.getCanvas().style.cursor = 'pointer';
		});
		mapInstance.on('mouseleave', 'ev-markers', () => {
			mapInstance.getCanvas().style.cursor = '';
		});
		mapInstance.on('mouseenter', 'ev-clusters', () => {
			mapInstance.getCanvas().style.cursor = 'pointer';
		});
		mapInstance.on('mouseleave', 'ev-clusters', () => {
			mapInstance.getCanvas().style.cursor = '';
		});

		sourceAdded = true;
	}

	// Update data when EV chargers change
	$effect(() => {
		if (!map || !sourceAdded) return;
		const source = map.getSource('ev-data') as import('maplibre-gl').GeoJSONSource | undefined;
		if (source) {
			source.setData(buildGeoJSON(evData));
		}
	});

	// Toggle visibility based on prop
	$effect(() => {
		if (!map || !sourceAdded) return;
		const vis = visible ? 'visible' : 'none';
		const layerIds = ['ev-clusters', 'ev-cluster-count', 'ev-markers', 'ev-labels'];
		for (const id of layerIds) {
			if (map.getLayer(id)) {
				map.setLayoutProperty(id, 'visibility', vis);
			}
		}
	});

	// Add layers when map becomes available
	$effect(() => {
		if (map && !sourceAdded) {
			addEVLayers(map);
		}
	});
</script>
