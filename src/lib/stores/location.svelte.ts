/** User location store - GPS position from browser Geolocation API */

interface LocationState {
	lat: number | null;
	lng: number | null;
	accuracy: number | null;
	loading: boolean;
	error: string | null;
}

let state = $state<LocationState>({
	lat: null,
	lng: null,
	accuracy: null,
	loading: false,
	error: null
});

/** Get the current user location */
export function getLocation(): LocationState {
	return state;
}

/** Check if location is available */
export function hasLocation(): boolean {
	return state.lat !== null && state.lng !== null;
}

/** Request user location via Geolocation API (GDPR: only on user action) */
export function requestLocation(): void {
	if (!navigator.geolocation) {
		state = { ...state, error: 'Locatie niet beschikbaar in deze browser', loading: false };
		return;
	}

	state = { ...state, loading: true, error: null };

	navigator.geolocation.getCurrentPosition(
		(position) => {
			state = {
				lat: position.coords.latitude,
				lng: position.coords.longitude,
				accuracy: position.coords.accuracy,
				loading: false,
				error: null
			};
		},
		(err) => {
			let errorMsg: string;
			switch (err.code) {
				case err.PERMISSION_DENIED:
					errorMsg = 'Locatietoegang geweigerd';
					break;
				case err.POSITION_UNAVAILABLE:
					errorMsg = 'Locatie niet beschikbaar';
					break;
				case err.TIMEOUT:
					errorMsg = 'Locatieverzoek verlopen';
					break;
				default:
					errorMsg = 'Onbekende locatiefout';
			}
			state = { ...state, error: errorMsg, loading: false };
		},
		{
			enableHighAccuracy: true,
			timeout: 10000,
			maximumAge: 60000
		}
	);
}
