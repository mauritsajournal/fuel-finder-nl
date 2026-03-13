/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;

const CACHE_NAME = `fuel-finder-${version}`;
const DATA_CACHE = 'fuel-finder-data-v1';

// App shell: all built assets + static files
const APP_SHELL = [...build, ...files];

// Install: cache app shell
sw.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE_NAME)
			.then((cache) => cache.addAll(APP_SHELL))
			.then(() => sw.skipWaiting())
	);
});

// Activate: clean old caches
sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys
						.filter((key) => key !== CACHE_NAME && key !== DATA_CACHE)
						.map((key) => caches.delete(key))
				)
			)
			.then(() => sw.clients.claim())
	);
});

// Fetch: cache-first for app shell, network-first for data tiles
sw.addEventListener('fetch', (event) => {
	const url = new URL(event.request.url);

	// Skip non-GET requests
	if (event.request.method !== 'GET') return;

	// Skip cross-origin requests that aren't tile data
	if (url.origin !== sw.location.origin && !url.pathname.includes('/tiles/')) return;

	// Data tiles: network-first with cache fallback
	if (url.pathname.includes('/tiles/') || url.pathname.endsWith('metadata.json')) {
		event.respondWith(
			fetch(event.request)
				.then((response) => {
					if (response.ok) {
						const clone = response.clone();
						caches.open(DATA_CACHE).then((cache) => cache.put(event.request, clone));
					}
					return response;
				})
				.catch(() => caches.match(event.request).then((r) => r || new Response('Offline', { status: 503 })))
		);
		return;
	}

	// App shell: cache-first
	if (APP_SHELL.includes(url.pathname)) {
		event.respondWith(
			caches.match(event.request).then((cached) => cached || fetch(event.request))
		);
		return;
	}

	// Everything else: network with cache fallback
	event.respondWith(
		fetch(event.request).catch(() =>
			caches.match(event.request).then((r) => r || new Response('Offline', { status: 503 }))
		)
	);
});
