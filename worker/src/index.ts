/**
 * Cloudflare Worker: Routing proxy for Fuel Finder NL
 *
 * Proxies requests to OpenRouteService API, adding the API key server-side.
 * Validates coordinates are within NL bounds and enforces per-IP rate limiting.
 *
 * Endpoints:
 *   GET /route?start=lng,lat&end=lng,lat&profile=driving-car
 *   GET /geocode?text=Amsterdam
 *   GET /health
 */

interface Env {
	ORS_API_KEY: string;
}

// NL bounding box (with margin)
const NL_BOUNDS = {
	south: 50.5,
	north: 53.7,
	west: 3.2,
	east: 7.4,
};

// Simple in-memory rate limiting (resets on Worker restart, acceptable for PoC)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // requests per minute per IP
const RATE_WINDOW = 60_000; // 1 minute

const ALLOWED_ORIGINS = [
	'https://mauritsajournal.github.io',
	'http://localhost:5173',
	'http://localhost:4173',
];

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);

		// CORS preflight
		if (request.method === 'OPTIONS') {
			return corsResponse(request, new Response(null, { status: 204 }));
		}

		// Health check
		if (url.pathname === '/health') {
			return corsResponse(
				request,
				new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
					headers: { 'Content-Type': 'application/json' },
				}),
			);
		}

		// Rate limiting
		const clientIP = request.headers.get('CF-Connecting-IP') ?? 'unknown';
		if (!checkRateLimit(clientIP)) {
			return corsResponse(
				request,
				new Response(JSON.stringify({ error: 'Rate limit exceeded. Max 10 requests/minute.' }), {
					status: 429,
					headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
				}),
			);
		}

		// Check API key is configured
		if (!env.ORS_API_KEY) {
			return corsResponse(
				request,
				new Response(JSON.stringify({ error: 'Server configuration error' }), {
					status: 500,
					headers: { 'Content-Type': 'application/json' },
				}),
			);
		}

		try {
			if (url.pathname === '/route') {
				return corsResponse(request, await handleRoute(url, env));
			} else if (url.pathname === '/geocode') {
				return corsResponse(request, await handleGeocode(url, env));
			} else {
				return corsResponse(
					request,
					new Response(JSON.stringify({ error: 'Not found', endpoints: ['/route', '/geocode', '/health'] }), {
						status: 404,
						headers: { 'Content-Type': 'application/json' },
					}),
				);
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Unknown error';
			return corsResponse(
				request,
				new Response(JSON.stringify({ error: 'Internal error', message }), {
					status: 502,
					headers: { 'Content-Type': 'application/json' },
				}),
			);
		}
	},
};

/** Handle /route — proxy to ORS Directions API */
async function handleRoute(url: URL, env: Env): Promise<Response> {
	const start = url.searchParams.get('start'); // lng,lat
	const end = url.searchParams.get('end'); // lng,lat
	const profile = url.searchParams.get('profile') ?? 'driving-car';

	if (!start || !end) {
		return new Response(
			JSON.stringify({ error: 'Missing required parameters: start, end (format: lng,lat)' }),
			{ status: 400, headers: { 'Content-Type': 'application/json' } },
		);
	}

	// Parse and validate coordinates
	const startCoords = parseCoords(start);
	const endCoords = parseCoords(end);

	if (!startCoords || !endCoords) {
		return new Response(
			JSON.stringify({ error: 'Invalid coordinate format. Expected: lng,lat' }),
			{ status: 400, headers: { 'Content-Type': 'application/json' } },
		);
	}

	if (!isInNL(startCoords) || !isInNL(endCoords)) {
		return new Response(
			JSON.stringify({ error: 'Coordinates must be within the Netherlands' }),
			{ status: 400, headers: { 'Content-Type': 'application/json' } },
		);
	}

	// Proxy to ORS
	const orsUrl = `https://api.openrouteservice.org/v2/directions/${profile}?start=${start}&end=${end}`;
	const orsResponse = await fetch(orsUrl, {
		headers: {
			Authorization: env.ORS_API_KEY,
			Accept: 'application/json',
		},
	});

	const body = await orsResponse.text();
	return new Response(body, {
		status: orsResponse.status,
		headers: { 'Content-Type': 'application/json' },
	});
}

/** Handle /geocode — proxy to ORS Geocode API */
async function handleGeocode(url: URL, env: Env): Promise<Response> {
	const text = url.searchParams.get('text');

	if (!text || text.length < 2) {
		return new Response(
			JSON.stringify({ error: 'Missing or too short search text (min 2 chars)' }),
			{ status: 400, headers: { 'Content-Type': 'application/json' } },
		);
	}

	// Sanitize input
	const sanitized = text.slice(0, 100).replace(/[<>]/g, '');

	// Proxy to ORS Geocode, scoped to Netherlands
	const orsUrl = new URL('https://api.openrouteservice.org/geocode/search');
	orsUrl.searchParams.set('text', sanitized);
	orsUrl.searchParams.set('boundary.country', 'NL');
	orsUrl.searchParams.set('size', '5');

	const orsResponse = await fetch(orsUrl.toString(), {
		headers: {
			Authorization: env.ORS_API_KEY,
			Accept: 'application/json',
		},
	});

	const body = await orsResponse.text();
	return new Response(body, {
		status: orsResponse.status,
		headers: { 'Content-Type': 'application/json' },
	});
}

/** Parse "lng,lat" string into [lng, lat] */
function parseCoords(str: string): [number, number] | null {
	const parts = str.split(',').map(Number);
	if (parts.length !== 2 || parts.some(isNaN)) return null;
	return [parts[0], parts[1]];
}

/** Check if coordinates [lng, lat] are within NL bounds */
function isInNL(coords: [number, number]): boolean {
	const [lng, lat] = coords;
	return (
		lat >= NL_BOUNDS.south &&
		lat <= NL_BOUNDS.north &&
		lng >= NL_BOUNDS.west &&
		lng <= NL_BOUNDS.east
	);
}

/** Simple per-IP rate limiting */
function checkRateLimit(ip: string): boolean {
	const now = Date.now();
	const entry = rateLimitMap.get(ip);

	if (!entry || now > entry.resetAt) {
		rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
		return true;
	}

	if (entry.count >= RATE_LIMIT) {
		return false;
	}

	entry.count++;
	return true;
}

/** Add CORS headers to response */
function corsResponse(request: Request, response: Response): Response {
	const origin = request.headers.get('Origin') ?? '';
	const allowedOrigin = ALLOWED_ORIGINS.includes(origin)
		? origin
		: origin.startsWith('http://localhost:')
			? origin
			: ALLOWED_ORIGINS[0];

	const headers = new Headers(response.headers);
	headers.set('Access-Control-Allow-Origin', allowedOrigin);
	headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
	headers.set('Access-Control-Allow-Headers', 'Content-Type');
	headers.set('Access-Control-Max-Age', '86400');

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}
