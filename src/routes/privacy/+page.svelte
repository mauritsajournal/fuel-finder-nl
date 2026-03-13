<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>Privacy -- Fuel Finder NL</title>
</svelte:head>

<div class="min-h-screen bg-[#0f172a] px-4 py-8 text-slate-300">
	<div class="mx-auto max-w-2xl">
		<a
			href={resolve('/')}
			class="mb-6 inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
		>
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
			</svg>
			Terug naar kaart
		</a>

		<h1 class="mb-6 text-2xl font-bold text-white">Privacy</h1>

		<div class="space-y-6 text-sm leading-relaxed">
			<section>
				<h2 class="mb-2 text-lg font-semibold text-white">Welke gegevens gebruiken we?</h2>
				<ul class="list-inside list-disc space-y-1">
					<li>
						<strong>Locatie:</strong> Alleen als je op de locatieknop drukt. Je locatie wordt niet opgeslagen
						of verstuurd naar onze servers. Deze wordt uitsluitend in je browser gebruikt om de kaart
						te centreren en afstanden te berekenen.
					</li>
					<li>
						<strong>Zoekopdrachten:</strong> Wanneer je een adres zoekt, wordt de zoektekst via onze proxy
						naar OpenRouteService gestuurd. We loggen deze zoekopdrachten niet.
					</li>
					<li>
						<strong>Routeberekeningen:</strong> Start- en eindpunt worden via onze proxy naar
						OpenRouteService gestuurd voor routeberekening. We loggen deze gegevens niet.
					</li>
				</ul>
			</section>

			<section>
				<h2 class="mb-2 text-lg font-semibold text-white">Tracking en cookies</h2>
				<p>
					Fuel Finder NL gebruikt <strong>geen</strong> tracking cookies, analytics, of advertenties.
					We plaatsen geen cookies op je apparaat. Er worden geen persoonsgegevens verzameld of gedeeld
					met derden.
				</p>
			</section>

			<section>
				<h2 class="mb-2 text-lg font-semibold text-white">Databronnen</h2>
				<ul class="list-inside list-disc space-y-1">
					<li><strong>Brandstofprijzen:</strong> ANWB (publieke API)</li>
					<li><strong>Laadpalen:</strong> OpenChargeMap (open data)</li>
					<li><strong>Voorzieningen:</strong> OpenStreetMap via Overpass API (open data)</li>
					<li><strong>Kaart:</strong> OpenFreeMap met OpenStreetMap data</li>
					<li><strong>Routering:</strong> OpenRouteService</li>
				</ul>
			</section>

			<section>
				<h2 class="mb-2 text-lg font-semibold text-white">Lokale opslag</h2>
				<p>
					De app slaat tijdelijk gegevens op in je browser (sessionStorage) voor routecaching
					en in de service worker cache voor offline gebruik. Je kunt deze wissen door je
					browsergegevens te verwijderen.
				</p>
			</section>

			<section>
				<h2 class="mb-2 text-lg font-semibold text-white">Contact</h2>
				<p>
					Deze app is een open-source project. Vragen of opmerkingen? Neem contact op via
					<a
						href="https://github.com/mauritsajournal/fuel-finder-nl"
						target="_blank"
						rel="noopener"
						class="text-blue-400 hover:text-blue-300 underline"
					>
						GitHub
					</a>.
				</p>
			</section>
		</div>
	</div>
</div>
