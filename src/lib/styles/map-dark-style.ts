import type { StyleSpecification } from 'maplibre-gl';

/**
 * Custom dark map style for Fuel Finder NL.
 * Uses OpenFreeMap vector tiles with dark color overrides.
 * Based on the positron style with navy/dark slate palette.
 */
export const darkMapStyle: StyleSpecification = {
	version: 8,
	name: 'Fuel Finder Dark',
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
				'background-color': '#0c1220'
			}
		},
		// Water
		{
			id: 'water',
			type: 'fill',
			source: 'openmaptiles',
			'source-layer': 'water',
			paint: {
				'fill-color': '#0a1628'
			}
		},
		// Land cover (parks, forests)
		{
			id: 'landcover',
			type: 'fill',
			source: 'openmaptiles',
			'source-layer': 'landcover',
			paint: {
				'fill-color': '#111b2e',
				'fill-opacity': 0.6
			}
		},
		// Land use (residential, commercial)
		{
			id: 'landuse',
			type: 'fill',
			source: 'openmaptiles',
			'source-layer': 'landuse',
			paint: {
				'fill-color': '#111827',
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
				'fill-color': '#1a2438',
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
				'line-color': '#1e293b',
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
				'line-color': '#253048',
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
				'line-color': '#2d3a52',
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
				'line-color': '#334566',
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
				'line-color': '#334155',
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
				'text-color': '#94a3b8',
				'text-halo-color': '#0f172a',
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
				'text-color': '#64748b',
				'text-halo-color': '#0f172a',
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
				'text-color': '#475569',
				'text-halo-color': '#0f172a',
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
				'text-color': '#475569',
				'text-halo-color': '#0f172a',
				'text-halo-width': 1
			}
		}
	]
};
