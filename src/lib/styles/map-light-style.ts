import type { StyleSpecification } from 'maplibre-gl';

/**
 * Clean light map style for Fuel Finder NL.
 * Uses OpenFreeMap vector tiles with a soft, readable palette.
 */
export const lightMapStyle: StyleSpecification = {
	version: 8,
	name: 'Fuel Finder Light',
	sources: {
		openmaptiles: {
			type: 'vector',
			url: 'https://tiles.openfreemap.org/planet',
			attribution:
				'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
		}
	},
	glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
	layers: [
		// Background
		{
			id: 'background',
			type: 'background',
			paint: {
				'background-color': '#f0f0f0'
			}
		},
		// Water
		{
			id: 'water',
			type: 'fill',
			source: 'openmaptiles',
			'source-layer': 'water',
			paint: {
				'fill-color': '#c4dff6'
			}
		},
		// Land cover (parks, forests)
		{
			id: 'landcover',
			type: 'fill',
			source: 'openmaptiles',
			'source-layer': 'landcover',
			paint: {
				'fill-color': '#d5e8d4',
				'fill-opacity': 0.5
			}
		},
		// Land use (residential, commercial)
		{
			id: 'landuse',
			type: 'fill',
			source: 'openmaptiles',
			'source-layer': 'landuse',
			paint: {
				'fill-color': '#e8e8e8',
				'fill-opacity': 0.4
			}
		},
		// Buildings
		{
			id: 'building',
			type: 'fill',
			source: 'openmaptiles',
			'source-layer': 'building',
			minzoom: 13,
			paint: {
				'fill-color': '#d9d9d9',
				'fill-opacity': 0.7
			}
		},
		// Roads - minor
		{
			id: 'road-minor',
			type: 'line',
			source: 'openmaptiles',
			'source-layer': 'transportation',
			filter: ['all', ['==', '$type', 'LineString'], ['in', 'class', 'minor', 'service']],
			paint: {
				'line-color': '#ffffff',
				'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.5, 18, 4]
			}
		},
		// Roads - secondary/tertiary
		{
			id: 'road-secondary',
			type: 'line',
			source: 'openmaptiles',
			'source-layer': 'transportation',
			filter: ['all', ['==', '$type', 'LineString'], ['in', 'class', 'secondary', 'tertiary']],
			paint: {
				'line-color': '#ffffff',
				'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 18, 8]
			}
		},
		// Roads - primary
		{
			id: 'road-primary',
			type: 'line',
			source: 'openmaptiles',
			'source-layer': 'transportation',
			filter: ['all', ['==', '$type', 'LineString'], ['==', 'class', 'primary']],
			paint: {
				'line-color': '#fcd34d',
				'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.5, 18, 10]
			}
		},
		// Roads - motorway/trunk
		{
			id: 'road-motorway',
			type: 'line',
			source: 'openmaptiles',
			'source-layer': 'transportation',
			filter: ['all', ['==', '$type', 'LineString'], ['in', 'class', 'motorway', 'trunk']],
			paint: {
				'line-color': '#fb923c',
				'line-width': ['interpolate', ['linear'], ['zoom'], 5, 1, 18, 14]
			}
		},
		// Boundaries
		{
			id: 'boundary',
			type: 'line',
			source: 'openmaptiles',
			'source-layer': 'boundary',
			filter: ['==', 'admin_level', 2],
			paint: {
				'line-color': '#9ca3af',
				'line-width': 1,
				'line-dasharray': [3, 2]
			}
		},
		// Place labels - cities
		{
			id: 'place-city',
			type: 'symbol',
			source: 'openmaptiles',
			'source-layer': 'place',
			filter: ['==', 'class', 'city'],
			layout: {
				'text-field': '{name}',
				'text-font': ['Noto Sans Regular'],
				'text-size': ['interpolate', ['linear'], ['zoom'], 5, 11, 12, 16],
				'text-max-width': 8
			},
			paint: {
				'text-color': '#374151',
				'text-halo-color': '#ffffff',
				'text-halo-width': 1.5
			}
		},
		// Place labels - towns
		{
			id: 'place-town',
			type: 'symbol',
			source: 'openmaptiles',
			'source-layer': 'place',
			filter: ['==', 'class', 'town'],
			minzoom: 8,
			layout: {
				'text-field': '{name}',
				'text-font': ['Noto Sans Regular'],
				'text-size': ['interpolate', ['linear'], ['zoom'], 8, 10, 14, 14],
				'text-max-width': 7
			},
			paint: {
				'text-color': '#6b7280',
				'text-halo-color': '#ffffff',
				'text-halo-width': 1
			}
		},
		// Place labels - villages
		{
			id: 'place-village',
			type: 'symbol',
			source: 'openmaptiles',
			'source-layer': 'place',
			filter: ['==', 'class', 'village'],
			minzoom: 10,
			layout: {
				'text-field': '{name}',
				'text-font': ['Noto Sans Regular'],
				'text-size': 11,
				'text-max-width': 6
			},
			paint: {
				'text-color': '#9ca3af',
				'text-halo-color': '#ffffff',
				'text-halo-width': 1
			}
		},
		// Road labels
		{
			id: 'road-label',
			type: 'symbol',
			source: 'openmaptiles',
			'source-layer': 'transportation_name',
			minzoom: 12,
			layout: {
				'text-field': '{name}',
				'text-font': ['Noto Sans Regular'],
				'text-size': 10,
				'symbol-placement': 'line',
				'text-rotation-alignment': 'map'
			},
			paint: {
				'text-color': '#9ca3af',
				'text-halo-color': '#ffffff',
				'text-halo-width': 1
			}
		}
	]
};
